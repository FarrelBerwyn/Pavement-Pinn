"""gen_mlet_dataset.py - build the PI-surrogate training set from PyMastic (runs on Intel CPU, all cores).
Usage: python gen_mlet_dataset.py --n 20000 --out data/mlet_dual.npz --pymastic ../PyMastic
"""
import argparse, time, os, platform, warnings
import numpy as np
from multiprocessing import Pool
from scipy.stats import qmc
from pavement_core import mlet_strains
warnings.filterwarnings("ignore")

RANGES = dict(P=(6, 25), q=(0.5, 0.8), h1=(50, 250), h2=(100, 400), E1=(1000, 5000), E2=(100, 500), CBR=(2, 15))
K_CBR = 10.0          # E3 = K_CBR * CBR (MPa) -- ASSUMED correlation, editable, shown in model card
DUAL_MM = 330.0
ARGS = None

def sample(n, seed):
    u = qmc.LatinHypercube(d=7, seed=seed).random(n)
    lo = np.array([v[0] for v in RANGES.values()]); hi = np.array([v[1] for v in RANGES.values()])
    x = lo + u * (hi - lo)
    for j in (2, 4, 6):                       # log-uniform for h1, E1, CBR
        x[:, j] = np.exp(np.log(lo[j]) + u[:, j] * (np.log(hi[j]) - np.log(lo[j])))
    return x

def solve(row):
    P, q, h1, h2, E1, E2, CBR = row
    try:
        r = mlet_strains(P, [h1, h2], [E1, E2, K_CBR * CBR], [0.35, 0.35, 0.45], q_mpa=q,
                         dual_spacing_mm=DUAL_MM, pymastic_path=ARGS.pymastic)
        return r["a_mm"], r["et"], r["ev"]
    except Exception:
        return np.nan, np.nan, np.nan

def init(a):
    global ARGS; ARGS = a

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=20000); ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="data/mlet_dual.npz"); ap.add_argument("--pymastic", required=True)
    a = ap.parse_args(); ARGS = a
    X = sample(a.n, a.seed); t = time.time()
    with Pool(os.cpu_count(), initializer=init, initargs=(a,)) as p:
        out = np.array(p.map(solve, list(X), chunksize=32))
    ok = np.isfinite(out).all(1)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    np.savez(a.out, X=X[ok], out=out[ok], ranges=str(RANGES), k_cbr=K_CBR, dual_mm=DUAL_MM,
             cpu=platform.processor() or platform.machine())
    print(f"valid {ok.sum()}/{len(X)} in {time.time()-t:.0f}s on {os.cpu_count()} cores -> {a.out}")
