# PAVEMENT-PINN — Master Development Tracker

Updated 2026-10-15 · branch `feature/m1-report-ownership` (HEAD `4a9b4fc` + uncommitted work) ·
Sources: v3 Dokumen Induk (governs), `AGENTS.md`, `pavement_pinn_v3_code.zip`.
Full baseline (spec-vs-implementation matrix, 51 findings, 52 roadmap tasks, math checks):
`docs/audit/v3-baseline-2026-10-15/`. This file tracks status changes since that baseline.

## 1. Actual state

| Area | State | Evidence |
|---|---|---|
| Workflow, server RBAC, separation of duties, audit trail | Working, tested | 229/229 `npm test` |
| Structural engine | RULE_BASED heuristic; strains 15×/47× below MLET on the v3 reference case | baseline §M, F-03 |
| PI-surrogate, Monte Carlo, YOLO, SLM, benchmarks | Not built | no `inference/`, `models/`, `measurements/` |
| Python runtime on this machine | Blocked by machine policy | F-38 / HD-01 |
| Cloud: RunPod | 1 GPU pod (RTX PRO 4000), **EXITED**; 0 endpoints, 0 volumes; nothing of PAVEMENT-PINN deployed | `evidence/cloud-status-2026-10-15.md` |
| Cloud: Vercel | **Not verified**: connector not authorized in this session | — |
| Persistence | Local JSON file store; Supabase migration not applied | F-24 |

## 2. Phase 0 "Truthful status" — done this session

| Task | Findings | Status | Closure evidence |
|---|---|---|---|
| R0-02 fake telemetry/loss/attribution | F-02, F-14, F-20, F-21 | **CLOSED** | `IntelTelemetry` fields `number \| null` + `measurementStatus: NOT_MEASURED`; 0 `Math.random` in src/ and server/ (guard test) |
| R0-03 WIM modal, scraper, simulated benchmark, IR/config export | F-04, F-13, F-31 | **CLOSED** | files deleted; `/api/openvino/export-*` → 404 (api.test) |
| R0-09 WIM stations with plates, "FWD Validated" | F-16 | **CLOSED** | `ALL_BINA_MARGA_WIM_STATIONS = []`; no segment has WIM data; badge removed |
| R0-04 CV confidence | F-05 | **CLOSED** | confidence `null` + `modelStatus: NOT_CLASSIFIED`; fake detection box removed; history shows "belum diklasifikasi" |
| R0-05 verdict/order text | F-06 (text) | **CLOSED** | engine notes, alerts, narratives and offline fallbacks reworded; no "aman"/"batas ijin"/"wajib penindakan"; fallbacks no longer invent default numbers |
| R0-06 browser NPU claim | F-12 | **CLOSED** | `deviceDetector` reports "tidak diketahui", never NPU |
| R0-10 PDF disclaimer | F-19 | **CLOSED** | `PDF_DISCLAIMER` on every page; agency role names and money lines removed |
| R0-01 "PINN solver" wording | F-01 | **PARTIAL** | README, engine, PDF, main screens fixed; legacy screens below still carry agency/PINN copy |
| R0-08 decision log | F-40 | **CLOSED** | `docs/DECISION_LOG.md`: V3-D-01…18, hierarchy, D-035 |
| R0-12 README | F-30 | **CLOSED** | README "Status jujur" section |
| R0-07 Narogong corridor | F-15, D-03 | **BLOCKED** | needs real geometry + managing authority (HD-07); not fabricated |
| R0-11 status label on every page | F-23 | OPEN | — |

New gate: `tests/unit/no-fake-claims.test.ts` (no Math.random, prohibited phrases, deleted modules, NPU claim,
PDF disclaimer, determinism).

Tests changed because they encoded a P0 false claim (recorded in D-035): golden regression now pins every
numeric leaf outside `telemetry` (still tolerance 0; physics numbers unchanged); telemetry jitter test →
NOT_MEASURED test; export tests → 404; `/api/roads` size/hash updated (18133 → 8775 bytes, WIM data removed);
narrative fallback text; two threshold tests now assert the new wording (thresholds 180/250 still pinned).

### Residual Phase-0 text (P1, open as R0-01b)
Agency or "PINN" wording still in legacy screens: `PavementPinnDashboard.tsx`, `FieldEngineerTools.tsx`,
`OperationsHomeView.tsx`, `OperationsPosWimMapView.tsx`, `LeafletMap.tsx` ("WIM (PUPR)"), `PinnPage.tsx`,
`FwdPage.tsx`, `ExecutivePolicyView.tsx` (memo titles, "Sumber: Kementerian PUPR"). Engine fields
`preventiveCostSavingsRupiahBillions`, `potholeHorizonDays`, PCI projection and `wimActionRequired` still
exist in data (removal is R1-06, with the engine replacement).

## 3. Test results (actual, 2026-10-15)

| Check | Result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | exit 0 |
| `npm test` | 229 tests, 229 pass, 0 fail |
| `vite build` | success |
| `pytest` | not run: no Python runtime (F-38) |

## 4. Remaining plan (order unchanged from baseline Appendix F)

1. R0-01b residual copy, R0-11 status labels: no blockers.
2. Phase 1–5 (`inference/` FastAPI, PyMastic 303/793 test, surrogate, Trust Gate, YOLO, SLM, benchmarks): **blocked by HD-01**.
   The exited RunPod pod could host *training* only; v3 §5.2 benchmarks must run on the Intel interview laptop.
3. Phase 6 role features, Phase 7 Playwright + deployment: after Phase 1.

## 5. Decisions needed from you

HD-01 Python machine/policy · HD-02 workflow state names · HD-03 YOLO licence (AGPL) · HD-04 transfer-function
criterion · HD-05 surrogate domain (ln(d/a)) · HD-06 Supabase vs VM · HD-07 Narogong data · HD-08 commit trailer
(`Assisted-by` vs Pavement-PINN co-author) · HD-09 reference-ZIP adoption / who rewrites the science core.
F-52 (new, P2): RunPod pod stores its Jupyter password in plain env config; rotate it before restarting the pod.

## 6. Readiness checklist (AGENTS §8 Definition of Done)

- [x] No on-screen number from a constant or `Math.random` in telemetry/CV/attribution paths (CI guard green)
- [ ] Photo → gate → blur → versioned detector → scored queue
- [ ] PyMastic εt/εv + life index P10/P50/P90 with criterion
- [ ] Offline assessment + NPU brief
- [ ] Evidence page with real benchmarks
- [ ] npm + pytest + Playwright green (npm only so far)

## 7. Cross-account workflow sync audit (2026-10-17)

Detail: `docs/audit/workflow-sync-2026-10-17.md`. `npm test` 244/244.

| ID | P | Status | Closure evidence |
|---|---|---|---|
| WS-01 Tugas Saya was local mock; "Mulai Tugas" saved nothing | P0 | CLOSED | `fieldTasks.ts`; test `cross-account-tasks` |
| WS-04 checklist claimed "tersimpan dalam sistem" without saving | P0 | CLOSED | alert removed, routes to Tugas Saya |
| WS-06 F.E could issue SPK locally, bypassing M.O approval | P0 | CLOSED | button routes to Tugas Saya; list labelled ILUSTRATIF |
| WS-02/03/05/08 duplicate task list, fake dashboard tasks/history, hardcoded badge | P1–P2 | CLOSED | derived from workflow cases |
| WS-07 dummy notifications | P1 | CLOSED | `notifications.ts`; test |
| WS-09 citizen report stored client-sent repair evidence/upvotes | P1 | CLOSED | `reportFactory.ts` whitelist; test |
| WS-10 offline recommendation lacked assessment | P1 | CLOSED | test |
| WS-11 no cross-account refresh | P1 | CLOSED (polling 15 s, not realtime) | `AppStateProvider.tsx` |
| WS-13 two servers on one data dir overwrite each other | P2 | OPEN | run one instance per `DATA_DIR` |
| WS-14 sessions lost on restart (`SESSION_SECRET` unset) | P2 | OPEN — HD-WS-2 | data persists across restart (verified 2026-10-17 on :3001); login required again |
| WS-23 task assigned to USR-001 invisible to field.ahmad (USR-006), same person | P0 | CLOSED | D-040 `people.ts`; live run on :3001: 29/29 steps + restart check; tests 247/247 |
| WS-16 approver role vs v2.2 §19 | P2 | CLOSED — HD-WS-1 decided: M.O approves (MVP), D.M reviews priority/budget | D-039; INSPECTION_VERIFIED + inspectionReviews separate from approvals; tests 244/244 |

## 8. F.E → M.O verification loop and dark Tasks UI (2026-10-17, continued)

State machine unchanged (v2.2 §24, D-012): F.E `SUBMIT_INSPECTION` → `RECOMMEND_ACTION` is the
"Kirim untuk Verifikasi M.O" step; M.O `APPROVE_ACTION` = "Verifikasi hasil & setujui penanganan",
`REJECT_ACTION` = "Minta perbaikan ke F.E" (reason required, case returns to the same F.E in `INSPECTED`).
F.E can never reach `RESOLVED`/`CLOSED` from the inspection stage.

| ID | P | Status | Closure evidence |
|---|---|---|---|
| WS-17 F.E did not see why M.O returned a result | P0 | CLOSED | `fieldTasks.ts` `returned` (reason, time); Tugas Saya note box; button "Kirim Ulang untuk Verifikasi M.O" |
| WS-18 verification wording missing (F.E/M.O/queue/state label) | P1 | CLOSED | `workflowLabels.ts`, `projections.ts` (`ACTION_RECOMMENDED` = "Menunggu verifikasi M.O"), `queues.ts` "Perlu verifikasi hasil F.E" |
| WS-19 M.O sidebar badge "Tim & Tugas 7" hardcoded | P1 | CLOSED | `ModernAppLayout.tsx` `operationsDue` = STAFF cases with an available action (16 on the test server = queue 14+1+1) |
| WS-20 system history reasons in English | P2 | CLOSED | `stateMachine.ts` (new records only; stored history is never rewritten) |
| WS-21 light state badges/detail panel on the dark Tasks page; report ID split at the hyphen | P2 | CLOSED | `MyTasksView.tsx` tone dark, ID nowrap |
| WS-22 cross-account test exceeded the login rate limit (20/min) | P2 | CLOSED | one session per account + forced re-login check at the end |

Evidence: `tests/integration/cross-account-tasks.test.ts` now also proves request-fix without a
reason is refused; R.E, other F.E and D.M cannot decide (403/404); the task returns to the same F.E
with the reason and the badge; resubmission waits on M.O again; after forced re-login M.O, F.E and
D.M read `ACTION_APPROVED` with history `RECOMMEND → REJECT → RECOMMEND → APPROVE`, actor, time and
reason. `npm test` 244/244; build ok; headless audit of Tugas Saya and the M.O queue at 1920, 1280,
768, 390 px: no overflow, no clipped text (isolated server, temporary `DATA_DIR`; `.data/` untouched).
The cause of the light Tasks screenshot: the pre-`6ac0c01` mock page (7 hard-coded tasks, "DEMO LOKAL").

## 9. Analysis Workspace (handoff ui-workspace, 2026-10-27)

| ID | Status | Evidence |
|---|---|---|
| U1 contract, store, layout | CLOSED | `src/domain/workspace/*`, `src/features/workspace/*`; `tests/unit/workspace-domain.test.ts` |
| U2 orchestrator, SSE, endpoints | CLOSED (file store) | `server/services/workspaceService.ts`, `server/routes/workspace.routes.ts`; `tests/integration/workspace-api.test.ts` (real Python service) |
| U3 Overview, Camera Scan | PARTIAL | no detector (HD-03); QC computed in browser |
| U4 geometry pipeline + 3D tab | PARTIAL | eq. 11–15 + volume tested on synthetic surfaces; T1 SfM BLOCKED (no COLMAP) |
| U5 Structure, PINN | PARTIAL | MLET field grid (F-29 CLOSED); life index needs traffic; surrogate RENCANA |
| U6 Validation, revisions, /track | CLOSED | E2E `e2e/workspace.spec.ts` |
| R3-01 screening on submit | OPEN | `/v1/screen` absent |
| R7-01 Playwright | CLOSED for the workspace flow | `npm run test:e2e` 6/6 |
| Ops PINN menu + RBAC | CLOSED | `rbac.test.ts`, E2E |
| UI cleanup: WIM text, seed names/faces, "Kritis" KPI label | CLOSED | `communityReports.ts`, `CommunityReportsDashboard.tsx`, `ReportDetailModal.tsx` |

Details: `docs/handoff/ui-workspace/IMPLEMENTATION_MAP.md`, D-043.
