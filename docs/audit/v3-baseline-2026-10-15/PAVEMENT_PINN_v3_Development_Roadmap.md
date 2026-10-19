# Appendix F — Development Roadmap

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15. [PROPOSED TARGET STATE] — nothing in this appendix exists yet.

## F.1 Principles

1. **Order follows v3 §8.1/§8.2 and AGENTS §5, adjusted to evidence.** Phase 0 (remove false claims) needs no Python and can start immediately. Phases 1–5 are blocked by F-38 (no permitted Python runtime) and must not start until HD-01 is resolved.
2. **Truthful before bigger.** A smaller system whose every number is computed or measured beats a larger one with placeholders. Optional competition items (RAG, video counting, scene classifier) stay [RENCANA].
3. **Tracks.** Each task is tagged `SCI` (scientific correctness), `INT` (integrity/privacy/governance) or `DEMO` (competition demo value). SCI and INT work is never traded for DEMO work.
4. **Change control.** Each task is one small PR naming its finding ID (`fix(F-02): …`). Any task touching more than three source files, the state machine, RBAC, the database schema or retention policy needs a written change plan and explicit human approval first (AGENTS §6, §9). Phase 0 as a whole touches about 20 files, so it is proposed as a sequence of approved PRs, not one change.
5. **Gates.** After every phase: `npm test`, `npm run lint`, and (from Phase 1) `pytest` green; no existing test deleted or weakened; legacy tests that encode physically wrong behaviour are marked legacy with approval, never silently edited.
6. **Effort.** Sizes are relative (S ≤ 1 day, M 2–3 days, L ≥ 4 days for one developer) and assume the Python environment exists. Calendar dates are deliberately not given: the 7-day emergency plan of v3 §8.2 is not achievable as written while F-38 is open, and the interview date is not stated in the sources.

<!-- landscape-start -->

## F.2 Phase table


Table F.1 — Roadmap tasks

| Task ID | Source requirement | Current gap | Required change | Dependencies | Tests | Acceptance criteria | Priority · track · size |
|---|---|---|---|---|---|---|---|
| R0-01 | F-01, D-02 | "PINN/neural solver" text in README, legacy screens, PDF | Replace with actual status ("mesin rumus RULE_BASED, belum PI-surrogate"); roadmap wording only where labelled | none | grep test in `no-fake-claims.test.ts` | Forbidden phrases only inside roadmap-labelled copy | [P0] · INT · S |
| R0-02 | F-02, F-14, F-20, F-21, D-11 | 15 `Math.random` call sites; "< 10 ms"; random losses/latency/attributions | Remove generators and constants from telemetry/loss/benchmark/attribution paths; show "belum diukur"; ids/time excluded from payload equality | none | `tests/unit/no-fake-claims.test.ts`: grep for `Math.random` in runtime paths = 0; identical input → identical payload | Test green; no telemetry number on screen | [P0] · INT · M |
| R0-03 | F-04, F-13, F-31 | WIM training modal + scraper; fake IR export routes | Delete modal, `binaMargaWimScraper.ts`, `openvinoExportService.ts`; routes 404 | R0-02 | Route test 404; module-boundary test updated with approval | Routes 404; no epoch/loss UI | [P0] · INT · S |
| R0-04 | F-05, D-07 | Keyword CV with constant confidence | Show "belum diklasifikasi" until Module C; no model name/percent for citizens | none | Unit: confidence rendered only if `modelStatus='REAL'` and version | Test green | [P0] · INT · S |
| R0-05 | F-06, V3-PC-4, D-13 | "melebihi batas ijin", "aman", dynamic tonnage limit + direct order text (`pinnEngine.ts:129-132,170,279`) | Remove verdict/order strings; keep numbers labelled RULE_BASED until R1 | none | grep test for forbidden words | No verdict or order text | [P0] · INT · S |
| R0-06 | F-12 | Browser defaults to NPU | Report "tidak diketahui" unless a device query from the inference service says otherwise | none | Unit without WebGL info → "tidak diketahui" | Test green | [P0] · INT · S |
| R0-07 | F-15, D-03 | Karawang hard-coded; Narogong OUT_OF_SCOPE | `config/corridors/narogong.json`, `karawang.json`; screening reads config | Narogong geometry and authority data from team (HD-07) | Screening test: Narogong point in scope | Adding a corridor = config only | [P0] · DEMO · M |
| R0-08 | F-40, D-01 | DECISION_LOG on spec v2.2; ID collision | Merge per Appendix G after approval | Approval | Doc review | Single unambiguous log | [P0] · INT · S |
| R0-09 | F-16 | WIM stations with plates; "FWD Validated" | Remove; add data inventory (source, licence, status) | none | grep test | No unsupported provenance badge | [P0] · INT · S |
| R0-10 | F-19, K5 | PDF names agencies, no disclaimer | Status block + "bukan dokumen resmi" on every page; remove agency names | none | PDF text snapshot test | Disclaimer on each page | [P0] · INT · S |
| R0-11 | F-23 | Status labels missing | One status-label component on every page showing model/engine output | none | Lint-style test over page list | All listed pages labelled | [P1] · INT · M |
| R0-12 | F-30, F-41 | README title/test count, package name, inconsistent ratios | Fix docs; use 15×/47× with the case stated | none | Review | Docs match code | [P2] · INT · S |
| R1-01 | F-38 | No permitted Python runtime | Provision Python 3.11/3.12 + venv on the interview laptop (policy exception or managed install) | HD-01 | `python -I -c "import numpy, scipy"` | Interpreter runs under the machine policy | [P0] · SCI · S (blocker) |
| R1-02 | V3-MOD-D1 | Reference never run by this team | Clone PyMastic (record commit), run `test_core.py`; store log | R1-01 | `ALL TESTS PASSED` | Log in `evidence/03_mlet_verification/` | [P0] · SCI · S |
| R1-03 | F-03, F-09, D-04, V3-API-2 | Heuristic engine called from 8 files (`assessment.ts`, `simulationService.ts`, 6 UI files) | `inference/` FastAPI `/v1/assess` (MLET single + dual, editable spacing); Express adapter via `INFERENCE_URL`; replace `runPinnSimulation` callers | R1-02; approval (> 3 files) | Contract tests; Express adapter test with stub; existing tests unchanged | Engineer UI shows PyMastic εt/εv with criterion and "indikatif, bukan desain" | [P0] · SCI · L |
| R1-04 | F-27 | No independent reference test | pytest: 303/793 ±1 %, 274/663, ×3 similarity; Node test comparing `/v1/assess` with the audit solver on axis cases | R1-03 | CI job | Fails if tolerance broken; tolerance never widened | [P0] · SCI · S |
| R1-05 | F-06, D-05, F-49 | No cited transfer function | One constants module; criterion chosen and cited (HD-04); SF/RF handled | HD-04 | Unit vs worked example of the cited edition | Criterion visible in UI and PDF | [P0] · SCI · M |
| R1-06 | F-07, F-18, F-22, D-05, D-06, D-14 | RUL days, horizon, PCI projection, overlay look-up, money figures | Remove fields from engine, API and UI | R1-03 | API test: legacy fields absent | No day-based life anywhere | [P0] · SCI · M |
| R1-07 | F-08 | 10 t vs 8.16 t | Single `STANDARD_AXLE_TON = 8.16` with citation used everywhere | none | Cross-module test | One constant | [P1] · SCI · S |
| R1-08 | F-10 | Linear rain factor | Dry/wet scenario with editable soaked factor (ASSUMED) | R1-03 | Unit: wet ≤ dry life | Labelled ASSUMED | [P1] · SCI · S |
| R1-09 | F-11, F-28 | `/api/simulate` unvalidated; silent clamping | Retire route (or full schema); reject out-of-range with 400/422 | approval (route removal) | Contract tests 400/422 | No clamped result returned | [P1] · INT · S |
| R1-10 | F-29, D-16 | Section from a div | Draw from real inputs + MLET grid | R1-03 | Visual review + unit on geometry | Drawing equals inputs | [P2] · SCI · M |
| R2-01 | F-32, F-44 | Feature/geometry defect; silent NaN drop | Decide HD-05 (add ln(d/a) or fix axle/q); data card; failure log; generate 5 000–20 000 cases | R1-02, HD-05 | Dataset card check | Card committed (hash only, data gitignored) | [P0] · SCI · M |
| R2-02 | F-33 | Unchecked SIGNS | Run B.9 on the dual configuration with PyMastic | R2-01 | Script output stored | Only 100 %-consistent entries enabled | [P0] · SCI · S |
| R2-03 | F-34, V3-MOD-D2 | Training script incomplete; scientific core must be team-written | Team rewrites training with random, OOD, similarity, violation %, ablation | R2-01, R2-02 | Metrics JSON schema test | `models/pi_surrogate_metrics.json` complete | [P0] · SCI · L |
| R2-04 | F-35, D-04 | No guardrail | In-domain box + 1-in-50 cross-check + fallback inside `/v1/assess` | R2-03 | OOD and forced-disagreement tests | Fallback flagged in output | [P0] · SCI · M |
| R2-05 | F-36, V3-MOD-D3 | MC defects | 2 000 samples, common random numbers, seed from segment + model version, g = 0 branch, Spearman | R2-04 | P10 ≤ P50 ≤ P90; determinism; dry ≥ wet per sample | Tests green | [P0] · SCI · M |
| R2-06 | §5.3 point 2 | No export | OpenVINO FP32/FP16 (+ INT8 via NNCF), deviation vs FP32 and vs PyMastic | R2-03 | Deviation report | INT8 used only if deviation acceptable | [P1] · SCI · S |
| R3-01 | F-46, D-09 | EXIF kept on stored photos | Strip EXIF before persistence (Python service, or an approved Node image library — new dependency needs approval) | approval (dependency) | Upload with GPS EXIF → stored without APP1 | Test green | [P1] · INT · S |
| R3-02 | F-17, F-43, D-08, V3-MOD-A | No trust checks | `/v1/screen` gate with ROC-calibrated thresholds, REFERRED branch | R1-01, photo set | Branch unit tests; FAR/FRR report | Measured FAR/FRR stored | [P0] · INT · M |
| R3-03 | D-09, V3-MOD-B | No blur, no deletion job | Face/plate blur (licensed models), raw deletion ≤ 7 days with log | R3-01 | Recall on 50 photos; deletion test | Recall reported; log entries | [P0] · INT · M |
| R3-04 | D-07, F-42, F-50, V3-MOD-C | No detector | YOLO training with split by segment/day, OpenVINO INT8, metrics per class/condition | HD-03, ≥ 100 local test photos | Metrics JSON | Confidence only from versioned model | [P0] · SCI · L |
| R3-05 | F-39, §3.3 | States SCREENED/REJECTED_WITH_REASON/MERGED/REFERRED absent | Add states via approved state-machine change with mapping; "no silent drop" | HD-02 approval | Existing workflow tests unchanged + new tests | No report disappears without reason | [P1] · INT · M |
| R4-01 | D-10, V3-MOD-G | No local SLM | INT4 export; NPU → GPU → CPU fallback | R1-01, NPU laptop | Startup device test | Runs offline | [P0] · DEMO · M |
| R4-02 | F-37 | Checker edge cases | Positional slot check, locale, citation whitelist, 50-case suite | none | Suite | Pass rate measured | [P0] · INT · S |
| R4-03 | D-10, F-15 | Cloud Gemini call active | Route narrative to `/v1/brief`; remove cloud client | R4-01, R4-02 | Network-off test | No outbound LLM request | [P0] · INT · S |
| R5-01 | F-14, F-47, D-11, V3-BEN | No measurements | `bench_tools.py` fixed for static NPU shapes; run on the interview laptop | R2-06, R3-04, R4-01 | Schema test of `measurements/*.json` | All §5.4 fields present | [P0] · DEMO · M |
| R5-02 | F-12 | Browser guesses devices | Devices only from `core.available_devices` | R1-03 | Unit | Browser never infers NPU | [P0] · INT · S |
| R5-03 | V3-API-5 | No evidence page source | Evidence page reads only `/v1/measurements`; "belum diukur" otherwise | R5-01 | UI test | No hard-coded numbers | [P0] · DEMO · S |
| R6-01 | O1, V3-MOD-F | No risk score | Priority score in `src/domain/intelligence/`, weights editable and audited | R2-05 (S component; 0.5 default until then) | Example 83.3; weight-change audit test | Queue ordered by score with breakdown | [P0] · DEMO · M |
| R6-02 | O2, O4, O6, D-17 | No merge/SLA/referral | pHash merge, SLA per hazard, authority routing | R3-02, R3-05 | 18/20 merge test; SLA test; REFERRED test | Criteria of §3.4 | [P1] · DEMO · M |
| R6-03 | E1, E2, V3-MOD-H | No offline field mode or correction export | Local inference + sync with version check; correction labels | R2-04, R3-04, R4-01 | Wi-Fi-off E2E | Full inspection offline | [P0] · DEMO · L |
| R6-04 | W3, W4, W6, W7, V3-RAI-1 | No tracking code, offline queue, confirmations, EN, safety warning | Tracking code + status page; SW queue; confirmations; ID/EN; warning before camera | R3-05 | Integration + Lighthouse | Criteria of §3.4 | [P0]/[P1] · DEMO · L |
| R6-05 | K2–K5 | No optimiser/equity/disclaimed PDF | Knapsack (unit scaling F-45), scenario curve, equity map, summary + PDF | R6-01 | DP ≥ greedy; curve monotone | Criteria of §3.4 | [P1] · DEMO · M |
| R6-06 | E4, D-14, F-26 | No option comparison | `/v1/options` with editable moduli and unit costs | R2-05 | Monotonicity test | Thicker/stiffer never lower life | [P1] · SCI · M |
| R6-07 | E7, D-15, F-26 | No early-damage flag | Neutral flag, ≥ 3 reports + engineer confirmation | R6-06 | Word-list test | No accusatory words | [P2] · INT · S |
| R6-08 | D-12, F-25, V3-MOD-E | Demo traffic | Counts × MDP 2017 VDF (normal/actual), P10–P90 | traffic survey data | Recompute-from-form test | Constants with sources | [P1] · SCI · M |
| R6-09 | K6, D-13 | No advisory panel | Read-only Dishub panel | R6-08 | UI review | No action buttons | [P2] · DEMO · S |
| R7-01 | F-27 | No E2E | Playwright golden path citizen → operator → engineer → approve → repair → verify | R6-04 (new dev dependency needs approval) | Playwright | Green in CI | [P1] · INT · M |
| R7-02 | F-24, D-18 | Persistence not applied | Supabase or one VM + daily backup (HD-06) | HD-06, credentials | Integration test against chosen store | Backup restore drill | [P1] · INT · M |
| R7-03 | D-18 | No public citizen URL | Deploy PWA | R7-02 | Smoke test | Public URL live | [P1] · DEMO · S |
| R7-04 | V3-DOD-6, §8.3 | No evidence package | `evidence/` folders of §8.3; local demo recording | all | Checklist | Folder complete | [P1] · DEMO · S |

<!-- landscape-end -->

## F.3 Dependency chain

Table F.2 — Critical path

| Step | Depends on | Why |
|---|---|---|
| Phase 0 (R0-01…R0-12) | approvals only | Pure TypeScript/text changes; removes every prohibited claim (V3-DOD-1) |
| R1-01 Python runtime | HD-01 | Every Python task needs it |
| R1-02 → R1-03 → R1-04 | R1-01 | Verified physics before anything trains on it |
| R2-01 → R2-02 → R2-03 → R2-04 → R2-05 | R1-02, HD-05 | Surrogate design defects must be fixed before training (F-32, F-33) |
| R3-04 (detector) | HD-03 licence, local photos | Detector cannot be trained or served before the licence decision |
| R4-01, R5-01 | interview laptop with NPU | Measurements must come from the demo machine (v3 §5.2) |
| R6-* | R2-05, R3-*, R4-* | Role decisions consume the new engines |
| R7-* | R6-* | Golden path covers the finished flow |

## F.4 Human approval gates

Table F.3 — Approval gates

| Gate | Before | Who decides | What is approved |
|---|---|---|---|
| G-0 | Any Phase 0 PR touching > 3 files | Developer + team lead | File list, tests, rollback (revert of the PR) |
| G-1 | R1-03 | Team | `inference/` service, Express adapter, `INFERENCE_URL`, retirement of `/api/simulate` |
| G-2 | R2-03 | Team | Surrogate design (HD-05), sign table, validation plan |
| G-3 | R3-04 | Team + licence owner | HD-03 Ultralytics licence path |
| G-4 | R3-05 | Team | State-machine change (HD-02), schema impact |
| G-5 | R7-02 | Team | Persistence choice (HD-06), retention policy implementation |

## F.5 Next milestone (recommended first phase)

**Milestone M-P0 "Truthful status"** = R0-01 to R0-10 merged.

Exit criteria:

1. `tests/unit/no-fake-claims.test.ts` passes: no `Math.random` in runtime telemetry/loss/benchmark/CV/attribution paths; forbidden phrases of §1.5 absent outside roadmap-labelled copy; identical inputs yield identical payloads apart from ids/timestamps.
2. `/api/openvino/export-*` and the WIM pipeline routes return 404.
3. A report located on Jalan Raya Narogong is in scope (not OUT_OF_SCOPE); Karawang still works; corridors load from `config/corridors/`.
4. Exported PDFs carry the status block and "bukan dokumen resmi" on every page and name no agency.
5. All pre-existing tests still pass (226 at the audit date plus any new ones); `npm run lint` clean.
6. DECISION_LOG merge approved and committed (Appendix G).

In parallel (no code): HD-01 (Python runtime) and HD-03/HD-04 decisions, so Phase 1 can start the day M-P0 closes.
