# Appendix A — V3 Requirement Traceability Matrix

Document PAVEMENT-PINN-V3-BASELINE-001 · Version 1.0 · 2026-10-15. Page numbers are the PDF's own footers ("Halaman N / 65") of *PAVEMENT-PINN v3 Dokumen Induk* (sha256 `1cdc4229…b6ab`).

**Claim status of the current repository** (v3 §1.1): [TERBUKTI] runs in this repository with evidence; [TARGET] a measurable threshold not yet measured; [RENCANA] not built; [DILARANG] the current build shows a claim v3 forbids. Requirement IDs are v3's own where it has them (D-xx, W1…K6); other rows get stable IDs: `V3-MOD-*` module criteria, `V3-API-*` endpoints, `V3-PC-*` prohibited claims (§1.5), `V3-DOD-*` demo Definition of Done (§8.4), `V3-RAI-*` responsible-AI items, `V3-BEN-*` benchmark protocol.

<!-- landscape-start -->

## A.1 Decisions D-01 to D-18 (§1.3, pp. 7–8)


Table A.1 — Decision traceability

| ID | Decision (abridged) | Existing implementation (evidence) | Status | Evidence needed | Acceptance criterion |
|---|---|---|---|---|---|
| D-01 | v3 document governs over blueprint v1, finalist doc v2 and spec v2.2; copy decisions to `docs/DECISION_LOG.md` | `docs/DECISION_LOG.md` still cites spec v2.2 as top source (l.4-6); IDs collide (F-40) | [RENCANA] | Merged log approved by team | DECISION_LOG lists V3-D-01…18 and marks superseded entries |
| D-02 | "PINN" = physics-informed neural surrogate; say it is not a PDE-residual PINN | Legacy UI/README still say PINN solver (F-01); new domain layer honest (`assessment.ts:4-8,17`) | [DILARANG] on legacy screens | grep CI test | No "Physics-Informed Neural Network/PINN Solver" text outside roadmap-labelled copy |
| D-03 | Corridor 1 Narogong, corridor 2 Karawang, corridors as configuration | Karawang hard-coded (`karawangPilot.ts`); Narogong reports flagged OUT_OF_SCOPE (`screening.ts:83`) | [RENCANA] | `config/corridors/*.json`, test | Narogong report not OUT_OF_SCOPE; adding a corridor needs no code change |
| D-04 | MLET via PyMastic as reference; PI-surrogate for batches; fallback when out of domain or > 10 % cross-check | None (heuristic engine) | [RENCANA] | `/v1/assess` tests, guard tests (F-35) | 303/793 ±1 %; guard tests pass |
| D-05 | Selectable, cited transfer function; Indeks Umur P10/P50/P90 in years, "indikatif, bukan desain"; no pothole horizon | RUL days and pothole horizon still computed (F-07) | [DILARANG] (horizon) / [RENCANA] (life index) | Criterion decision HD-04 | UI shows criterion + label; no day-based field in any API |
| D-06 | No PCI projection; record observed condition; ASTM D6433 only from a distress survey | PCI projection in `pinnEngine.ts` (F-07) | [DILARANG] | grep/API test | No projected PCI field |
| D-07 | YOLO 4 classes (RDD2022 + local), OpenVINO INT8, confidence only from a versioned model | Keyword classifier with constant confidence (F-05) | [DILARANG] | Model registry + test | Confidence displayed only when `modelStatus=REAL` and version set |
| D-08 | Photo Trust Gate with measured FAR/FRR | Magic bytes, 5 MB, duplicate hint 30 m/7 d (`photoValidation.ts`, `screening.ts`) | [RENCANA] | ROC + FAR/FRR report | FAR/FRR stored per check |
| D-09 | Blur faces/plates, strip EXIF server-side before storage, raw photo deleted ≤ 7 days | Not done; EXIF kept (F-46) | [RENCANA] | Tests + deletion log | See R3-01 |
| D-10 | Local SLM on NPU, structured input, numbers by code, checker, template; cloud calls off | Cloud Gemini call (`narrativeService.ts:9`) with fallback | [RENCANA] | `/v1/brief` tests; network-off demo | No outbound LLM call; checker pass rate measured |
| D-11 | All performance numbers from `measurements/*.json`; otherwise "belum diukur" | Random/constant telemetry (F-02, F-14) | [DILARANG] | `no-fake-claims.test.ts` | Evidence page reads only `/v1/measurements` |
| D-12 | Remove "Virtual WIM"; traffic load from classified counts × MDP 2017 VDF (normal vs actual) | Demo traffic provider (F-25); WIM modal (F-04) | [DILARANG] (WIM) / [RENCANA] | Counts + VDF table with source | Recomputable from the count form |
| D-13 | Dishub panel advisory only; no rerouting orders or dynamic tonnage limits | Advisory panel absent; legacy engine text still issues a dynamic tonnage limit and a "Tindakan langsung" order (`pinnEngine.ts:279`) | [DILARANG] (legacy text) / [RENCANA] (panel, P2) | UI review + grep | No action buttons; no tonnage limit or order text |
| D-14 | Material recommendation → repair-option comparison (patch, AC-WC, PMA) with editable moduli; remove "PMA ≥ 8.5 cm" | PCI look-up overlay (F-18) | [DILARANG] | `/v1/options` test | Thicker/stiffer option never gives lower life |
| D-15 | Quality audit → neutral early-damage investigation flag (≥ 3 reports + engineer confirmation) | Not present | [RENCANA] (P2) | Word-list test | Flag text free of accusatory words |
| D-16 | 2D map + strain section from real MLET grid; remove 3D twin and pore-pressure animation | 2D section from a div with an unused base layer (F-29) | [RENCANA] | Visual review | Section geometry equals model inputs |
| D-17 | Segment stores managing authority; automatic routing; citizen sees responsible agency | Not present | [RENCANA] | Segment config + routing test | Out-of-authority report becomes REFERRED with target agency |
| D-18 | Citizen PWA live on a public URL; Supabase applied or one VM with daily backup; real identity for internal roles | GitHub Pages workflow exists for the static demo; file store; credential login being added in the uncommitted working tree (D-034) | [RENCANA] | HD-06 decision, deployment log | Public URL serving the pilot; backups verified |

<!-- landscape-end -->

<!-- landscape-start -->

## A.2 Role features (§3.4, pp. 15–17)


Table A.2 — Role feature traceability

| ID | Prio | Feature | Existing implementation (evidence) | Status | Acceptance criterion (v3) |
|---|---|---|---|---|---|
| W1 | [P0] | 3-step report from browser camera, GPS accuracy, compression to ≤ 500 KB | Report flow exists (`ReportRoadIssueCard.tsx`, server `POST` with photo validation); no client compression to 1280 px | [RENCANA] (compression) | Median time ≤ 60 s on 10 testers; median upload ≤ 500 KB |
| W2 | [P1] | On-phone blur/brightness check | None | [RENCANA] | ≥ 90 % of 30 synthetic blurred photos rejected on the phone |
| W3 | [P1] | Offline queue (Service Worker + IndexedDB, idempotency key) | No service worker | [RENCANA] | Airplane mode → online: sent exactly once |
| W4 | [P0] | Tracking code + public status page | No tracking code (grep: none) | [RENCANA] | Status equals state machine (integration test) |
| W5 | [P0] | Public hazard map with verified points only, no reporter data | Map exists; public-response privacy not verified in this baseline | [RENCANA] (needs check) | No personal field in public API responses (test) |
| W6 | [P1] | Citizen confirmation "masih ada"/"sudah diperbaiki" | None | [RENCANA] | Confirmation raises component C (unit test) |
| W7 | [P1] | ID/EN, large buttons, WCAG AA | Indonesian UI; no i18n framework | [RENCANA] | Lighthouse accessibility ≥ 90 |
| O1 | [P0] | Queue ordered by risk score with contribution breakdown; editable weights logged | Queue by workflow bucket; no score | [RENCANA] | Order changes with weights; change audited |
| O2 | [P1] | Merge duplicates (≤ 30 m, ≤ 7 days + pHash) | Duplicate hint 30 m/7 d exists (`screening.ts`); no merge, no pHash | [RENCANA] (partial) | ≥ 18 of 20 synthetic pairs merged |
| O3 | [P0] | NEEDS_REVIEW with reasons; accept/reject with reason; nothing dropped silently | `NEEDS_REVIEW`, `REVIEW_ACCEPT`, `CLOSE_INVALID` (reason) exist (`stateMachine.ts:49-51`) | [TERBUKTI] (state machine, tests) — new REJECTED_WITH_REASON not yet | "No silent drop" test |
| O4 | [P1] | Assign + SLA counter per hazard level | Assignment exists (`REQUEST_INSPECTION`, deadline validation `stateMachine.ts:213`); no SLA per hazard | [RENCANA] (SLA) | Late SLA marked red |
| O5 | [P0] | Approve work order; recommender ≠ approver; "bukan SPK" | Separation of duties and internal work order verified by audit (S-01, D-012/D-013) | [TERBUKTI] | "self-approval forbidden" test stays green |
| O6 | [P1] | Authority routing → REFERRED | None | [RENCANA] | Out-of-authority report → REFERRED |
| E1 | [P0] | Offline field mode on the laptop (local YOLO, PyMastic, surrogate, SLM; sync with version check) | Version check (optimistic concurrency) exists; no local inference | [RENCANA] | Wi-Fi off: full inspection works |
| E2 | [P0] | Correct detections → labels with source model version (Module H) | None | [RENCANA] | Correction appears in export |
| E3 | [P0] | Structural assessment: εt/εv from PyMastic, P10/P50/P90, sensitivity, section, provenance | `assessment.ts` RULE_BASED heuristic with honest label; What-If persisted | [RENCANA] | εt/εv equal PyMastic ±1 %; P10 ≤ P50 ≤ P90; "indikatif" visible |
| E4 | [P1] | Compare repair options (life + cost) | What-If exists for engine inputs only | [RENCANA] | Monotonicity test |
| E5 | [P0] | Recommendation + SLM summary, engineer edits and approves | `RECOMMEND_ACTION` exists; summary from cloud/fallback | [RENCANA] (SLM) | All numbers pass checker |
| E6 | [P1] | Repair verification with after-photo | `RESOLVE` by engineer exists; no after-photo requirement found | [RENCANA] | Case cannot be verified without after-photo |
| E7 | [P2] | Early-damage flag | None | [RENCANA] | No accusatory words |
| K1 | [P0] | Corridor KPI dashboard from real data only | Policy view with ILUSTRATIF notice; some constants (F-22) | [DILARANG] where constants shown | Every number traceable to a query (test) |
| K2 | [P1] | Budget package optimisation (knapsack DP + greedy) | None (reference code available, M-19) | [RENCANA] | DP ≥ greedy on 100 random cases |
| K3 | [P1] | Budget scenario curve | None | [RENCANA] | Curve non-increasing in budget |
| K4 | [P1] | Coverage-equity map | Report density module exists (`reportDensity.ts`) | [RENCANA] (partial) | Segments without reports still shown |
| K5 | [P0] | Policy summary + PDF with status block and disclaimer on every page | PDF with agency names, no disclaimer (F-19) | [DILARANG] | PDF snapshot test |
| K6 | [P2] | Dishub load-enforcement advisory panel | None | [RENCANA] | No action buttons |
| ADM | [P1] | Corridor/segment config, model registry, retention settings, audit export | Audit trail exists; no registry/retention UI | [RENCANA] | — |

<!-- landscape-end -->

<!-- landscape-start -->

## A.3 Modules, contracts, governance


Table A.3 — Module, API and governance traceability

| ID | Section/page | Requirement | Existing implementation | Status | Acceptance criterion |
|---|---|---|---|---|---|
| V3-MOD-A | §4.1 pp. 19–20 | Trust Gate checks 1–8 with ROC-calibrated thresholds; FAR ≤ 5 %, FRR ≤ 5 % (blur/dark), screen-photo FAR ≤ 10 % | Magic bytes + size + duplicate hint | [TARGET] | Measured FAR/FRR reported as-is |
| V3-MOD-B | §4.2 p. 20 | Face/plate blur (OpenVINO), EXIF strip → blur → store → delete raw ≤ 7 days; blur recall ≥ 95 % on 50 photos | None (F-46) | [TARGET] | Recall measured; deletion log |
| V3-MOD-C | §4.3 pp. 20–21 | YOLO nano/small, split by location/day, ≥ 100 local test photos, mAP per class/condition, FP32 vs INT8, kappa severity | None | [TARGET] | Metrics file per class and condition |
| V3-MOD-D1 | §4.4 p. 21 | MLET via PyMastic, q in kPa, a-normalised, iteration 20, dual tyres at x = 0, d/2, d | None in repo; reference independently cross-checked (M-01–M-03) | [RENCANA] | 303/793 ±1 %; 274/663; similarity |
| V3-MOD-D2 | §4.4 pp. 22–23 | PI-surrogate (dimensionless I/O, sign-checked monotonicity loss, guardrail); validation: random 20 %, OOD, similarity, violation %, ablation | None; reference has defects F-32–F-35 | [TARGET] | Metrics JSON with all five validations |
| V3-MOD-D3 | §4.4 pp. 23–24 | Transfer function + life index + Monte Carlo 2 000 samples, deterministic seed, Spearman tornado | None | [RENCANA] | P10 ≤ P50 ≤ P90; deterministic; physical direction |
| V3-MOD-E | §4.5 pp. 24–25 | ESAL = Σ counts × VDF (normal/actual), MDP 2017 CESA, P10–P90 | `esal.ts` fourth-power law (8.16 t) only | [RENCANA] | Recomputable from forms; constants with sources |
| V3-MOD-F | §4.6 pp. 25–26 | Transparent score (weights 0.5/0.3/0.1/0.1); blind ranking Spearman ≥ 0.6; knapsack | None | [TARGET] | Example 83.3 reproduces; ρ measured |
| V3-MOD-G | §4.7 p. 26 | SLM INT4 on NPU → GPU → CPU; placeholders; checker; template after 2 fails; label "Disusun AI…"; no cloud | Cloud Gemini | [RENCANA] | Pass rate on 50 cases; tokens/s per device |
| V3-MOD-H | §4.8 p. 26 | Active learning; `models/registry.json`; promote only if fixed local test mAP does not drop | None | [RENCANA] | Registry committed; promotion rule tested |
| V3-API-1 | §4.9 p. 27 | `POST /v1/screen` (multipart) → trust, privacy, detections, model versions, device | None | [RENCANA] | Contract test |
| V3-API-2 | §4.9 p. 27 | `POST /v1/assess` → mlet, life_years, damage_used, sensitivity, surrogate {version, in_domain, crosscheck_err}, status_label, device | Express `POST` simulations/assessments (RULE_BASED) | [RENCANA] | Contract test + Express adapter |
| V3-API-3 | §4.9 p. 27 | `POST /v1/options` | None | [RENCANA] | Contract test |
| V3-API-4 | §4.9 p. 27 | `POST /v1/brief` | `POST` narrative (Gemini) | [RENCANA] | Contract test |
| V3-API-5 | §4.9 p. 27 | `GET /v1/measurements` — sole source of the evidence page | None | [RENCANA] | UI reads only this |
| V3-DATA | §4.9 p. 27 | Tables corridors, segments (authority, layers with source), reports (tracking code, salted device hash), photos, trust_checks, detections, assessments, confirmations, priority_snapshots, traffic_counts, measurements | Migration has 17 tables (not applied); different normalisation (`report_cases`, `pinn_predictions`) | [RENCANA] | Schema decision recorded (HD-06) |
| V3-BEN | §5.4 pp. 30–31 | Benchmark protocol: fixed model hash, OpenVINO version, `available_devices`, driver, 50 warm-up, ≥ 1 000 runs, cold start, p50/p95/p99, throughput, memory, deviation vs FP32, power or "tidak diukur" | Simulated benchmark (F-14) | [DILARANG] (simulated values) | `measurements/*.json` with all fields |
| V3-RAI-1 | §6.1 p. 32 | Risk register mitigations (reporter safety warning before camera, equity, no gamification, ...) | Not present | [RENCANA] | Warning text shown before camera |
| V3-RAI-2 | §6.2 pp. 32–33 | Data lifecycle: rejected reports kept 30 days then deleted; deletion via tracking code ≤ 7 days | None | [RENCANA] | Retention job tests |
| V3-RAI-3 | §6.3 p. 33 | Model cards (YOLO, scene classifier, PI-surrogate, SLM) | None | [RENCANA] | Card per registry entry |
| V3-RAI-4 | §6.5 p. 33 | Licences: PyMastic Apache-2.0 attribution; Ultralytics AGPL-3.0 decision; RDD2022; SLM licence | Not applicable yet | [RENCANA] | HD-03 decided before integration |
| V3-RAI-5 | §6.6 p. 34 | Honest GenAI disclosure; commits marked `Assisted-by:` (AGENTS §6) | Not present | [RENCANA] | Disclosure sheet; trailer convention agreed (see HD-08) |

<!-- landscape-end -->

## A.4 Prohibited claims (§1.5, p. 9) and demo Definition of Done (§8.4, p. 39)

Table A.4 — Prohibited claims: where the current build still violates them

| ID | Prohibited claim | Present in current build? (evidence) | Status |
|---|---|---|---|
| V3-PC-1 | "PINN that solves Burmister" / "FEM-equivalent in < 10 ms" | README l.1; legacy screens; "Latensi <10 ms" in `demoAccounts.ts:128` | [DILARANG] present |
| V3-PC-2 | Latency, power, NPU use or quantisation accuracy not from a measurement file | `pinnEngine.ts:217`, `simulatedBenchmark.ts`, `deviceDetector.ts:15` | [DILARANG] present |
| V3-PC-3 | "Validated with FWD/WIM/field data" | WIM-station correlations in `LeafletMap.tsx:362`; FWD badge (F-16) | [DILARANG] present |
| V3-PC-4 | "Jalan ini aman" / "melebihi batas ijin" from model output | `pinnEngine.ts:129` ("melebihi batas ijin"), `:132` ("batas elastis aman"), `:170` ("OPERASIONAL AMAN") | [DILARANG] present |
| V3-PC-5 | Remaining life in days, pothole horizon, APBN savings | `pinnEngine.ts:90-112,188-201` | [DILARANG] present |
| V3-PC-6 | Data from/endorsed by Bina Marga, PUPR, Kemenhub, BMKG or Intel | `pdfGenerator.ts:34,65,163` | [DILARANG] present |
| V3-PC-7 | "Detects rogue contractors", "corruption" | Not found in this baseline's sweep | Not observed |
| V3-PC-8 | "100 % offline" for the whole system | Not found in this baseline's sweep | Not observed |

Table A.5 — Demo Definition of Done (§8.4) against the current build

| ID | Criterion | Current state | Blocking tasks |
|---|---|---|---|
| V3-DOD-1 | No number on screen from a constant or `Math.random` (grep test) | Fails: 15 `Math.random` call sites in 4 runtime files | R0-02 |
| V3-DOD-2 | Phone photo → gate → blur → versioned detection → queue with explainable score | Not possible: no gate, blur, model or score | R3-*, R6-01 |
| V3-DOD-3 | εt/εv from PyMastic, life index P10/P50/P90, criterion, "indikatif" | Not possible: no Python service | F-38, R1-*, R2-* |
| V3-DOD-4 | Wi-Fi off: assess and write summary on NPU | Not possible | R4-*, R6-03 |
| V3-DOD-5 | Evidence page with real benchmarks (device, OpenVINO version, date) | Not possible | R5-* |
| V3-DOD-6 | Local backup recording of the demo | Team task | R7-04 |
