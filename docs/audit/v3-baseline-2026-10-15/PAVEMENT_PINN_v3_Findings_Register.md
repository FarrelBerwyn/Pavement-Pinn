# Appendix E — Consolidated Findings Register

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15.

Finding IDs continue the AUDIT-001 register. F-01 to F-31 keep their original meaning (the v3 document cites them by these IDs); their current status is in Appendix C. New findings from this baseline start at F-32. Severity: [P0] blocks a truthful demo or makes a false claim; [P1] high; [P2] medium; [P3] low. "Origin" says where the defect lives: [AS-IS IMPLEMENTATION] (this repository), [REFERENCE ZIP] (candidate code from the v3 package), [V3 SPECIFICATION] (the document itself), or environment.

## E.1 Open findings carried over from AUDIT-001 (v3 priority)

Table E.1 — Carried-over findings, ordered by v3 priority

| ID | v3 prio | Title | Status | Remediation task |
|---|---|---|---|---|
| F-01 | [P0] | Formula engine presented as PINN | [CONFIRMED_OPEN] | R0-01 |
| F-02, F-21 | [P0] | Random/constant telemetry; non-deterministic payloads | [CONFIRMED_OPEN] | R0-02 |
| F-03, F-09 | [P0] | Strains 15–47× too low; load model incomplete | [CONFIRMED_OPEN] | R1-03 |
| F-04, F-13 | [P0] | Fake WIM training modal; fake IR export | [CONFIRMED_OPEN] | R0-03 |
| F-05 | [P0] | Keyword "CV" with invented confidence | [CONFIRMED_OPEN] | R0-04 |
| F-06 | [P0] | Untraceable strain limits, "melebihi batas ijin" | [CONFIRMED_OPEN] | R0-05, R1-05 |
| F-07, F-18, F-22 | [P0] | RUL days, pothole horizon, PCI projection, overlay look-up, money figures | [SUPERSEDED_BY_V3] (still shipped) | R1-06 |
| F-12 | [P0] | Browser asserts NPU | [CONFIRMED_OPEN] | R0-06, R5-02 |
| F-14 | [P0] | No benchmark; "< 10 ms"/"8.4 ms" text | [CONFIRMED_OPEN] | R0-02, R5-01 |
| F-15 | [P0] | Source-of-truth conflict | [PARTIALLY_RESOLVED] | R0-07, R0-08, R4-03 |
| F-16 | [P0] | "FWD Validated", WIM stations | [CONFIRMED_OPEN] | R0-09 |
| F-19 | [P0] | PDF with agency names, no disclaimer | [CONFIRMED_OPEN] | R0-10 |
| F-20 | [P0] | Random attribution percentages | [CONFIRMED_OPEN] | R0-02 |
| F-08 | [P1] | Two standard axles | [CONFIRMED_OPEN] | R1-07 |
| F-10 | [P1] | Linear rain factor | [SUPERSEDED_BY_V3] | R1-08 |
| F-11, F-28 | [P1] | Unvalidated `/api/simulate`; silent clamping | [CONFIRMED_OPEN] | R1-09 |
| F-17 | [P1] | No photo trust checks | [SUPERSEDED_BY_V3] | R3-02 |
| F-23 | [P1] | Missing status labels | [CONFIRMED_OPEN] | R0-11 |
| F-24 | [P1] | Persistence not applied | [BLOCKED] | R7-02 |
| F-25 | [P1] | Demo weather/traffic | [SUPERSEDED_BY_V3] | R6-08 |
| F-27 | [P1] | No reference/E2E tests | [CONFIRMED_OPEN] | R1-04, R7-01 |
| F-26 | [P2] | Early-damage flag / option comparison absent | [SUPERSEDED_BY_V3] | R6-06, R6-07 |
| F-29, F-30, F-31 | [P2] | Section drawing, stale docs, filename parameter | [CONFIRMED_OPEN] | R1-10, R0-12, R0-03 |

<!-- landscape-start -->

## E.2 New findings from this baseline


Table E.2 — New findings (F-32 to F-51)

| ID | Sev. | Origin | Finding | Evidence | Impact | Remediation | Acceptance criterion |
|---|---|---|---|---|---|---|---|
| F-38 | [P0] | Environment | No permitted Python runtime on the development machine; every Python deliverable (inference service, PyMastic, training, OpenVINO, SLM, benchmarks) is blocked here | `python`/`python3` are Store stubs; `~/.local/bin/python3.11.exe` blocked by Application Control (os error 4551) | Phases R1–R5 cannot start or be verified on this laptop; the v3 "DIUJI" status cannot be reproduced | Human decision HD-01: allow a Python 3.11/3.12 interpreter (policy exception or managed install) on the Intel Core Ultra laptop used for the interview, or name another Intel machine | `python -I -c "import numpy, scipy"` and `PYMASTIC=… python test_core.py` print `ALL TESTS PASSED` on the named machine; log stored in `evidence/03_mlet_verification/` |
| F-46 | [P1] | [AS-IS IMPLEMENTATION] | Citizen photos are stored with EXIF/GPS metadata; no face/plate blurring; no raw-photo deletion job | `server/services/photoValidation.ts:9` ("Not done here: EXIF/GPS metadata stripping"); photo kept inside the report record (l.6) | Personal data (device, exact time, home location) retained, contrary to D-09 and UU 27/2022 minimisation | R3-01: strip EXIF server-side before persistence (until Module B ships); then Module B blur; scheduled deletion ≤ 7 days with log | Test: uploaded JPEG with GPS EXIF is persisted without any APP1/EXIF segment; deletion job log entry per photo |
| F-32 | [P1] | [REFERENCE ZIP] | Surrogate features omit the dual-spacing ratio d/a although the dataset varies a (76.5–197.5 mm) with d fixed at 330 mm | `gen_mlet_dataset.py:11,27-28`; `train_pi_surrogate.py:11-18` | Target is not a function of the four inputs → irreducible error; the "exact by construction" claim of v3 §4.4 is false for dual tyres | Add ln(d/a) as a fifth input, or generate data only at the standard axle and q used by `mc_life.py` (HD-05) | Held-out error does not depend on P or q (stratified MAPE within ±20 % of overall) |
| F-33 | [P1] | [REFERENCE ZIP] [V3 SPECIFICATION] | Monotonicity `SIGNS` contain directions contradicted by layered-elastic results; the εt-vs-E1/E3 sign is not in the v3 candidate list | `train_pi_surrogate.py:33-36`; M-16: 4/54 and 13/54 violations | Penalty would push the surrogate away from physics it is meant to respect | Run B.9 with PyMastic on the dual configuration; enable only 100 %-consistent entries; record the check | `models/sign_check.json` with per-entry counts; only 100 % entries non-zero in `SIGNS` |
| F-35 | [P1] | [REFERENCE ZIP] | The D-04 guardrail (training-domain box, 1-in-50 cross-check against PyMastic, > 10 % → fallback) exists only in prose; no code implements `in_domain`, `crosscheck_err` or fallback | No such symbol in any reference file; `train_pi_surrogate.py` only saves `fmin/fmax` | Surrogate results could be served outside their validity domain | Implement in `/v1/assess` (R2-04) | Tests: out-of-box input → PyMastic result with `surrogate.in_domain=false`; forced 15 % disagreement → fallback flagged |
| F-39 | [P1] | [AS-IS IMPLEMENTATION] vs [V3 SPECIFICATION] | Workflow vocabulary conflict: current `VERIFIED` means "screening passed" (`model.ts:16-28`, spec v2.2 §24), v3 Fig. 3.2 uses `VERIFIED` for "repair verified"; v3 adds `SCREENED`, `TRIAGED`, `REJECTED_WITH_REASON`, `MERGED`, `REFERRED` | `src/domain/workflow/model.ts`, `stateMachine.ts:46-62`; v3 p. 15 | Renaming or adding states touches the verified state machine, RBAC tests and the Supabase schema; a naive rename would invert the meaning of existing records | Keep current state names; add a documented display mapping now; add new states only after approval (HD-02) | Mapping table in DECISION_LOG; existing 226 tests unchanged and green; new-state tests for "no silent drop" |
| F-42 | [P1] | [REFERENCE ZIP] | Ultralytics YOLO is AGPL-3.0; serving it from the inference service obliges source release of that service | `train_yolo.py:33`; v3 §6.5; AGENTS §9 | Licence breach if integrated without a decision | Human decision HD-03: accept AGPL release, buy enterprise licence, or use a permissively licensed detector | Decision recorded before `ultralytics` is added to any requirements file |
| F-34 | [P2] | [REFERENCE ZIP] | Surrogate training script lacks the validation that v3 §4.4 makes mandatory: no OOD split, no plain-MLP ablation, no separate validation split; `mono_penalty_positive` is a 0/1 flag, not a violation rate; `sha256_xml` hashes the FP16 `.bin` | `train_pi_surrogate.py:66,87-99` | Metrics file would not support the v3 claims | Add OOD split (train CBR ≥ 4 and h1 ≤ 180 mm; test CBR < 3 or h1 > 200 mm), ablation, violation percentage, correct hash names | `models/pi_surrogate_metrics.json` has random, OOD and ablation sections and a violation rate in % |
| F-36 | [P2] | [REFERENCE ZIP] | `mc_life.py`: growth g = 0 divides by ln(1+0) = 0; dry and wet use different seeds (seed, seed + 1), so their difference includes sampling noise; seed "version" is the literal "v3", not the surrogate version; output lacks model version/device | `mc_life.py:13-14,27,35,41-44` | NaN/inf life for zero growth; dry→wet comparison not guaranteed monotone; provenance incomplete (AGENTS rule 3) | Reuse the g = 0 branch; common random numbers for scenarios; seed from segment id + surrogate version; add provenance fields | Tests: g = 0 finite; dry ≥ wet for every sample pair; identical inputs → identical output |
| F-37 | [P2] | [REFERENCE ZIP] | Number checker rejects legitimate text (years in criterion names, English decimals, percentages) and accepts a fact value in the wrong slot | M-20 port results; `pavement_core.py:123-139`; `slm_brief.py:9,32` | ID/EN briefs (W7) and criterion citations will fail and fall back to the template; swapped numbers pass | Check placeholders positionally (compare filled slots to their own fact), whitelist citation years, locale-aware parsing | 50-case checker suite including EN text, citations and swapped values |
| F-40 | [P2] | [AS-IS IMPLEMENTATION] vs [V3 SPECIFICATION] | Decision-ID collision and superseded entries: `docs/DECISION_LOG.md` uses D-001…D-034 (e.g. D-012 separation of duties) while v3 uses D-01…D-18 (D-12 traffic load); existing D-001 ("no FastAPI yet") and D-010 ("lifecycle exactly as spec §24") contradict v3 D-04 and Fig. 3.2 | `docs/DECISION_LOG.md:8,61`; v3 §1.3 | Ambiguous references in commits and reviews | Import v3 decisions under a distinct prefix (`V3-D-01`) and mark D-001/D-010 superseded (proposal in Appendix G) | Every decision reference in commits resolves to exactly one entry |
| F-43 | [P2] | [REFERENCE ZIP] | `trust_gate.decide` rejects out-of-corridor photos; v3 §4.1 requires REFERRED when the point lies in another agency's area; GPS-accuracy and scene thresholds are uncalibrated | `trust_gate.py:35-44` | Valid reports for other agencies would be dropped (conflicts with "no silent drop") | Add REFERRED outcome using segment authority (D-17); calibrate thresholds by ROC | Unit tests for each decision branch; ROC report stored |
| F-44 | [P2] | [REFERENCE ZIP] | Dataset generator silently discards failed PyMastic solves and records neither the failure rate per region nor seeds/versions beyond CPU name | `gen_mlet_dataset.py:30-31,44-47` | Training domain silently loses thick structures (v3: 1.1 % fail at iteration 20) → biased coverage and wrong domain box | Save failed rows and count; data card with seed, versions, PyMastic commit | `data/mlet_dual.card.json` lists n_requested, n_valid, failure region, versions |
| F-47 | [P2] | [REFERENCE ZIP] | `bench_tools.py` compiles a dynamic-shape model (`[-1,4]`) on NPU and reports any exception as "not available"; NPU compilation generally needs static shapes, so a shape error would be mis-reported as missing hardware (verify on the target OpenVINO version) | `bench_tools.py:10,32-37`; `train_pi_surrogate.py:96` | Evidence page could state "NPU not available" on a laptop that has one | Reshape to the benchmark batch before compiling on NPU; record the exception text | `measurements/*_npu.json` either has latencies or an explicit error string, never a bare "not available" |
| F-48 | [P2] | [REFERENCE ZIP] | Reference package has no licence file, no pinned dependency versions and no authorship statement for the code itself (the v3 PDF says it was drafted with Claude) | ZIP listing (`evidence/reference-inputs.txt`) | Reproducibility and GenAI disclosure (§6.6) not traceable | Add `requirements.txt` with pins, licence header, provenance note when adopting | Adopted files carry licence + provenance header; pinned lock file committed |
| F-49 | [P2] | [REFERENCE ZIP] [V3 SPECIFICATION] | Austroads branch omits the SF/RF factor shown in the v3 equation and uses 2004 constants while v3 asks for the MDP 2017 edition | `pavement_core.py:52-55`; v3 §4.4 D3 | Criterion "AUS" in the UI would not be the cited method | Decide edition (HD-04); implement exactly with citation | Unit test against a worked example from the cited edition |
| F-50 | [P2] | [REFERENCE ZIP] | `train_yolo.py` states "split by location/day" and per-condition metrics but implements neither; data YAML paths are hard-coded | `train_yolo.py:1-3,21-26,36-42` | Leakage between nearby frames inflates mAP | Implement split by segment/day; per-condition evaluation; configurable paths | Split manifest committed (hashes only); metrics per class and per condition |
| F-41 | [P3] | [V3 SPECIFICATION] | Inconsistent figures inside the v3 package: §0 says legacy strains are "14 hingga 77 kali" too small, §4.4 and AGENTS say "15 sampai 47 kali"; AGENTS Phase 0 lists F-13/F-16 as day-1 work while §4.10 merges F-13 into F-04 | v3 pp. 4, 21; AGENTS §0, §5 | Pitch numbers could contradict each other in front of judges | Use the reference-case ratios 15× (εt) and 47× (εv) with the case stated; record the discrepancy | One figure used consistently in deck, README and UI |
| F-45 | [P3] | [REFERENCE ZIP] | Knapsack memory grows with budget/unit × items (boolean table) | `pavement_core.py:96-113`; M-19 | Large budgets (Rp 500 bn, 500 items) need about 250 MB | Choose `unit` from budget (e.g. budget/20 000) and report rounding | Test with 500 items at the largest pilot budget completes < 2 s and < 100 MB |
| F-51 | [P3] | [REFERENCE ZIP] | `mlet_strains` validates with `assert` (removed under `python -O`) and mutates `sys.path` at call time | `pavement_core.py:16-19` | Silent acceptance of malformed inputs in optimised runs; import side effects | Raise `ValueError`; configure PyMastic path once at service start | Test with mismatched layer arrays raises in all modes |

<!-- landscape-end -->

## E.3 Risk view

Table E.3 — Count by severity (open items only)

| Severity | Carried over (v3 priority) | New | Total |
|---|---|---|---|
| [P0] | 18 (in 13 rows) | 1 (F-38) | 19 |
| [P1] | 9 (F-08, F-10, F-11, F-17, F-23, F-24, F-25, F-27, F-28) | 6 | 15 |
| [P2] | 4 (F-26, F-29, F-30, F-31 — v3 groups F-29/30/31 as P2) | 10 | 14 |
| [P3] | 0 | 3 | 3 |
| Total | 31 | 20 | 51 |

The highest risks for the next milestone are, in order: (1) false or unmeasured claims still on screen (F-01, F-02, F-05, F-06, F-14, F-16, F-19, F-20); (2) no Python runtime, so the verified-physics path cannot even start (F-38); (3) privacy of stored photos (F-46); (4) surrogate design defects that would undermine the "physics-informed" claim before a single epoch runs (F-32, F-33, F-35).
