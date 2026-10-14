# Requirement Traceability

Status values: **PASS** (implemented and tested), **PARTIAL**, **BLOCKED** (external data,
credentials or environment), **NOT_IMPLEMENTED**. "Software PASS" never means
scientifically validated; see the last section.

Test files: `tests/unit/workflow.test.ts` (WF), `tests/integration/workflow-api.test.ts`
(API), `tests/integration/intelligence-api.test.ts` (IAPI), `tests/unit/intelligence.test.ts`
(INT), `tests/unit/report-factory.test.ts` (FAC), `tests/unit/report-ownership.test.ts`
(OWN), `tests/unit/rbac.test.ts` (RBAC), `tests/unit/report-density.test.ts` (DEN). "Browser"
= manual run in the built-in browser on 2026-10-14 (port 3100, fresh data directory).

## Identity, access, audit

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-AUTH-001 | Server decides the actor; body cannot claim identity | brief §AR, §BL | `server/auth/*`, `actorFrom` | API "forged or tampered tokens" | PASS | |
| REQ-AUTH-002 | Real authentication (identity provider) | spec §20.1, brief §W | — | — | BLOCKED | No Supabase project (G-SB-02); demo picker labelled, `DEMO_AUTH=false` switch |
| REQ-AUTH-003 | Anonymous citizen reporting, separate from demo accounts | spec §22, M1b | `SessionProvider` (ANONYMOUS), `/api/auth/anonymous` | API golden path; browser | PASS | |
| REQ-AUTH-004 | Anonymous report tracking via server-issued claim token | M1b | claim token hash on case, `x-claim-token` | API golden path | PASS | |
| REQ-RBAC-001 | Four stakeholder roles with distinct actions | spec §19, brief §R | transition table, `ACTION_RULES` | RBAC, WF, API | PASS | |
| REQ-RBAC-002 | Role enforcement at the API boundary | brief §P6 | `workflow.routes.ts` + domain guards | API "wrong role…", "audit…" | PASS | |
| REQ-RBAC-003 | Ownership by account id, never display name | M1a | `canEditReport` | OWN, API ownership | PASS | |
| REQ-RBAC-004 | Region/assignment scoping of official roles | brief §P2 | assignment scoping for engineers only | WF | PARTIAL | Region scoping is a product decision (not defined) |
| REQ-AUD-001 | Every transition audited (actor, time, entity, action, reason) | spec §24, brief §T | service audit events | WF golden path, API golden path | PASS | |
| REQ-AUD-002 | Audit readable by official roles only | M1c | `/api/workflow/audit`, UI gates | API, browser (anon: no button) | PASS | |
| REQ-AUD-003 | Public history separate from internal audit | M1c | `toPublicView` | WF "public view hides…", API | PASS | |

## Workflow (P1/P2/P3)

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-WF-001 | Lifecycle SUBMITTED → … → RESOLVED/CLOSED | spec §24 | `stateMachine.ts` | WF golden path | PASS | |
| REQ-WF-002 | Illegal transitions rejected | brief §P1 | `applyCommand` | WF, API 422 | PASS | |
| REQ-WF-003 | AI screening separate from human verification | brief §P1 | `screening.ts`, D-011 | WF screening tests | PASS | DEMO never auto-verifies |
| REQ-WF-004 | Persist before success; failed write leaves state | brief §P1 | `CaseStore.commit`, UI waits | WF, API 503 | PASS | |
| REQ-WF-005 | No silent overwrite on concurrent change | brief §P1 | `expectedVersion`, serialized service | WF race test, API 409 | PASS | |
| REQ-WF-006 | Report resolution distinct from work-order completion | brief §P1 | `COMPLETE_WORK_ORDER` vs `RESOLVE` | WF | PASS | |
| REQ-WF-007 | Human approval for consequential actions; AI never approves | spec §23, §29 | OM-only approve, recommender ≠ approver | WF, API | PASS | |
| REQ-WF-008 | SPK not implied by a button | brief §P3 | internal work order, `isOfficialDocument: false` | WF, browser | PASS | |
| REQ-WF-009 | Persistence across accounts, routes, sessions, restarts | brief §P2 | `FileCaseStore` | API restart test, browser | PASS (local) | Cloud persistence BLOCKED (G-SB-01) |
| REQ-WF-010 | Cloud PostgreSQL/PostGIS with RLS | brief §V, §W | `supabase/migrations/…_workflow_core.sql` | — | BLOCKED | Written, not applied (no credentials) |
| REQ-WF-011 | Duplicate / spam / location sanity | spec §20.2, §22 | duplicate hint, Indonesia + pilot bbox, rate limit 10/h | WF, IAPI OUT_OF_SCOPE | PARTIAL | No image-quality check (needs CV) |

## Role use cases (P3)

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-CIT-001 | Photo + GPS report, confirmation and report ID | spec §22 | `ReportRoadIssueCard` (awaits save) | browser golden path | PASS | |
| REQ-CIT-002 | CV result with data-status label | brief §P3 | screening reasons, DEMO badge | WF, browser | PASS | Result is DEMO |
| REQ-CIT-003 | Tracking with permitted public history | brief §P3 | public timeline in report modal | API, browser | PASS | |
| REQ-CIT-004 | No staff notes or private data to citizens | brief §P3 | `toPublicView`, story audience | WF, API, INT | PASS | |
| REQ-CIT-005 | Safe-route guidance | spec §25 | — | — | NOT_IMPLEMENTED | No routing data (G-SW-07) |
| REQ-ENG-001 | Assigned inspection queue | brief §P3 | `engineerQueue`, `/engineering/tasks/` | browser | PASS | |
| REQ-ENG-002 | Structured inspection record, CV review/correction | brief §P3 | `SUBMIT_INSPECTION` form | WF, API, browser | PASS | |
| REQ-ENG-003 | Evidence: baseline, traffic/WIM, weather, engine output, uncertainty | brief §P3 | road insight `/roads/:id/` | IAPI, browser | PASS | All inputs SYNTHETIC/DEMO/INFERRED, labelled |
| REQ-ENG-004 | Verification distinct from editing a citizen report | brief §P3 | legacy direct-verify removed | OWN | PASS | |
| REQ-ENG-005 | Map pin opens the report/inspection surface | brief §3 | pin → sheet with workflow panel | browser | PASS | |
| REQ-OPS-001 | Central queue, triage, assignment, deadlines/overdue | brief §P3 | `operationsQueue`, `/operations/` | browser | PASS | |
| REQ-OPS-002 | Review recommendations, approve/reject, work orders | brief §P3 | workflow panel | WF, API, browser | PASS | |
| REQ-OPS-003 | Escalation | spec §19 | — | — | NOT_IMPLEMENTED | No escalation target/rules defined |
| REQ-POL-001 | Prioritised segments with evidence and uncertainty | brief §P3 | `PolicyPriorities` | browser | PASS | |
| REQ-POL-002 | Pending and approved interventions | brief §P3 | policy list | browser | PASS | |
| REQ-POL-003 | Budget scenarios with defensible inputs | brief §P3 | — | — | NOT_IMPLEMENTED | No validated cost model; legacy executive view numbers are illustrative (G-SW-04) |

## Science and AI pipeline (P4)

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-CV-001 | Modular CV inference interface; MODEL_UNAVAILABLE/DEMO fallback | brief §C | `CvScreeningProvider` | WF | PASS | |
| REQ-CV-002 | Trained YOLOv8-class model | spec §8 | — | — | BLOCKED | No weights, no Python (G-03, G-PY-01) |
| REQ-TR-001 | CV → engineering translation with CALIBRATION REQUIRED | spec §8.2 | `translateSurfaceEvidence` | INT | PASS | |
| REQ-TRF-001 | Traffic-to-load inference with uncertainty, congestion ≠ weight | spec §9 | `estimateTrafficLoad` | INT | PASS | Inputs SYNTHETIC |
| REQ-ESAL-001 | ESAL service with validation and explanation | spec §10 | `esal.ts` | INT | PASS | |
| REQ-WIM-001 | WIM integration; WIM DATA NOT AVAILABLE fallback | spec §11 | `WimProvider` | INT, IAPI | PASS (fallback) | Real WIM BLOCKED (G-02) |
| REQ-WX-001 | Weather adapter with labelled demo data | spec §12 | `WeatherProvider` | INT | PASS (demo) | No API key |
| REQ-BL-001 | Pavement baseline with source/confidence/status | spec §13 | `pavementBaseline` | INT | PASS (reference) | No survey data |
| REQ-PINN-001 | PINN inference with residual/version | spec §16 | — | — | BLOCKED | No trained model (G-04) |
| REQ-PINN-002 | Labelled fallback keeps pipeline executable | brief §P4 | `assessSegment` RULE_BASED | INT, IAPI | PASS | |
| REQ-OOD-001 | "Outside validated range" warning | spec §29 | assessment flags; What-If 422 | INT, IAPI | PASS | |
| REQ-OV-001 | OpenVINO conversion/runtime/benchmark | spec §17 | — | — | BLOCKED | No model/runtime/hardware test (G-05) |
| REQ-XAI-001 | Explanation: what/why/evidence/confidence/next, no invented % | spec §27, brief §Q | `explainAssessment` | INT | PASS | |

## Map, What-If, Road Story (P5)

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-MAP-001 | Canonical Karawang pilot segments KRW-001..004 | spec §6 | `karawangPilot.ts` | INT, IAPI | PASS | Geometry ILLUSTRATIVE (G-01) |
| REQ-MAP-002 | Risk map API | spec Lampiran L | `GET /api/risk-map` | IAPI | PASS | |
| REQ-MAP-003 | Road selection opens detail; risk/why/confidence | spec §21.4, §21.7 | segment sheet → `/roads/:id/` | browser | PASS | |
| REQ-MAP-004 | Risk layer colouring on the map by estimate | spec §21.3 | — | — | PARTIAL | Map still colours by dataset PCI; estimate shown in detail |
| REQ-WI-001 | What-If baseline vs scenario, deltas, SIMULATION label, sanity checks | spec §14 | `runWhatIf`, `WhatIfPanel`, `POST /api/simulations` | INT, IAPI, browser | PASS | |
| REQ-WI-002 | Simulations persisted and retrievable | spec Lampiran L | `GET /api/simulations/:id` | IAPI | PARTIAL | Memory only (G-SW-01) |
| REQ-RS-001 | Road Story with OBSERVED/PREDICTED/SIMULATED labels | spec §21.5 | `buildRoadStory`, `RoadStoryTimeline` | INT, IAPI, browser | PASS | No historical data yet |

## Responsible AI, security, quality (P6/P7/P8)

| ID | Requirement | Source | Implementation | Test | Status | Evidence / blocker |
|---|---|---|---|---|---|---|
| REQ-SEC-001 | Upload validation (type by magic bytes, size) | brief §AS | `photoValidation.ts` | API photo test | PASS | |
| REQ-SEC-002 | EXIF/GPS metadata stripping | brief §AS | — | — | NOT_IMPLEMENTED | Needs image library (G-SB-03) |
| REQ-SEC-003 | Rate limiting, security headers, input validation | brief §AR | `rateLimit.ts`, `app.ts` | API | PASS | In-process limits (G-SW-06) |
| REQ-SEC-004 | No secrets in client bundle | brief §AR | `.env.example` notes | module-boundaries | PASS | |
| REQ-PROV-001 | Provenance per entity | spec §28 | `/api/provenance/...`, UI badges | IAPI | PASS | |
| REQ-HEALTH-001 | System health by component | brief §AY | `/api/system-health` | API | PASS | |
| REQ-UX-001 | Reduced motion, focus visibility, tokens | UI directive | `styles/index.css`, `motion.ts` | build | PASS | |
| REQ-UX-002 | Mobile golden path without overflow | brief §BS | queue/panel fixes | browser 375×812 | PASS | Camera/GPS not exercised on a real phone |
| REQ-QA-001 | E2E golden path | brief §P7 | HTTP golden path; manual browser run | API, browser | PARTIAL | No Playwright suite (G-SW-02) |
| REQ-CI-001 | CI: install → lint → test → build | brief §AV | `.github/workflows/ci.yml` | not yet run on GitHub | PARTIAL | Runs on next push (none made) |
| REQ-DEP-001 | Cloud deployment of backend | brief §AW | `docs/DEPLOYMENT.md` | — | BLOCKED | No host/credentials; GitHub Pages is static only |

## Scientific validation (separate from software status)

| Claim | Status |
|---|---|
| CV accuracy on Karawang photos | VALIDATION REQUIRED (no dataset, no model) |
| PINN physical consistency / accuracy | VALIDATION REQUIRED (no trained model, no ablation) |
| OpenVINO latency/accuracy on Intel hardware | DATA REQUIRED (no benchmark run) |
| Traffic-to-load estimates vs WIM | DATA REQUIRED (no WIM) |
| Risk estimates vs field condition | VALIDATION REQUIRED (rule-based, synthetic inputs) |
