# Appendix D — Mathematical Verification Register

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15.

**What was and was not run.** Python is not available on this machine: `python`/`python3` resolve to the Microsoft Store stub, and the only real interpreter (`C:\Users\MSI\.local\bin\python3.11.exe`) is refused by Windows Application Control ("An Application Control policy has blocked this file", os error 4551). PyMastic, NumPy, SciPy, OpenCV, PyTorch and OpenVINO therefore could not run, and **no file of the reference ZIP was executed**. Instead, every claim that could be checked without Python was checked with two kinds of independent evidence:

- the multilayer linear-elastic reference solver written for the 2026-10-14 audit (`docs/audit/forensic-2026-10-14/evidence/mlet.mjs`; Love strain function + Hankel transform; verified against Boussinesq to a relative error of about 2·10⁻¹², see that audit's Appendix B). It evaluates the load axis only (r = 0), so it can reproduce isolated-tyre cases but not dual-tyre superposition;
- line-by-line JavaScript ports of the pure-math functions in `pavement_core.py` (knapsack, greedy, priority score, ESAL, number checker), in `evidence/v3check2.mjs`.

Commands, Node version and raw outputs are in `evidence/evidence-run.log`. Labels: [REPRODUCED] independently reproduced here; [CONSISTENT] agrees with theory or with a hand calculation but the exact figure was not recomputed; [BLOCKED] needs Python/PyMastic/hardware; [FAILED] independent evidence contradicts the claim; [INVESTIGATE] needs a source the team must supply.

## D.1 Governing relations

```math EQ-1 | Contact radius of one tyre (V3 SPECIFICATION §4.4; REFERENCE ZIP pavement_core.py:22-23).
a = \sqrt{\frac{P_{axle} \, g / n_{tyres}}{\pi q}}
```

```math EQ-2 | Elastic similarity: scaling every modulus by k scales every strain by 1/k (V3 SPECIFICATION §4.4 D2).
\varepsilon(k E_1, k E_2, k E_3) = \frac{1}{k} \varepsilon(E_1, E_2, E_3)
```

```math EQ-3 | Asphalt Institute criteria as coded (REFERENCE ZIP pavement_core.py:48-51; Huang 2004). E in psi, strain in in/in.
N_f = 0.0796 \, \varepsilon_t^{-3.291} E_1^{-0.854}, \quad N_d = 1.365 \times 10^{-9} \, \varepsilon_v^{-4.477}
```

```math EQ-4 | Austroads (2004 form) as coded (REFERENCE ZIP pavement_core.py:52-55). Strain in microstrain, E in MPa; SF/RF omitted in code.
N_f = \left(\frac{6918 (0.856 V_b + 1.08)}{E_1^{0.36} \mu\varepsilon_t}\right)^{5}, \quad N_d = \left(\frac{9300}{\mu\varepsilon_v}\right)^{7}
```

```math EQ-5 | Indicative structural life index with geometric traffic growth g (Miner's rule; V3 SPECIFICATION §4.4 D3).
L = \frac{\ln\left(1 + N g / E_{yr}\right)}{\ln(1 + g)}, \quad N = \min(N_f, N_d) (1 - D_{used})
```

```math EQ-6 | PI-surrogate features and targets (REFERENCE ZIP train_pi_surrogate.py:11-18).
x = \left[\ln\frac{h_1}{a}, \ln\frac{h_2}{a}, \ln\frac{E_1}{E_3}, \ln\frac{E_2}{E_3}\right], \quad y = \left[\ln\frac{\varepsilon_t E_3}{q}, \ln\frac{\varepsilon_v E_3}{q}\right]
```

```math EQ-7 | Transparent priority score (V3 SPECIFICATION §4.6; REFERENCE ZIP pavement_core.py:84-94).
S = 100 (w_H H + w_S S_{str} + w_C C + w_Q Q), \quad C = 1 - e^{-n/2}, \quad S_{str} = \min\left(1, \max\left(0, 1 - \frac{L_{50}}{10}\right)\right)
```

<!-- landscape-start -->

## D.2 Register


Table D.1 — Mathematical and numerical verification register

| ID | Item | Source claim | Independent evidence (this baseline) | Result | Status | Open issue / next action |
|---|---|---|---|---|---|---|
| M-01 | MLET reference case: AC 100 mm/2500 MPa, base 150 mm/200 MPa, subgrade 60 MPa (CBR 6 × 10), ν 0.35/0.35/0.45, 10 t axle, 4 isolated tyres, q 0.55 MPa | v3 §4.4: PyMastic εt 303 µε, εv 793 µε; AGENTS: ±1 % | Audit solver: εt 303.12 µε, εv 792.67 µε, a = 119.12 mm (`v3check.mjs`) | Deviation 0.04 % / 0.04 % | [REPRODUCED] (independent solver); PyMastic run itself [BLOCKED] | Team must run `test_core.py` with PyMastic (R1-02) and keep the 303/793 case as a CI test (R1-04) |
| M-02 | Same structure, 8.16 t, 4 isolated tyres | v3 §4.4: 274 / 663 µε | 273.74 / 662.99 µε (`v3check2.mjs`) | < 0.1 % | [REPRODUCED] | Use as second CI fixture |
| M-03 | Elastic similarity (all E × 3 → strains ÷ 3) | v3 §4.4, test_core.py:10-12 | Ratio εt 3.0000, εv 3.0000 | Exact | [REPRODUCED] | Keep as property test for MLET and surrogate |
| M-04 | Dual tyres 8.16 t, spacing 330 mm, superposition at x = 0, d/2, d | v3 §4.4: 227 / 876 µε | Audit solver is axis-only; off-axis superposition not available | Direction consistent with theory (dual lowers εt at the asphalt bottom, raises εv at depth) | [BLOCKED] | Reproduce with PyMastic; add an off-axis capability to an independent checker if a second opinion is wanted |
| M-05 | Units: q in kPa when E in MPa (PyMastic multiplies E by 1000) | AGENTS §4, pavement_core.py:28-29 | Not checkable without PyMastic source; consistent with M-01 agreement (a factor-1000 error would shift strains 1000×) | Indirectly consistent | [CONSISTENT] | Unit test: q = 550 kPa with E in MPa reproduces M-01 |
| M-06 | Sign convention: εt = −Strain_R (compression positive in PyMastic) | pavement_core.py:18,33 | Audit solver uses tension-positive εr; εt = +303 µε at the asphalt bottom | Consistent | [CONSISTENT] | Assert εt > 0 and εv > 0 (already in code, l.37) |
| M-07 | Sampling depths: z = h1 − 0.01 mm (asphalt side), z = h1 + h2 + 0.01 mm (subgrade side) | pavement_core.py:25-26 | Audit used ±0.001 mm with the layer index chosen explicitly; same values | Consistent | [CONSISTENT] | — |
| M-08 | `iteration=20` (40 gives NaN on about 45 % of thick structures; 98.9 % valid at 20) | v3 §4.4 | No PyMastic | — | [BLOCKED] | Record the failure rate and the failed domain in the dataset card (F-44) |
| M-09 | Asphalt Institute fatigue and rutting constants | v3 §4.4 EQ, Huang 2004 [23] | EQ-3 coded exactly as the published form (0.0796, −3.291, −0.854; 1.365·10⁻⁹, −4.477); MPa→psi factor 145.0377 correct | Matches | [CONSISTENT] | Cite edition/page in the UI and DECISION_LOG (D-05) |
| M-10 | Austroads constants | v3 §4.4 "verify against the Austroads/MDP 2017 edition" | Code uses the 2004 subgrade form (9300/µε)^7 and the Shell-type fatigue form without the SF/RF factor that the v3 equation shows | Spec–code mismatch on SF; edition unverified | [INVESTIGATE] | Team must pick and cite the edition (later editions changed the constants); add SF/RF or document its omission (F-49) |
| M-11 | Criteria disagree by about 200× on $N_d$ | v3 §4.4: $N_d$(AI) ≈ 6.7·10⁴ vs $N_d$(AUS) ≈ 1.5·10⁷ (dual 8.16 t) | From v3's dual strains: 6.66·10⁴ vs 1.52·10⁷ (228×); isolated 10 t case: 1.04·10⁵ vs 3.06·10⁷ (294×) | Order of magnitude confirmed | [REPRODUCED] (arithmetic) | Criterion must be chosen, cited and shown (D-05) — human decision HD-04 |
| M-12 | $N_f$ AI vs AUS at the reference case | — | 5.40·10⁵ vs 6.04·10⁵ (1.12×) | Close | [REPRODUCED] (arithmetic) | — |
| M-13 | Life index closed form (EQ-5) | v3 §4.4 D3 | N = 5·10⁶, E = 4·10⁵/yr, g = 4 %: closed form 10.34 yr; explicit year-by-year sum fills 10 whole years | Correct | [REPRODUCED] | `mc_life.py:35` divides by ln(1+g) without the g = 0 branch that `pavement_core.life_index_years` has (F-36) |
| M-14 | Wet subgrade (CBR 6 → 3) cuts rutting life about 4–5× | v3 §2.4, §4.4 Fig. 4.3 | Isolated 8.16 t: εv 663 → 903 µε, $N_d$(AI) ratio 3.98 | Lower end of the claimed range | [CONSISTENT] | Depends on the ASSUMED E3 = 10·CBR and on the soaked factor 0.5 — label both |
| M-15 | "Elastic similarity and load scaling hold exactly by construction" for the surrogate | v3 §4.4 D2 point 1 | Dataset varies P (6–25 t) and q (0.5–0.8 MPa), so a ranges 76.5–197.5 mm, while the dual spacing stays 330 mm. d/a therefore ranges 1.67–4.31 and is **not** among the four features (EQ-6) | Similarity in E holds; the dual-tyre geometry is not captured, so the target is not a function of the inputs | [FAILED] (design defect, analytical) | Add ln(d/a) as a fifth feature or fix P and q to the standard axle used by `mc_life.py` (F-32) |
| M-16 | Monotonicity sign table `SIGNS` | train_pi_surrogate.py:33-36; v3 §4.4 lists candidates and B.9 says enable only signs that hold on 100 % of rows | 54 structures (h1 50–200 mm, E1 1–5 GPa, E2 100–300 MPa, E3 20–150 MPa), +10 % perturbation, isolated tyre, axis: εt vs E1/E3 decreases in 50/54 (**4 violations**); εt vs E2/E3 decreases 54/54; εv vs h1, h2, E1/E3 decrease 54/54; εv vs E2/E3 decreases 41/54 (**13 violations**) | 2 of 6 non-zero entries fail; one of them (εt vs E1/E3) is not even in the v3 candidate list | [FAILED] for 2 entries | Run B.9 with PyMastic on the dual configuration before any penalty is enabled; drop failing entries (F-33) |
| M-17 | ESAL from counts × VDF; MDP-style growth factor R | v3 §4.5 example: 1 360 normal, 2 930 actual, ratio 2.15 | Port: 1 360 / 2 930 / 2.154 | Matches | [REPRODUCED] | VDF values are illustrative, not from MDP 2017 — replace before use (Module E) |
| M-18 | Priority score example: pothole High, AADT_norm 0.8, motorcycles 70 %, unlit, L50 1.5 yr, 3 confirmations | v3 §4.6: 83.3 (50.0 + 25.5 + 7.8) | Port: 83.3 (50.0 + 25.5 + 7.8 + 0); H before clipping = 1.022 | Matches | [REPRODUCED] | Note: for High potholes the "unlit" multiplier saturates at H = 1; document as a policy property |
| M-19 | Knapsack DP ≥ greedy, never over budget | v3 §4.6; test_core.py:29-37 (100 cases) | Port of the same algorithm on 1 000 independent random cases: DP ≥ greedy 1 000/1 000; strictly better 607; over budget 0; back-tracked set value equals DP optimum 1 000/1 000 | Property holds | [REPRODUCED] (port; not the Python test itself) | Memory grows as items × budget/unit (500 items × Rp 500 bn / Rp 1 m = 2.5·10⁸ cells): choose `unit` relative to budget (F-45) |
| M-20 | Number checker accepts the good text, rejects the bad one | test_core.py:38-42 | Port: good → ok; bad → rejected (950, 5, "aman") | Matches | [REPRODUCED] | Edge cases: a criterion name with a year ("Austroads 2004") is rejected; English "0.4" parses as 0 and is rejected; any fact value is accepted in any slot (εt value where εv belongs passes) (F-37) |
| M-21 | Monte Carlo: deterministic seed sha256(segment:version); P10 ≤ P50 ≤ P90; Spearman sensitivity | mc_life.py | Code reading: seed deterministic for a given NumPy; percentile ordering holds by construction; wet scenario uses seed + 1, so dry/wet differ by sampling noise as well as physics; `version` is the literal "v3", not the surrogate version | Not executed | [BLOCKED] (execution); design issues found | Common random numbers for dry/wet; seed includes surrogate version; handle g = 0 (F-36) |
| M-22 | Surrogate accuracy (t MAPE 1.6 %, v 0.9 %, OOD 4.8/5.4 %, 100 000 evaluations in 0.15 s) | v3 §4.4 Gambar 4.2, marked CONTOH DOKUMEN | None: no dataset, no model | — | [BLOCKED] | Status TARGET until the team reproduces it; must not be quoted as a team result (D-11) |
| M-23 | PyMastic ~13 ms per case on Xeon | v3 §4.4 | None | — | [BLOCKED] | Only from `measurements/*.json` (R5-01) |
| M-24 | Identity of the current structural engine | audit F-01 | `pinnEngine.ts` unchanged: closed-form power laws, literal coefficients, 10 t reference axle, `Math.random` telemetry | Heuristic formula; not a solver, not a trained or untrained network | [REPRODUCED] (static) | Replace by MLET + PI-surrogate (D-02, D-04) |
| M-25 | Trust Gate thresholds (Laplacian variance 60 at 640 px, brightness 40–220, GPS 30 m, pHash Hamming ≤ 8) | trust_gate.py; v3 §4.1 "kalibrasi!" | Thresholds are uncalibrated initial values; out-of-corridor returns REJECT whereas v3 §4.1 expects REFERRED inside another agency's area | Not executed | [INVESTIGATE] | ROC on 100 sharp vs 100 blurred photos; REFERRED path (F-43) |

<!-- landscape-end -->

## D.3 Identity of the structural engine (D-02)

Table D.2 — What each candidate engine actually is

| Engine | Where | Class | Trained? | Evidence |
|---|---|---|---|---|
| `runPinnSimulation` | `src/engines/pinn/core/pinnEngine.ts` | Heuristic closed-form formula | No weights exist | Audit F-01, EQ-4/EQ-5 of AUDIT-001; unchanged |
| `mlet_strains` | REFERENCE ZIP `pavement_core.py` | Analytical/numerical physics solver (wrapper around PyMastic) | Not applicable | Agrees with an independent solver on two cases (M-01, M-02) |
| `PISurrogate` | REFERENCE ZIP `train_pi_surrogate.py` | Physics-informed neural surrogate (planned) | Never trained or executed | No dataset, weights, metrics or export exist; feature set incomplete (M-15) |
| `life_mc` | REFERENCE ZIP `mc_life.py` | Monte Carlo wrapper over a predictor | Not applicable | Not executed (M-21) |

Conclusion: the project currently has **no** trained surrogate and **no** running MLET solver. The only physics that has been numerically verified is the reference-case agreement between PyMastic (as reported by the v3 authors) and the audit's own solver. Calling anything in the current build a "PINN" or "PI-surrogate" remains a prohibited claim until R2 exit criteria are met.

## D.4 Unresolved scientific questions (need a human decision or field data)

1. Which transfer-function edition governs (Asphalt Institute 1982 via Huang, Austroads 2004, or the edition adopted by MDP 2017)? The choice changes $N_d$ by about 200× (M-10, M-11). Decision HD-04.
2. Is E3 = 10 × CBR acceptable as the default correlation, and which soaked factor applies to the Narogong subgrade? Both are ASSUMED today (M-14).
3. Should the surrogate cover variable axle loads at all? `mc_life.py` only evaluates the 8.16 t standard axle; restricting the dataset to that axle and q = 0.55 MPa would remove the d/a defect (M-15) and shrink the domain.
4. No FWD, deflection or field data exist, so every structural number is verified numerically, not validated physically. This must stay visible in the UI ("indikatif, bukan desain").
