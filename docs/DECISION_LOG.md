# Decision Log

Engineering decisions made while implementing PAVEMENT-PINN v2.2 in the existing
repository. Each entry: context, decision, alternatives, consequences. Newest last.
Source hierarchy (since 2026-10-15, v3 D-01): **PAVEMENT-PINN v3 Dokumen Induk** > `AGENTS.md` >
spec `PAVEMENT-PINN_v2.2.docx` > execution brief > existing repository > engineering judgement.
v3 decisions use the prefix `V3-D-` to avoid colliding with the three-digit IDs below (F-40).

## D-001 Keep the Express/TypeScript server as the domain API (no FastAPI yet)

- **Context.** The execution brief prefers FastAPI + PyTorch + Supabase. The repository
  already has an Express API, and this development machine has **no Python runtime**
  (`python` is not installed), so a Python service could not be run or tested here.
- **Decision.** Implement the workflow, authorization, persistence seam and intelligence
  services in TypeScript on the existing Express server. Shared rules live in an
  isomorphic kernel (`src/domain/`) used by both the server and the browser.
- **Alternatives.** A second FastAPI backend (untestable here, duplicates the domain);
  frontend-only workflow (no server enforcement).
- **Consequences.** One tested backend. Python AI services (CV, PINN training, OpenVINO
  runtime) become optional sidecars behind documented provider contracts (docs/AI.md).

## D-002 Persistence behind a `CaseStore` interface; local JSON store now, Supabase later

- **Context.** No Supabase credentials exist. The brief forbids claiming cloud
  persistence that is not live.
- **Decision.** `CaseStore` (load/commit full snapshot). `FileCaseStore` writes an atomic
  JSON snapshot under `DATA_DIR` (temp file + rename). `MemoryCaseStore` for tests and the
  static demo. The PostGIS schema with RLS is written as a migration
  (`supabase/migrations/20261014000000_workflow_core.sql`) but **not applied**.
- **Consequences.** Real cross-account, cross-session persistence on the demo server;
  the cloud adapter is a tracked gap (G-SB-01). `/api/system-health` reports
  `cloudDatabase: NOT_CONFIGURED`.

## D-003 Server-signed session tokens; demo picker is explicitly not authentication

- **Decision.** The server decides the actor for every workflow request from an HMAC
  token it issued (`server/auth/sessionTokens.ts`). Demo accounts get tokens from
  `/api/auth/demo-session` (alias `/api/auth/login`); anonymous visitors from
  `/api/auth/anonymous` with a server-chosen `anon-…` id. `DEMO_AUTH=false` disables the
  picker. Request bodies never carry identity.
- **Consequences.** Role, ownership and transition rules are enforced at the API
  boundary and cannot be bypassed by editing the UI. It is still not authentication:
  anyone can ask for any demo token while the picker is on. Real identity (Supabase Auth
  JWT verification) is gap G-SB-02.

## D-004 Anonymous visitors are `PUBLIC_VIEWER`, separate from the Budi demo account (M1b)

- **Decision.** Before any login the UI acts as "Pengunjung Anonim" (role
  `PUBLIC_VIEWER`), never USR-004. Anonymous reports get a server-issued claim token
  (only its SHA-256 is stored) for tracking; anonymous users cannot edit content.
  Their reports count as regular-user reports in the density layer (unchanged rule:
  session reports by a public role).
- **Consequences.** Seed upvote flags stay attributed to USR-004 explicitly.

## D-005 Ownership by account id, edit only before human review (M1a, approved G-2..G-4)

- `canEditReport` (`src/domain/access.ts`): only `PUBLIC_REPORTER`, only own session
  report by account id, only while the workflow state is `SUBMITTED`, `AI_SCREENING` or
  `NEEDS_REVIEW`. Seed reports are never editable. Enforced in the UI and in
  `PATCH /api/workflow/reports/:id/content`.

## D-010 Report lifecycle exactly as spec §24, with SEED_IMPORT for demo data

- States `SUBMITTED → AI_SCREENING → VERIFIED | NEEDS_REVIEW → FIELD_INSPECTION_REQUESTED →
  INSPECTED → INSPECTION_VERIFIED (D-039) → ACTION_RECOMMENDED → ACTION_APPROVED → IN_PROGRESS → RESOLVED | CLOSED`.
- Bundled demo reports are imported once with a single `SEED_IMPORT` record saying they
  are SYNTHETIC and their earlier history is unknown — no screening or repair steps are
  invented. Display status gains `CLOSED`.

## D-011 AI screening and human verification are separate

- **Context.** Spec: "AI SCREENING (confidence check) → VERIFIED / NEEDS REVIEW"; brief:
  keep AI screening and human verification separate.
- **Decision.** The SYSTEM actor may move a report to `VERIFIED` only when a **real**
  trained model ran with confidence ≥ 0.6, the location is plausible and no duplicate is
  suspected. The in-app classifier is a DEMO, so today every report goes to
  `NEEDS_REVIEW`, where an Operations Manager accepts or closes it. Human verification of
  damage is the Field Engineer's inspection (`INSPECTED`, data status `OBSERVED`).

## D-012 Separation of duties

- Operations Manager: review, close, assign inspections, approve/reject recommendations,
  start work, mark the work order complete, close resolved reports.
- Field Engineer (assigned one only): submit inspection, recommend action, verify repair.
- The engineer who recommended an action cannot approve it. Policy Maker: no workflow
  transitions (read-only priorities and evidence). Citizens: submit and track.

## D-013 Work orders are internal records, never official SPK documents

- `WorkOrder.isOfficialDocument` is the literal `false` (DB check constraint too) and every
  UI shows "bukan dokumen SPK resmi". The legacy "Terbitkan SPK" shortcut no longer
  pretends to issue anything; it opens the engineer's task queue.

## D-014 Optimistic concurrency and persist-before-success

- Every transition carries `expectedVersion`; a mismatch returns 409. Service calls are
  serialized; the store swaps in a fully built snapshot only after a successful write,
  so a failed write leaves state and audit unchanged (503). The UI shows success only
  after the server response.

## D-015 Client report ids are kept when well-formed

- The server keeps a factory id (`REP-` + 16 hex) when unused, so the map's optimistic
  selection keeps working; everything else (creator, role, status) is server-decided.

## D-020 Engines: RULE_BASED today, labelled everywhere

- No trained PINN weights exist. `assessSegment` runs the deterministic formula in
  `src/engines/pinn` and reports `engine: RULE_BASED`, `confidence: LOW`,
  `physicsResidual: null`, `validationStatus: VALIDATION_REQUIRED`, with input provenance.
  Its score is a "prototype condition score", not a validated PCI. Inputs outside the
  engine range are flagged "Outside validated range" (and the What-If API rejects them
  with 422, spec Lampiran L).

## D-021 Traffic, WIM, weather, baseline fallbacks

- Without WIM: heavy-vehicle volume is INFERRED from segment attributes with a ±35 %
  range, axle loads use an illustrative spectrum, and the UI says "WIM DATA NOT
  AVAILABLE". With WIM observations the spectrum comes from them and the range narrows.
- Weather: deterministic DEMO provider (no API key). Baseline: REFERENCE BASELINE
  (SYNTHETIC). None of these are shown as observations.

## D-022 CV → engineering translation stops at a surface indicator

- `translateSurfaceEvidence` returns distress class + severity with status
  `CALIBRATION_REQUIRED`; no modulus, CBR or axle load is derived from photos.

## D-023 Explanations are deterministic

- `explainAssessment` restates engine results and recorded evidence with qualitative
  levels (HIGH/MEDIUM/LOW/UNCERTAIN), never invented percentage contributions, and
  phrases next steps as human considerations. Gemini (when configured) remains limited
  to the legacy narrative endpoint.

## D-024 Recommendation assessments are computed by the server

- `RECOMMEND_ACTION` stores a snapshot of the server's own assessment (engine, version,
  risk, confidence, validation status); a client-sent snapshot is ignored.

## D-030 Canonical pilot segments added alongside the legacy dataset

- `KRW-001..004` (Klari → Jatisari → Simpang Jomin) with ILLUSTRATIVE geometry and
  SYNTHETIC attributes are listed first; the 15 legacy demo segments stay (no feature
  removed). `/api/roads` keeps its byte-identical legacy contract; new endpoints use both.

## D-031 Policy view shows evidence, not money

- The policy priority table ranks segments by RULE_BASED risk and verified evidence. No
  budget or savings figures are added; the existing executive view's illustrative
  numbers are untouched (pre-existing, flagged in the final audit).

## D-032 What-If is engineer-only on the API (spec Lampiran L)

- The legacy public simulator page (`/engine/simulation/`) is kept unchanged; the new
  What-If API and panel follow the spec (Field Engineer). Runs are stored in the workflow
  snapshot (`simulations`) with a `SIMULATION_RUN` audit event and labelled SIMULATED.

## D-033 Legacy illustrative screens are labelled, not deleted

- The executive policy view, WIM/ODOL operations views and the old task planner keep
  their content (no feature removed) but carry visible ILUSTRATIF / SIMULASI / DEMO LOKAL
  notices (`components/ui/DataNotice.tsx`). Removing the figures is a product decision.

## D-034 Credential login replaces the account picker

- `/api/auth/login` and `/api/auth/demo-session` require a username and password checked
  against five dummy demo credentials; an account id in the body no longer signs anyone
  in. Account switching is removed from the header, profile panel and classic navbar.
- Demo credentials reach the browser bundle only in the dev server or with
  `VITE_DEMO_ACCESS=true`; the static Pages build has no login without that flag.
- Still demo authentication (public credentials, stateless tokens). Details and gaps:
  docs/LOGIN_AND_DEMO_AUTH.md.

## Open product questions (not decided here)

- Should CLOSED-as-invalid reports be excluded from the density heatmap? (Kept: every
  status counts, as before.)
- Region/assignment scoping of official roles; an administrator role for account and
  permission management.
- Public visibility of reporter names on seed data (anonymous submissions already hide them).


## v3 decisions (PAVEMENT-PINN v3 Dokumen Induk §1.3)

Adopted 2026-10-15. English summaries; the Indonesian text in the PDF §1.3 is authoritative.

| ID | Decision |
|---|---|
| V3-D-01 | v3 document governs over blueprint v1, finalist doc v2 and spec v2.2; copy decisions to `docs/DECISION_LOG.md` |
| V3-D-02 | "PINN" = physics-informed neural surrogate; say it is not a PDE-residual PINN |
| V3-D-03 | Corridor 1 Narogong, corridor 2 Karawang, corridors as configuration |
| V3-D-04 | MLET via PyMastic as reference; PI-surrogate for batches; fallback when out of domain or > 10 % cross-check |
| V3-D-05 | Selectable, cited transfer function; Indeks Umur P10/P50/P90 in years, "indikatif, bukan desain"; no pothole horizon |
| V3-D-06 | No PCI projection; record observed condition; ASTM D6433 only from a distress survey |
| V3-D-07 | YOLO 4 classes (RDD2022 + local), OpenVINO INT8, confidence only from a versioned model |
| V3-D-08 | Photo Trust Gate with measured FAR/FRR |
| V3-D-09 | Blur faces/plates, strip EXIF server-side before storage, raw photo deleted ≤ 7 days |
| V3-D-10 | Local SLM on NPU, structured input, numbers by code, checker, template; cloud calls off |
| V3-D-11 | All performance numbers from `measurements/*.json`; otherwise "belum diukur" |
| V3-D-12 | Remove "Virtual WIM"; traffic load from classified counts × MDP 2017 VDF (normal vs actual) |
| V3-D-13 | Dishub panel advisory only; no rerouting orders or dynamic tonnage limits |
| V3-D-14 | Material recommendation → repair-option comparison (patch, AC-WC, PMA) with editable moduli; remove "PMA ≥ 8.5 cm" |
| V3-D-15 | Quality audit → neutral early-damage investigation flag (≥ 3 reports + engineer confirmation) |
| V3-D-16 | 2D map + strain section from real MLET grid; remove 3D twin and pore-pressure animation |
| V3-D-17 | Segment stores managing authority; automatic routing; citizen sees responsible agency |
| V3-D-18 | Citizen PWA live on a public URL; Supabase applied or one VM with daily backup; real identity for internal roles |

Effect on earlier entries: D-001 superseded in part (Express stays; a Python inference
service is added, V3-D-04). D-021 superseded (Virtual WIM removed, V3-D-12). D-033 superseded
for the WIM modal, IR export and telemetry screens, which were deleted in Phase 0.

## D-035 Phase 0: remove fabricated numbers instead of labelling them

- **Context.** v3 §1.5 and AGENTS.md rule 1 forbid any unmeasured performance figure.
- **Decision.** Telemetry fields became `number | null` with `measurementStatus: NOT_MEASURED`;
  WIM station records, the WIM training modal, the simulated benchmark and the IR/config export
  endpoints were deleted (routes now 404); CV confidence is `null` until a versioned model exists.
- **Tests changed (behaviour that encoded a P0 false claim).** `pinn-regression`: the golden
  comparison now pins every numeric leaf outside `telemetry` at tolerance 0 (strings were reworded);
  the jitter-band telemetry test became a NOT_MEASURED test. `api.test.ts`: OpenVINO export tests
  now assert 404. New gate: `tests/unit/no-fake-claims.test.ts`.
- **Not done.** Narogong corridor config — done in D-036.

## D-036 Pilot corridors as configuration (V3-D-03)

- **Decision.** `config/corridors/narogong.json` (corridor 1) and `karawang.json` (corridor 2),
  loaded by `src/domain/corridors.ts`. Screening flags `OUT_OF_SCOPE` only outside every corridor.
- **Limits.** Both bounding boxes are approximate; segment geometry and managing authority are
  `null` / DATA REQUIRED until surveyed (HD-07, G-01). Only Karawang has seeded segments.
- **Tests.** `tests/unit/corridors.test.ts`.

## D-037 Python inference service with the MLET reference solver (V3-D-04, D-23, M1)

- **Decision.** `inference/` (FastAPI, Python 3.11, `.venv`, `requirements.lock`) serves
  `GET /v1/health` and `POST /v1/assess`. PyMastic is vendored unmodified at commit `be301be`.
  Express forwards `GET /api/engine/health` and `POST /api/engine/assess` (Field Engineer only)
  to `INFERENCE_URL` (default `http://127.0.0.1:8100`); when the service is down it answers 503
  `INFERENCE_UNAVAILABLE`, never a locally computed substitute. `POST /api/simulate` returns 410.
- **Evidence.** `inference/tests` (pytest, 14 tests): reference strains 303/793 µε (10 t),
  274/663 µε (8.16 t), 227/876 µε (8.16 t dual, 330 mm) within 1 %, elastic similarity ×3 exact,
  out-of-range input → 422. Re-run on the team machine on 2026-10-16.
- **Not done (M2).** Life index uncertainty covers the traffic range only (`TRAFFIC_ONLY`);
  materials Monte Carlo, PI-surrogate and OpenVINO are not built. The browser engine
  `runPinnSimulation` (RULE_BASED) still drives the legacy screens and What-If.

## D-038 PI-surrogate on OpenVINO and Monte Carlo life index (V3-D-02, V3-D-04, V3-D-05, M2)

- **Decision.** `models/pi-surrogate-v1` (PyTorch → OpenVINO FP32, CPU) trained from 19,894 PyMastic
  solutions; `/v1/assess` runs 2,000 Monte Carlo samples dry and wet (same seed) and returns life
  P10/P50/P90, strain percentiles and Spearman sensitivity. Field engineers see it in
  `StructuralAssessmentPanel` on the road detail page (E3).
- **Change from the reference code.** Input `ln(d/a)` added: with dual tyres the strain depends on the
  tyre spacing relative to the contact radius, so similarity is exact only with it.
- **Guards.** > 5 % of samples outside the training box → refused; fewer → solved by PyMastic;
  1-in-50 cross-check against PyMastic, withheld above 10 % (εt compared only when ≥ 50 µε).
- **Not served.** INT8 (10.9 % deviation) and FP16 (3.5 %); see `models/MODEL_CARD.md`.
- **Hardware.** Dev laptop i5-12450H + UHD iGPU (+ RTX 4050); no NPU, no Intel XPU for training.
  The Core Ultra requirement for M4–M5 (D-21) is still open.

## D-039 HD-WS-1: M.O verifies the inspection and approves the operational treatment, separately

- **Decided by the team (2026-10-17).** For the MVP the Operations Manager (M.O) approves operational
  treatment. The Policy Maker (D.M) reviews policy priority and budget within their authority and has
  no workflow transitions. Supersedes the open question HD-WS-1 (docs/audit/workflow-sync-2026-10-17.md).
- **Two independent decisions.** (1) Inspection verification: `VERIFY_INSPECTION` (INSPECTED →
  INSPECTION_VERIFIED) or `REQUEST_REINSPECTION` (back to FIELD_INSPECTION_REQUESTED, same engineer),
  recorded in `inspectionReviews`. (2) Treatment approval: `APPROVE_ACTION` / `REJECT_ACTION`
  (back to INSPECTION_VERIFIED, inspection stays verified), recorded in `approvals`. Each has its own
  state, its own record (actor, time, reason) and its own transition in the audit log.
- **Rules.** Every M.O decision needs a reason. F.E can recommend or close-no-action only after the
  inspection is verified; F.E never reaches RESOLVED/CLOSED from the inspection stage. Separation of
  duties unchanged (the recommending engineer cannot approve).
- **Deviation from v2.2 §19 (recorded):** §19 lists "Approve/request verification" for the Field
  Engineer; the MVP keeps approval with M.O (D-012) so the person who inspects does not approve.
- **Compatibility.** `inspectionReviews` is optional on stored cases (older cases load unchanged).
- **Tests.** `tests/integration/cross-account-tasks.test.ts` (both loops, refusals, independent
  audit after re-login), `tests/unit/workflow.test.ts`, `tests/integration/workflow-api.test.ts`.

## D-040 Workflow ownership is per person, not per account id

- **Root cause (2026-10-17, localhost:3001).** Ir. Ahmad Subagyo has two demo accounts: USR-006
  (modern app, `field.ahmad`) and USR-001 (classic portal). The engineers endpoint listed both with the
  same name; M.O picked USR-001 for REP-KRW-002, while Tugas Saya, notifications and the
  "assigned engineer only" rule compared the raw account id, so the task never showed for USR-006.
- **Decision.** `src/domain/identity/people.ts` links the accounts of one person (mirrors
  `demoCredentials.ts`, checked by `tests/unit/people.test.ts`). Assignment checks, task lists, queues,
  notifications and the separation-of-duties rule compare people (`samePerson`); the engineers endpoint
  offers one canonical account per person. Existing assignments to USR-001 work without migration.
- **Tests.** A different engineer (USR-099) cannot see or submit an assigned inspection; an assignment
  to the classic account reaches the modern account; tests that used USR-001 as "another engineer"
  were wrong (same person) and were corrected.
- **Storage and sessions (as used locally).** `FileCaseStore` writes `.data/workflow.json` on this
  machine only — not a shared or cloud database; one server per data directory (WS-13). Data survives
  refresh, re-login and server restart (verified). `SESSION_SECRET` is unset, so sessions end on restart
  and users log in again (HD-WS-2, not changed).

## D-041 Repair evidence comes from F.E; M.O verifies it (2026-10-18)

- **Context.** The legacy-UI restoration brief (2026-10-17) asks for: F.E "Sudah Selesai" sends an
  after-photo and notes, M.O verifies or requests rework, then the citizen is notified. The state
  machine had the roles reversed (M.O marked the work order complete, F.E "verified" the repair) and
  stored no repair photo, so every "after" image on screen was a stock photo.
- **Decision.** `COMPLETE_WORK_ORDER` → assigned field engineer only, with a required new
  `completionPhotoUrl` (server byte check; the citizen photo is refused). New `REQUEST_REWORK` (M.O,
  reason) reopens the work order. `RESOLVE` → M.O, only once evidence exists. No new workflow state:
  the case stays `IN_PROGRESS` until `RESOLVE`. All submissions are kept in `workOrder.submissions`
  with the decision, so rework never overwrites evidence.
- **Display.** The "after" photo of a real case is `workOrder.completionPhotoUrl` (projections.ts);
  citizens see it only after M.O verified it. Stock fallbacks and the stock `afterPhotoUrl` written on
  report creation were removed; sample cases keep their labelled illustrative photos.
- **Navigation.** "Navigasi ke Lokasi" centres the map on the report's coordinates and hands routing to
  Google Maps; distance is shown only from the device GPS as a straight line. No simulated route/ETA.
- **Tests.** Unit: M.O cannot send evidence, F.E cannot verify, no verification before evidence, citizen
  photo refused, rework keeps history. API: fake image → 400. Live UI run REP-CE4FF6508311FFCD
  (R.E → M.O → F.E → M.O → R.E, one re-inspection and one rework) passed; data survived a restart.

## D-042 One workflow store across server processes (2026-10-18)

- **Incident.** Two dev servers (:3001 and :5173) ran from this folder on the same
  `.data/workflow.json`. `FileCaseStore` cached the file forever and rewrote it whole on commit, so
  each port showed different data and one commit dropped REP-0D48E30E6358447F from disk.
- **Decision.** The file store re-reads on change (mtime/size), commits under a cross-process lock
  with compare-and-swap on `revision`, and the service retries on `StoreConflictError`. Case
  versions still guard real conflicts. `/api/health` reports the code a process runs; the UI warns
  when a port serves older code. No real-time claim: browsers poll every 15 s.
- **F.E tabs.** One mapping (`fieldStages.ts`) from state + reviews + work order to tab and stage;
  no new workflow states.
- **Recovery.** With the owner's approval REP-0D48E30E6358447F was restored unchanged from a
  read-only export of the :5173 process via `scripts/recovery/restore-case.ts` (store lock + CAS,
  original audit events plus one `RECORD_RESTORED` event); :5173 was restarted on the new code.
- **Evidence.** docs/audit/legacy-ux-sync-2026-10-18.md.
