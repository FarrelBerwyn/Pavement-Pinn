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
  INSPECTED → ACTION_RECOMMENDED → ACTION_APPROVED → IN_PROGRESS → RESOLVED | CLOSED`.
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
