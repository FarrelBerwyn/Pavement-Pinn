# Model card — pi-surrogate-v1

Physics-informed neural surrogate of the layered-elastic (MLET) solver PyMastic. **Not** a PINN that
solves the PDE from collocation residuals (Dokumen Induk v3 D-02). Used only for the Monte Carlo life
index; the strains shown for the entered structure always come from PyMastic itself.

| Item | Value |
|---|---|
| Inputs | ln(h1/a), ln(h2/a), ln(E1/E3), ln(E2/E3), ln(d/a); a = contact radius |
| Outputs | ln(ε·E3/q) for εt (bottom of asphalt) and εv (top of subgrade) |
| Physics | elastic similarity and linearity in q exact by construction; strains always positive; monotonicity loss on the directions PyMastic obeys in 100 % of 300 perturbation checks (εv vs h1, h2, E1/E3, d/a; εt vs E2/E3) |
| Training data | 19,894 PyMastic solutions (Latin hypercube, seed 42): axle 6–25 t, q 0.5–0.8 MPa, h1 50–250 mm, h2 100–400 mm, E1 1,000–5,000 MPa, E2 100–500 MPa, CBR 1–15 (E3 = 10·CBR, ASSUMED), dual spacing 250–400 mm, ν 0.35/0.35/0.45. 70 s on 12 threads, i5-12450H |
| Network | MLP 5→64→64→64→2, tanh; Adam 6,000 steps; λ_mono 0.1; 44 s on CPU (PyTorch 2.14 CPU; no Intel XPU on this laptop) |
| Serving | OpenVINO 2026.4, FP32 IR on CPU |

## Measured (models/pi-surrogate-v1_metrics.json, 2026-10-16)

| Test | εt MAPE / p95 | εv MAPE / p95 |
|---|---|---|
| Random 20 % hold-out (OpenVINO FP32) | 1.16 % / 3.27 % | 0.59 % / 1.73 % |
| Out of distribution (train CBR ≥ 4, h1 ≤ 180; test CBR < 3 or h1 > 200) | 7.0 % / 27.7 % | 6.2 % / 28.3 % |

- Monotonicity violations at 20,000 collocation points: 2.8 % with the loss vs 10.3 % without.
- Ablation, plain MLP on raw inputs: similar in-distribution accuracy (εt 1.28 %, εv 0.73 % MAPE) but
  breaks elastic similarity by up to 1,081 %; the PI-surrogate's error there is 0 by construction.
- Random forest baseline (scikit-learn): εt 12.2 %, εv 9.5 % MAPE. Intel Extension for Scikit-learn
  gave no speed-up for this fit (1.54 s vs 1.49 s stock).
- Precision vs the PyTorch model: FP16 IR max deviation 3.5 %, INT8 (NNCF PTQ) 10.9 %. INT8 is
  **not** served: strain errors are amplified by the steep fatigue/rutting laws (exponents 3.3–7).

## Limits

- Where εt < 50 µε (thin, soft asphalt; 0.7 % of samples) the relative εt error can exceed 100 %.
  Fatigue life there is far above the rutting life, so the run-time cross-check compares εt only when
  PyMastic gives εt ≥ 50 µε; εv is always compared.
- Out of the training box the error grows (OOD p95 ≈ 28 %). At run time, more than 5 % of samples
  outside the box → Monte Carlo refused; fewer → those samples are solved by PyMastic. A random
  1-in-50 subset is re-solved by PyMastic and the result is withheld if any differs by more than 10 %.
- The life index (Asphalt Institute or Austroads form) is indicative, for comparing segments and
  options, not for predicting failure dates. The two criteria differ by orders of magnitude for rutting.

Rebuild: `inference/training/gen_mlet_dataset.py`, then `train_pi_surrogate.py` (stop the inference
service first: Windows locks the served `.bin`).
