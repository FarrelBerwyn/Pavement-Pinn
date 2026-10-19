"""mc_life.py - Monte Carlo Indeks Umur Struktural (Module D2/D3), deterministic per segment.
predict(F) -> Y must return [N,2] = log(eps*E3/q) for (et, ev); use the OpenVINO compiled model in production:
    core = ov.Core(); cm = core.compile_model("models/pi_surrogate_fp16.xml", "AUTO")
    predict = lambda F: cm(F.astype(np.float32))[0]
"""
import hashlib, math
import numpy as np
from pavement_core import allowable_reps

STD_AXLE_T, Q_MPA, TYRES, DUAL_MM = 8.16, 0.55, 4, 330.0
A_MM = math.sqrt(STD_AXLE_T * 9.80665e3 / TYRES / (math.pi * Q_MPA))   # 107.6 mm

def seed_for(segment_id, version="v3"):
    return int(hashlib.sha256(f"{segment_id}:{version}".encode()).hexdigest()[:8], 16)

def sample_inputs(seg, n, rng, wet=False):
    h1 = np.clip(rng.normal(seg["h1_mm"], seg.get("h1_sd", 10.0), n), 30, None)
    h2 = np.clip(rng.normal(seg["h2_mm"], seg.get("h2_sd", 20.0), n), 50, None)
    E1 = seg["E1_mpa"] * np.exp(rng.normal(0, 0.25, n))
    E2 = seg["E2_mpa"] * np.exp(rng.normal(0, 0.30, n))
    cbr = seg["cbr"] * np.exp(rng.normal(0, 0.35, n)) * (seg.get("soaked_factor", 0.5) if wet else 1.0)
    E3 = seg.get("k_cbr", 10.0) * cbr
    esal = rng.triangular(seg["esal_yr_p10"], seg["esal_yr_p50"], seg["esal_yr_p90"], n)
    return h1, h2, E1, E2, E3, esal

def life_mc(seg, predict, n=2000, wet=False, criterion="AI", growth=0.04, damage_used=0.0):
    rng = np.random.default_rng(seed_for(seg["id"]) + (1 if wet else 0))
    h1, h2, E1, E2, E3, esal = sample_inputs(seg, n, rng, wet)
    F = np.stack([np.log(h1 / A_MM), np.log(h2 / A_MM), np.log(E1 / E3), np.log(E2 / E3)], 1)
    Y = np.asarray(predict(F))
    et = np.exp(Y[:, 0]) * Q_MPA / E3 * 1e6
    ev = np.exp(Y[:, 1]) * Q_MPA / E3 * 1e6
    Nf, Nd = allowable_reps(et, ev, E1, criterion)
    N = np.minimum(Nf, Nd) * (1 - damage_used)
    L = np.log1p(N * growth / esal) / math.log1p(growth)
    rho = {}
    for name, v in dict(h1=h1, h2=h2, E1=E1, E2=E2, subgrade=E3, traffic=esal).items():
        rv, rl = np.argsort(np.argsort(v)), np.argsort(np.argsort(L))
        rho[name] = float(np.corrcoef(rv, rl)[0, 1])        # Spearman rank correlation (tornado)
    p10, p50, p90 = np.percentile(L, [10, 50, 90])
    return dict(life_years=dict(p10=float(p10), p50=float(p50), p90=float(p90)),
                et_p50=float(np.median(et)), ev_p50=float(np.median(ev)),
                governing="fatigue" if np.median(Nf) < np.median(Nd) else "rutting",
                sensitivity=rho, n=n, criterion=criterion, wet=wet, status="COMPUTED (indikatif)")
