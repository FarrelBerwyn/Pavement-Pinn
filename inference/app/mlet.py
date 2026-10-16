"""Module D1/D3 of Dokumen Induk v3: layered-elastic strains (MLET via PyMastic),
transfer functions and the indicative structural life index.

Ported from docs/v3/_build/reference_code/pavement_core.py. Units: lengths mm,
moduli MPa, pressure MPa, axle loads tonnes, strains microstrain.
"""
from __future__ import annotations

import math

import numpy as np

from vendor.pymastic import PYMASTIC_COMMIT, PyMastic

STANDARD_AXLE_TON = 8.16  # 80 kN standard axle; same constant as src/domain/intelligence/esal.ts
PYMASTIC_ITERATION = 20  # 40 returns NaN for thick structures (v3 Lampiran B)
METHOD = f"PyMastic@{PYMASTIC_COMMIT[:7]}"


def mlet_strains(axle_t: float, h_mm: list[float], E_mpa: list[float], nu: list[float],
                 q_mpa: float = 0.55, tyres_per_axle: int = 4,
                 dual_spacing_mm: float | None = None) -> dict:
    """Critical strains for one axle: et = horizontal tensile strain at the bottom of the
    asphalt layer, ev = vertical compressive strain at the top of the subgrade (both positive).
    With dual_spacing_mm, strains are superposed at x = 0, d/2, d and the maximum is taken."""
    if not (len(E_mpa) == len(nu) == len(h_mm) + 1):
        raise ValueError("E and nu need one entry per layer including the subgrade")
    if axle_t <= 0 or min(h_mm) <= 0 or min(E_mpa) <= 0:
        raise ValueError("load, thickness and moduli must be positive")
    wheel_n = axle_t * 9.80665e3 / tyres_per_axle
    a = math.sqrt(wheel_n / (math.pi * q_mpa))  # contact radius, mm
    s = a  # lengths are normalised by a for numerical stability
    z_t = (h_mm[0] - 0.01) / s
    z_v = (sum(h_mm) + 0.01) / s
    xs = [0.0] if dual_spacing_mm is None else [0.0, dual_spacing_mm / (2 * s), dual_spacing_mm / s]
    # PyMastic multiplies E by 1000 internally, so q goes in kPa when E is in MPa.
    rs = PyMastic(q_mpa * 1000.0, 1.0, xs, [z_t, z_v], [h / s for h in h_mm], list(E_mpa), list(nu),
                  7e-7, isBounded=[1] * len(h_mm), iteration=PYMASTIC_ITERATION, inverser="solve")
    er, ez = rs["Strain_R"], rs["Strain_Z"]  # compression positive
    if dual_spacing_mm is None:
        et, ev = -er[0, 0], ez[1, 0]
    else:
        et = max(-(er[0, 0] + er[0, 2]), -2 * er[0, 1])
        ev = max(ez[1, 0] + ez[1, 2], 2 * ez[1, 1])
    if not (np.isfinite(et) and np.isfinite(ev)) or et <= 0 or ev <= 0:
        raise ArithmeticError("MLET returned a non-finite or non-positive strain")
    return {"et_ue": float(et * 1e6), "ev_ue": float(ev * 1e6), "a_mm": float(a)}


def allowable_reps(et_ue: float, ev_ue: float, e1_mpa: float, criterion: str = "AI",
                   binder_volume_pct: float = 11.0) -> tuple[float, float]:
    """Allowable standard-axle repetitions to fatigue (Nf) and subgrade rutting (Nd).
    AI = Asphalt Institute (1982) as given in Huang, Pavement Analysis and Design.
    AUS = Austroads (2004) form; constants must be checked against the edition cited."""
    if criterion == "AI":
        e_psi = e1_mpa * 145.0377
        nf = 0.0796 * (et_ue * 1e-6) ** -3.291 * e_psi ** -0.854
        nd = 1.365e-9 * (ev_ue * 1e-6) ** -4.477
    elif criterion == "AUS":
        nf = (6918 * (0.856 * binder_volume_pct + 1.08) / (e1_mpa ** 0.36 * et_ue)) ** 5
        nd = (9300.0 / ev_ue) ** 7
    else:
        raise ValueError(criterion)
    return float(nf), float(nd)


def life_index_years(n_allow: float, esal_per_year: float, growth: float, damage_used: float) -> float:
    """Years until cumulative ESAL consumes the remaining allowable repetitions (Miner's rule)
    with geometric traffic growth. Indicative; for comparing segments, not predicting dates."""
    n = n_allow * max(0.0, 1.0 - damage_used)
    if growth == 0:
        return n / esal_per_year
    return math.log(1 + n * growth / esal_per_year) / math.log(1 + growth)
