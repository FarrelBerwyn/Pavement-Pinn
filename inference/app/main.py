"""PAVEMENT-PINN inference service (Dokumen Induk v3 D-23, milestone M1).

Run from the inference/ folder:  .venv/Scripts/python -m uvicorn app.main:app --port 8100
Express reaches it through INFERENCE_URL (default http://127.0.0.1:8100).

M1 scope: /v1/health and /v1/assess with the MLET reference solver. The PI-surrogate,
Monte Carlo and OpenVINO models arrive in M2; until then the response says so.
"""
from __future__ import annotations

import platform
import sys
import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .mlet import METHOD, STANDARD_AXLE_TON, allowable_reps, life_index_years, mlet_strains

ENGINE_VERSION = "mlet-1.0.0"

app = FastAPI(title="PAVEMENT-PINN inference", version=ENGINE_VERSION)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Layer(Strict):
    h_mm: float = Field(ge=20, le=600)
    E_mpa: float = Field(ge=50, le=30000)
    nu: float = Field(ge=0.15, le=0.5)
    source: str = "ASSUMED"


class Subgrade(Strict):
    cbr: float = Field(ge=1, le=50)
    state: Literal["dry", "wet"] = "dry"
    soaked_factor: float = Field(default=0.5, gt=0, le=1)
    nu: float = Field(default=0.45, ge=0.15, le=0.5)
    E_mpa: float | None = Field(default=None, ge=10, le=500)


class Load(Strict):
    axle_t: float = Field(default=STANDARD_AXLE_TON, ge=1, le=30)
    q_mpa: float = Field(default=0.55, ge=0.3, le=1.5)
    tyres_per_axle: Literal[2, 4] = 4
    dual_spacing_mm: float | None = Field(default=330, ge=150, le=600)


class Traffic(Strict):
    esal_day_p10: float = Field(gt=0, le=1e6)
    esal_day_p50: float = Field(gt=0, le=1e6)
    esal_day_p90: float = Field(gt=0, le=1e6)
    growth: float = Field(default=0.04, ge=0, le=0.15)
    direction_factor: float = Field(default=0.5, gt=0, le=1)
    lane_factor: float = Field(default=1.0, gt=0, le=1)

    @model_validator(mode="after")
    def ordered(self):
        if not (self.esal_day_p10 <= self.esal_day_p50 <= self.esal_day_p90):
            raise ValueError("esal_day must satisfy p10 <= p50 <= p90")
        return self


class AssessRequest(Strict):
    segment_id: str = Field(min_length=1, max_length=64)
    layers: list[Layer] = Field(min_length=1, max_length=3)
    subgrade: Subgrade
    load: Load = Load()
    traffic: Traffic | None = None
    criterion: Literal["AI", "AUS"] = "AI"
    damage_used: float = Field(default=0.0, ge=0, lt=1)
    n_mc: int = Field(default=0, ge=0, le=20000)
    seed: int | None = None

    @model_validator(mode="after")
    def asphalt_thickness(self):
        if not 25 <= self.layers[0].h_mm <= 400:
            raise ValueError("asphalt layer h_mm must be between 25 and 400")
        return self


def device_info() -> dict:
    return {"kind": "CPU", "processor": platform.processor() or platform.machine(), "platform": platform.platform()}


@app.get("/v1/health")
def health() -> dict:
    return {
        "status": "ok",
        "engine_version": ENGINE_VERSION,
        "python": sys.version.split()[0],
        "mlet_method": METHOD,
        "openvino_version": None,
        "available_devices": [],
        "models_loaded": [],
        "device": device_info(),
    }


@app.post("/v1/assess")
def assess(req: AssessRequest) -> dict:
    assumptions: list[str] = []
    sg = req.subgrade
    cbr = sg.cbr * sg.soaked_factor if sg.state == "wet" else sg.cbr
    if sg.state == "wet":
        assumptions.append(f"Wet subgrade: CBR x {sg.soaked_factor} (soaked factor ASSUMED unless a soaked CBR test is entered).")
    if sg.E_mpa is not None:
        e_sub = sg.E_mpa
    else:
        e_sub = 10.0 * cbr
        assumptions.append("Subgrade modulus E = 10 x CBR MPa (Heukelom & Klomp), ASSUMED.")
    assumptions += [f"Layer {i + 1} ({layer.h_mm:g} mm) source: {layer.source}" for i, layer in enumerate(req.layers) if layer.source == "ASSUMED"]

    started = time.perf_counter()
    try:
        strains = mlet_strains(req.load.axle_t, [l.h_mm for l in req.layers], [l.E_mpa for l in req.layers] + [e_sub],
                               [l.nu for l in req.layers] + [sg.nu], q_mpa=req.load.q_mpa,
                               tyres_per_axle=req.load.tyres_per_axle, dual_spacing_mm=req.load.dual_spacing_mm)
    except (ArithmeticError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"MLET could not solve this structure: {exc}") from exc
    mlet_ms = (time.perf_counter() - started) * 1000

    nf, nd = allowable_reps(strains["et_ue"], strains["ev_ue"], req.layers[0].E_mpa, req.criterion)
    n_allow = min(nf, nd)
    life = None
    if req.traffic is not None:
        t = req.traffic
        per_year = lambda esal_day: esal_day * 365 * t.direction_factor * t.lane_factor
        # Heavier traffic gives a shorter life: P10 of life comes from P90 of traffic.
        life = {
            "p10": life_index_years(n_allow, per_year(t.esal_day_p90), t.growth, req.damage_used),
            "p50": life_index_years(n_allow, per_year(t.esal_day_p50), t.growth, req.damage_used),
            "p90": life_index_years(n_allow, per_year(t.esal_day_p10), t.growth, req.damage_used),
            "uncertainty": "TRAFFIC_ONLY",
            "label": "indikatif, bukan desain",
        }
        if req.damage_used == 0:
            assumptions.append("Damage already used = 0 (construction year unknown), ASSUMED.")
    if req.n_mc:
        assumptions.append("Monte Carlo over materials is not available yet (milestone M2); n_mc was ignored.")

    return {
        "segment_id": req.segment_id,
        "mlet": {**strains, "method": METHOD, "elapsed_ms": round(mlet_ms, 2)},
        "subgrade_E_mpa": e_sub,
        "allowable": {"criterion": req.criterion, "nf": nf, "nd": nd, "governing": "fatigue" if nf <= nd else "rutting"},
        "life_years": life,
        "damage_used": req.damage_used,
        "surrogate": None,
        "assumptions": assumptions,
        "status_label": "COMPUTED",
        "engine_version": ENGINE_VERSION,
        "device": device_info(),
    }
