"""pavement_core.py - reference logic for PAVEMENT-PINN v3 (Modules D, E, F, G-checker).
Units: lengths mm, moduli MPa, pressure MPa, loads tonnes (converted to kN), strain in microstrain.
"""
import math, re, sys
import numpy as np

# ---------- Module D1: MLET reference via PyMastic (Apache-2.0) ----------
def mlet_strains(axle_t, h_mm, E_mpa, nu, q_mpa=0.55, tyres_per_axle=4,
                 dual_spacing_mm=None, pymastic_path=None, iteration=20):
    """Critical strains (microstrain) for a single axle.
    h_mm: thicknesses of bound/unbound layers above subgrade, e.g. [100, 150]
    E_mpa, nu: one value per layer incl. subgrade, e.g. [2500, 200, 60]
    Returns dict(et, ev, a_mm). et = horizontal tensile at bottom of layer 1 (asphalt),
    ev = vertical compressive at top of subgrade. Positive values.
    """
    if pymastic_path:
        sys.path.insert(0, pymastic_path)
    from Main.MLE import PyMastic  # PyMastic sign convention: compression positive
    assert len(E_mpa) == len(nu) == len(h_mm) + 1, "E and nu need one entry per layer incl. subgrade"
    if axle_t <= 0 or min(h_mm) <= 0 or min(E_mpa) <= 0:
        raise ValueError("load, thickness and moduli must be positive")
    wheel_N = axle_t * 9.80665e3 / tyres_per_axle
    a = math.sqrt(wheel_N / (math.pi * q_mpa))          # contact radius, mm
    s = a                                               # normalise lengths by a (numerical stability)
    z_t = (h_mm[0] - 0.01) / s                          # just above bottom of asphalt
    z_v = (sum(h_mm) + 0.01) / s                        # just below top of subgrade
    xs = [0.0] if dual_spacing_mm is None else [0.0, dual_spacing_mm / (2 * s), dual_spacing_mm / s]
    # PyMastic multiplies E by 1000 internally -> pass q in kPa when E is in MPa
    RS = PyMastic(q_mpa * 1000.0, 1.0, xs, [z_t, z_v], [h / s for h in h_mm], list(E_mpa), list(nu),
                  7e-7, isBounded=[1] * len(h_mm), iteration=iteration, inverser='solve')
    er, ez = RS['Strain_R'], RS['Strain_Z']
    if dual_spacing_mm is None:
        et, ev = -er[0, 0], ez[1, 0]
    else:  # superposition along the axle line: under tyre A (x=0) and midway (x=d/2)
        et = max(-(er[0, 0] + er[0, 2]), -2 * er[0, 1])
        ev = max(ez[1, 0] + ez[1, 2], 2 * ez[1, 1])
    if not (np.isfinite(et) and np.isfinite(ev)) or et <= 0 or ev <= 0:
        raise RuntimeError("MLET returned invalid result; reduce iteration or check inputs")
    return {"et": et * 1e6, "ev": ev * 1e6, "a_mm": a}

# ---------- Module D3: transfer functions (cite the edition you adopt) ----------
def allowable_reps(et_ue, ev_ue, E1_mpa, criterion="AI"):
    """Allowable standard-axle repetitions to fatigue (Nf) and subgrade rutting (Nd).
    AI  = Asphalt Institute (1982), as given in Huang, Pavement Analysis and Design: E in psi, strain in in/in.
    AUS = Austroads (2004) subgrade criterion form N = (9300/ue)^7; asphalt fatigue needs Vb and mix modulus,
          so it is passed separately. VERIFY constants against the Austroads/MDP 2017 edition you cite.
    """
    if criterion == "AI":
        E_psi = E1_mpa * 145.0377
        Nf = 0.0796 * (et_ue * 1e-6) ** -3.291 * E_psi ** -0.854
        Nd = 1.365e-9 * (ev_ue * 1e-6) ** -4.477
    elif criterion == "AUS":
        Vb = 11.0  # % binder volume, editable
        Nf = (6918 * (0.856 * Vb + 1.08) / (E1_mpa ** 0.36 * et_ue)) ** 5
        Nd = (9300.0 / ev_ue) ** 7
    else:
        raise ValueError(criterion)
    return Nf, Nd

def life_index_years(Nf, Nd, esal_per_year, growth=0.04, damage_used=0.0):
    """Years until cumulative ESAL consumes the remaining allowable repetitions (Miner's rule),
    with geometric traffic growth. Indicative only."""
    N = min(Nf, Nd) * max(0.0, 1.0 - damage_used)
    if esal_per_year <= 0:
        return float("inf")
    if growth == 0:
        return N / esal_per_year
    return math.log(1 + N * growth / esal_per_year) / math.log(1 + growth)

# ---------- Module E: traffic load (MDP 2017 style) ----------
def esal_per_day(counts_per_day, vdf):
    """counts_per_day / vdf: dict vehicle_class -> value (use MDP 2017 VDF tables, 'normal' and 'actual')."""
    return sum(counts_per_day[c] * vdf[c] for c in counts_per_day)

def design_esal(esal_day, DD=0.5, DL=1.0, years=1, growth=0.0):
    R = years if growth == 0 else ((1 + growth) ** years - 1) / growth
    return esal_day * 365 * DD * DL * R

# ---------- Module F: priority score + budget optimisation ----------
SEV_HAZARD = {("pothole", "High"): 1.0, ("pothole", "Medium"): 0.7, ("pothole", "Low"): 0.4,
              ("alligator", "High"): 0.6, ("alligator", "Medium"): 0.4, ("alligator", "Low"): 0.2,
              ("longitudinal", "High"): 0.3, ("transverse", "High"): 0.3}

def priority_score(cls, sev, aadt_norm, moto_share, unlit, life_p50_years, n_confirm,
                   underreported, w=(0.5, 0.3, 0.1, 0.1)):
    """Transparent 0-100 score. Returns (score, breakdown). All inputs documented in section 4.6."""
    base = SEV_HAZARD.get((cls, sev), 0.15)
    exposure = 0.5 + 0.5 * min(1.0, aadt_norm) * (0.6 + 0.4 * moto_share)
    H = min(1.0, base * exposure * (1.2 if unlit else 1.0))
    S = 0.5 if life_p50_years is None else min(1.0, max(0.0, 1 - life_p50_years / 10.0))
    C = 1 - math.exp(-n_confirm / 2.0)
    Q = 1.0 if underreported else 0.0
    parts = dict(bahaya=w[0] * H, struktural=w[1] * S, konfirmasi=w[2] * C, keadilan=w[3] * Q)
    return round(100 * sum(parts.values()), 1), {k: round(100 * v, 1) for k, v in parts.items()}

def knapsack(items, budget, unit=1_000_000):
    """items: list of (id, cost_rp, benefit). Exact 0/1 DP on costs rounded up to `unit`."""
    W = int(budget // unit)
    costs = [max(1, math.ceil(c / unit)) for _, c, _ in items]
    best = np.zeros(W + 1); keep = np.zeros((len(items), W + 1), dtype=bool)
    for i, (_, _, b) in enumerate(items):
        c = costs[i]
        if c > W:
            continue
        cand = best[:W + 1 - c] + b
        better = cand > best[c:]
        keep[i, c:] = better
        best[c:] = np.where(better, cand, best[c:])
    chosen, w_ = [], W
    for i in range(len(items) - 1, -1, -1):
        if keep[i, w_]:
            chosen.append(items[i][0]); w_ -= costs[i]
    return chosen[::-1], float(best[W])

def greedy(items, budget):
    chosen, spent, total = [], 0, 0.0
    for id_, c, b in sorted(items, key=lambda t: t[2] / t[1], reverse=True):
        if spent + c <= budget:
            chosen.append(id_); spent += c; total += b
    return chosen, total

# ---------- Module G: number checker for SLM output ----------
NUM = re.compile(r"(?<![\w.])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(?![\w])")
FORBIDDEN = ["aman", "dijamin", "pasti", "korupsi", "lalai", "nakal", "melanggar hukum"]

def numbers_in(text):
    out = []
    for m in NUM.finditer(text):
        whole = m.group(1).replace(".", "")
        out.append(float(whole + ("." + m.group(2) if m.group(2) else "")))
    return out

def check_brief(text, facts, rel_tol=0.01):
    """Every number in the text must match a number in `facts` (dict of name -> value) within rel_tol."""
    allowed = [float(v) for v in facts.values() if isinstance(v, (int, float))]
    bad = [n for n in numbers_in(text)
           if not any(abs(n - a) <= max(rel_tol * abs(a), 0.051) for a in allowed)]
    words = [w for w in FORBIDDEN if re.search(r"\b" + w + r"\b", text.lower())]
    return {"ok": not bad and not words, "unmatched_numbers": bad, "forbidden_words": words}
