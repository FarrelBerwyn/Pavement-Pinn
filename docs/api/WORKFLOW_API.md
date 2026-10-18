# Workflow, Identity and Intelligence API

Implemented in `server/routes/workflow.routes.ts`, `intelligence.routes.ts` and
`system.routes.ts`; contracts shared through `src/types/api.ts` (`WORKFLOW_API_PATHS`) and
`src/domain/`. The six original endpoints are documented in `API_INVENTORY.md` and are
unchanged.

**Identity.** Every request may carry `Authorization: Bearer <token>`. Tokens are signed
by the server (HMAC-SHA256, 8 h). The server decides the actor from the token; request
bodies never carry identity. Demo tokens are *not* authentication (see RBAC_MATRIX.md).

**Errors.** `{ "success": false, "error": { "code", "message" } }`.

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | no or invalid token |
| `FORBIDDEN` / `DISABLED` | 403 | role, ownership, assignment or separation-of-duty rule |
| `VALIDATION` | 400 | malformed body, bad photo, bad coordinates, missing reason |
| `NOT_FOUND` | 404 | unknown report/segment/simulation |
| `VERSION_CONFLICT` | 409 | `expectedVersion` is stale |
| `INVALID_TRANSITION` | 422 | action not allowed from the current state |
| `OUTSIDE_VALIDATED_RANGE` | 422 | What-If input outside the engine range |
| `RATE_LIMITED` | 429 | see limits below |
| `STORAGE` | 503 | the change was not saved; previous state intact |

**Rate limits (per client IP, in-process).** Report submission 10/hour; workflow writes
120/min; anonymous session creation 60/min; login attempts 20/min; What-If 60/min.

## Identity

| Method & path | Auth | Body | Response |
|---|---|---|---|
| `POST /api/auth/login` (older name `POST /api/auth/demo-session`) | none; 403 `DISABLED` when `DEMO_AUTH=false` | `{ username, password, layout? }` (username or demo email; `layout: "CLASSIC_PORTAL"` for the classic portal) | 200 `{ token, expiresAt, actor, authentication: "DEMO_CREDENTIALS (local demo only, not production authentication)" }`; 400 `VALIDATION` without both fields (an `accountId` alone is refused); 401 `UNAUTHENTICATED` for any wrong username or password. Demo credentials: docs/LOGIN_AND_DEMO_AUTH.md |
| `POST /api/auth/anonymous` | none | — | `{ token, expiresAt, actor: { id: "anon-…", role: "PUBLIC_VIEWER", kind: "ANONYMOUS" } }` |
| `GET /api/auth/me` | token | — | `{ actor }` |

## Reports and workflow

| Method & path | Who | Notes |
|---|---|---|
| `GET /api/workflow/reports?state=&segmentId=&limit=&offset=` | anyone | `limit` 1–200 (default 100). Official roles get `audience: "STAFF"` with the full case and `availableActions`; everyone else gets `audience: "PUBLIC"` (report, state, public timeline). |
| `GET /api/workflow/reports/:id` | anyone | same split; header `x-claim-token` proves an anonymous reporter's ownership (`isMine`). |
| `POST /api/workflow/reports` (alias `POST /api/reports`) | any session, anonymous included | Body `{ report }` (the factory draft). Server rebuilds it with its own actor, keeps a well-formed unused `REP-…` id, validates photo (JPEG/PNG/WebP by magic bytes, ≤ 5 MB), coordinates, depth/area, then runs screening. 201 with the view; anonymous callers also get `claimToken` once. |
| `POST /api/workflow/reports/:id/transitions` | token | Body `{ command: { action, … }, expectedVersion }`. Actions and payloads below. |
| `PATCH /api/workflow/reports/:id/content` | token | Body `{ patch, expectedVersion }`. Owner-only (`canEditReport`), before human review. |
| `GET /api/workflow/audit?entityId=&limit=&offset=` | official roles | newest first; actor, time, entity, action, from, to, reason. |
| `GET /api/workflow/engineers` | official roles | engineer directory for assignment. |

### Transition commands

| `action` | From → to | Role (extra guard) | Payload |
|---|---|---|---|
| `REVIEW_ACCEPT` | NEEDS_REVIEW → VERIFIED | OPERATIONS_MANAGER | `reason` |
| `CLOSE_INVALID` | NEEDS_REVIEW, VERIFIED → CLOSED | OPERATIONS_MANAGER | `reason` |
| `REQUEST_INSPECTION` | VERIFIED → FIELD_INSPECTION_REQUESTED | OPERATIONS_MANAGER | `reason, engineerId` (must be an engineer), `dueAt` (future), `instructions` |
| `SUBMIT_INSPECTION` | FIELD_INSPECTION_REQUESTED → INSPECTED | FIELD_ENGINEER (assigned) | `verdict, cvReview{accepted, correctedClass}, measuredDepthCm, measuredAreaM2, severity, notes` |
| `VERIFY_INSPECTION` | INSPECTED → INSPECTION_VERIFIED | OPERATIONS_MANAGER | `reason` (recorded in `inspectionReviews`, HD-WS-1) |
| `REQUEST_REINSPECTION` | INSPECTED → FIELD_INSPECTION_REQUESTED (same engineer) | OPERATIONS_MANAGER | `reason` (recorded in `inspectionReviews`) |
| `RECOMMEND_ACTION` | INSPECTION_VERIFIED → ACTION_RECOMMENDED | FIELD_ENGINEER (assigned, verdict CONFIRMED) | `treatment, urgency, rationale` (server attaches its assessment snapshot) |
| `CLOSE_NO_ACTION` | INSPECTION_VERIFIED → CLOSED | OPERATIONS_MANAGER | `reason` |
| `APPROVE_ACTION` | ACTION_RECOMMENDED → ACTION_APPROVED | OPERATIONS_MANAGER (not the recommender) | `reason` |
| `REJECT_ACTION` | ACTION_RECOMMENDED → INSPECTION_VERIFIED (inspection stays verified) | OPERATIONS_MANAGER | `reason` |
| `START_WORK` | ACTION_APPROVED → IN_PROGRESS | OPERATIONS_MANAGER | `reason, contractorNote` (internal work order, not an SPK) |
| `COMPLETE_WORK_ORDER` | IN_PROGRESS (stays) | FIELD_ENGINEER (assigned person) | `reason`, `completionPhotoUrl` (JPEG/PNG/WebP ≤5 MB, byte-checked, not the report photo) |
| `REQUEST_REWORK` | IN_PROGRESS (stays, work order reopened) | OPERATIONS_MANAGER (evidence present) | `reason` |
| `RESOLVE` | IN_PROGRESS → RESOLVED | OPERATIONS_MANAGER (evidence present) | `reason` |
| `CLOSE_RESOLVED` | RESOLVED → CLOSED | OPERATIONS_MANAGER | `reason` |

`SUBMIT`, `BEGIN_SCREENING`, `SCREENING_PASSED`, `SCREENING_NEEDS_REVIEW` and
`SEED_IMPORT` are system steps and are rejected when sent by clients.

## Road intelligence

| Method & path | Who | Notes |
|---|---|---|
| `GET /api/risk-map` | anyone | per segment: risk, prototype condition score, confidence, engine (`RULE_BASED`), validation status, open reports, attribute/geometry status. Pilot segments first. |
| `GET /api/road-segments/:id` | anyone | public segment fields (WIM vehicle records removed) + current estimate. |
| `GET /api/road-segments/:id/assessment` | anyone | full assessment (inputs with provenance, traffic/ESAL with WIM status, weather, uncertainty) + deterministic explanation. |
| `GET /api/road-segments/:id/story` | anyone | Road Story entries labelled OBSERVED/PREDICTED/SIMULATED/DECISION; staff see notes, the public does not. |
| `POST /api/simulations` | FIELD_ENGINEER | `{ segmentId, scenario }`; inputs outside the engine range → 422. 201 `{ simulationId, result (label SIMULATION), persisted: true }`; the run is stored and audited (`SIMULATION_RUN`). |
| `GET /api/simulations/:id` | official roles | stored record (`dataStatus: SIMULATED`). |
| `GET /api/provenance/{road_segment|assessment|report}/:id` | anyone | data status and source per field. |

## System

`GET /api/system-health` — component status as found: application, storage
(`LOCAL_FILE` or `MEMORY`), cloud database and object storage (`NOT_CONFIGURED`),
authentication (`DEMO`/`DISABLED`), CV (`DEMO`), PINN (`RULE_BASED`), OpenVINO
(`NOT_CONFIGURED`), narrative, weather/traffic/WIM integrations.
