# Appendix B — Reference Code Assessment (pavement_pinn_v3_code.zip)

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15.

## B.1 Handling of the archive

- **Isolation.** The ZIP (17 199 bytes, sha256 `664c6a7f…2b88`) was listed with `unzip -lv` before extraction: 11 entries, all under `pavement_pinn_v3_code/`, no absolute paths, no `..` components, no symbolic links, no binaries, no model or dataset files. It was extracted into the session's temporary scratch directory, **never into the repository**. Hashes of the archive, the v3 PDF, `AGENTS.md` and of every extracted file are in `evidence/reference-inputs.txt`.
- **No execution.** No reference file was executed. Python is blocked on this machine (F-38). All statements below come from reading the code and from the independent checks in Appendix D.
- **Content vs. PDF.** The ZIP files are the code printed in v3 Appendix B (B.1–B.8). B.9 (sign check) exists only in the PDF as a snippet; the `verify_signs` helper referred to in `train_pi_surrogate.py:32` is not in the ZIP.
- **Dependencies declared** (README only, no pins): Python 3.11+, numpy, scipy, opencv-python, PyMastic (git clone, Apache-2.0); for AI modules torch, openvino, nncf, openvino-genai, optimum[openvino], ultralytics.
- **Unsafe operations found:** none. No network calls, no shell execution, no deletion. File writes are limited to `--out` paths, `models/`, `runs/` and `measurements/`. `np.load(..., allow_pickle=True)` in `train_pi_surrogate.py:65` should be `allow_pickle=False` once the `ranges` string field is stored differently (loading an untrusted `.npz` with pickle enabled can execute code).

<!-- landscape-start -->

## B.2 Inventory and disposition


Table B.1 — Reference implementation inventory

| Reference component | Source file (lines) | Intended module | Reported status (v3/README) | Independently reproduced here? | Compatibility with this repository | Disposition |
|---|---|---|---|---|---|---|
| `mlet_strains` (PyMastic wrapper, dual-tyre superposition) | `pavement_core.py` 8-39 | D1 | DIUJI | Reference strains 303/793 and 274/663 µε and ×3 similarity reproduced with the independent audit solver (M-01–M-03); dual case not reproduced (M-04) | New Python service; nothing equivalent exists (current engine is a heuristic) | [INTEGRATE_REFERENCE] after R1-02 passes; replace `assert` (F-51) |
| `allowable_reps` (AI, AUS) | `pavement_core.py` 42-58 | D3 | DIUJI | AI constants match Huang; AUS omits SF/RF, edition unverified (M-09, M-10) | No transfer function exists in the repo (only text thresholds, F-06) | [ADAPT]: criterion choice and citation first (HD-04, F-49) |
| `life_index_years` | `pavement_core.py` 60-68 | D3 | DIUJI | Closed form verified (M-13) | Replaces RUL/horizon (F-07) | [INTEGRATE_REFERENCE] |
| `esal_per_day`, `design_esal` | `pavement_core.py` 71-77 | E | DIUJI | Example 1 360 / 2 930 reproduced (M-17) | Repo `esal.ts` already has the 8.16 t fourth-power law (keep); this adds counts × VDF | [ADAPT]: port to TypeScript next to `esal.ts` or call from Python; VDF tables from MDP 2017 required |
| `priority_score` | `pavement_core.py` 80-94 | F | DIUJI | Example 83.3 reproduced (M-18) | No risk score exists; queue is bucketed by state | [INTEGRATE_REFERENCE] — better in TypeScript (`src/domain/`) because the operator queue and audit log live there; weights editable + audited |
| `knapsack`, `greedy` | `pavement_core.py` 96-120 | F (K2) | DIUJI | Property DP ≥ greedy reproduced on 1 000 cases (M-19) | Nothing exists | [ADAPT]: unit scaling (F-45); TypeScript or Python both fine |
| `check_brief`, `numbers_in` | `pavement_core.py` 123-139 | G | DIUJI | Good/bad examples reproduced; edge-case defects (M-20, F-37) | Repo uses cloud Gemini with fallback text | [ADAPT]: positional slot check, locale, citation years |
| `test_core.py` | 1-43 | D, E, F, G | "ALL TESTS PASSED" | Not run ([BLOCKED], F-38); its assertions were re-derived independently where possible | Becomes `inference/tests/test_core.py` (pytest) | [INTEGRATE_REFERENCE] as pytest; keep the 303/793 tolerance (do not widen) |
| `trust_gate.py` (blur, brightness, pHash, haversine, decide) | 1-44 | A | DIUJI | Not run; logic read; thresholds uncalibrated; REFERRED path missing (F-43) | Repo has magic-byte, size and 30 m / 7 day duplicate hint (`photoValidation.ts`, `screening.ts`) — keep those | [ADAPT] |
| `gen_mlet_dataset.py` | 1-48 | D2 data | DIUJI (small n) | Not run; LHS ranges match v3 §4.4; silent NaN drop (F-44); d/a not stored as a feature (F-32) | Offline tool, no repo coupling | [ADAPT] |
| `mc_life.py` | 1-44 | D2/D3 | DIUJI | Not run; g = 0 defect, seed design (F-36) | Needs a trained predictor | [ADAPT] |
| `train_pi_surrogate.py` | 1-101 | D2 | BELUM DIUJI | Not run; feature defect (F-32), SIGNS defect (F-33), validation gaps (F-34), no guardrail (F-35), `allow_pickle=True` | Offline tool | [INVESTIGATE] → rewrite by the team (AGENTS §6: scientific core written by team members) |
| `train_yolo.py` | 1-42 | C | BELUM DIUJI | Not run; split-by-location not implemented (F-50); AGPL licence (F-42) | Offline tool; model consumed by `/v1/screen` | [DEFER] until HD-03 (licence) and photos exist |
| `slm_brief.py` | 1-51 | G | BELUM DIUJI (helpers tested) | Not run; checker edge cases (F-37); NPU fallback only in a comment | Replaces `narrativeService.ts` (Gemini) | [ADAPT] after R4 hardware check |
| `bench_tools.py` | 1-37 | Evidence page | BELUM DIUJI | Not run; NPU dynamic-shape risk (F-47); protocol fields match v3 §5.4 except memory and throughput | Feeds `/v1/measurements` | [ADAPT] |
| `README.md` | 1-9 | — | — | Read | — | Fold into `inference/README.md` |

<!-- landscape-end -->

## B.3 What "DIUJI" means and why it is not inherited

v3 Appendix B states that "DIUJI" files were run with tests in a Python 3.13 + PyMastic + NumPy/SciPy/OpenCV environment while the document was prepared. That run is the other team's evidence, not this repository's. Under v3 §1.1 a claim becomes TERBUKTI only when it runs **in the team's repository** with stored evidence. Until R1-02 produces a log on the team's own Intel machine, every row above stays at most "independently cross-checked" (for the rows with a [REPRODUCED] check in Appendix D) and the rest stay "not verified".

## B.4 Integration boundary (proposed)

Table B.2 — Where each adopted piece should live

| Piece | Location | Language | Called by | Contract |
|---|---|---|---|---|
| MLET, transfer functions, life index, Monte Carlo, surrogate guard | `inference/core/` | Python | `/v1/assess`, `/v1/options` | v3 §4.9 JSON, every output with provenance + status label |
| Trust Gate, EXIF strip, blur, YOLO | `inference/core/`, `inference/privacy/` | Python | `/v1/screen` | v3 §4.9 |
| SLM brief + checker | `inference/genai/` | Python | `/v1/brief` | v3 §4.9 |
| Benchmarks | `inference/bench/` | Python | CLI → `measurements/*.json`; `/v1/measurements` | v3 §5.4 |
| Priority score, budget optimiser, ESAL × VDF | `src/domain/intelligence/` (beside `esal.ts`) | TypeScript | Express routes, operator/planner views | Deterministic, isomorphic, audited weight changes |
| Workflow transitions | existing `src/domain/workflow/stateMachine.ts` | TypeScript | unchanged | AI never calls `applyCommand`; Express stores inference results as evidence only |

The Express API stays the only writer of case state (AGENTS rule 4). The Python service is stateless with respect to cases: it computes and returns; Express persists and audits.
