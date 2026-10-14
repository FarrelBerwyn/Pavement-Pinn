# API Inventory

The backend is one Express 4 application. All six endpoints existed before the
restructure with the same paths, methods and payloads; they were moved out of the
single `server.ts` file into modules. Contract tests: `tests/integration/api.test.ts`.

## Runtime layout

| File | Responsibility |
|---|---|
| `server/index.ts` | process entry: load config, create the app, attach the frontend host, listen |
| `server/app.ts` | `createApp()`: `express.json()` first, then the API router (no side effects, used by tests) |
| `server/routes/index.ts` | route table; paths come from `API_PATHS` in `src/types/api.ts` |
| `server/controllers/*` | HTTP input and output |
| `server/services/*` | simulation, OpenVINO export builders, narrative generation |
| `server/repositories/roadSegmentRepository.ts` | read-only access to the road dataset |
| `server/integrations/geminiClient.ts` | Gemini client, created lazily |
| `server/middleware/frontendHost.ts` | Vite middleware in development, static `dist/` plus SPA fallback in production |
| `server/config/env.ts` | `PORT` (default 3000), `NODE_ENV`, `VITE_BASE_PATH` (default `/PavementPinn/`) |

Middleware order is unchanged: JSON body parser, API routes, then the frontend host.

Shared request and response types live in `src/types/api.ts` and are imported by both
the server and the browser clients in `src/services/api/`.

## Cross-cutting facts

- **Authentication: none. Authorization: none.** Every endpoint answers any caller.
  No role, token, cookie or header is read. See `docs/architecture/RBAC_MATRIX.md`.
- **Persistence: none.** No database, no file writes, no cache. Nothing a client sends
  is stored. `server/database/` was deliberately not created.
- No CORS configuration, rate limiting, request-size override, or input validation exists.
- No API versioning; no `/api/v1` prefix was introduced.
- Unknown `/api/...` paths are not answered with a JSON 404: they fall through to the
  frontend host and return the SPA HTML with status 200 (pre-existing behaviour).
- On GitHub Pages there is no backend at all. The frontend detects a `github.io` host
  (`isStaticHost()` in `src/services/api/client.ts`) and uses the narrative embedded in
  the simulation result. The two OpenVINO download links are dead on that host
  (pre-existing).

## Endpoints

### GET `/api/health`

- Request: none.
- Response 200, JSON: `status` ("ok"), `appName` ("PAVEMENT-PINN"), `timestamp` (ISO 8601).
- Errors: none defined.
- Implementation status: IMPLEMENTED. Not called by the frontend.

### GET `/api/roads`

- Request: none.
- Response 200, JSON array of 15 `RoadSegment` objects (18,133 bytes), the full content
  of `src/data/reference/indonesianRoads.ts` including `wimDetails` and `activeWimStatus`
  (licence plates and per-vehicle weights of the demonstration records).
- Errors: none defined.
- Implementation status: IMPLEMENTED over a static dataset. Not called by the frontend,
  which imports the same module directly.
- Note: because this endpoint is unauthenticated, the "public-safe" filtering done by
  the `/roads/:roadId/` page is a presentation choice, not data protection.

### POST `/api/simulate`

- Request body, JSON: `params` (a `SimulationParams` object; see the PINN regression report).
- Response 200, JSON: `success` true and `result` (a `SimulationResult` with the keys
  `id`, `timestamp`, `params`, `roadSegment`, `predictedPci`, `pciDropPoints`,
  `pavementLifeRemainingYears`, `tensors`, `roleOutputs`, `telemetry`, `aiNarrative`).
- Behaviour kept from the original:
  - an unknown or missing `segmentId` silently uses the first road segment;
  - there is no validation: missing numeric inputs propagate `NaN`, which JSON encodes as `null`.
- Errors: 500 with `success` false and `error` (the runtime message) when `params` is
  absent, for example "Cannot read properties of undefined (reading 'segmentId')".
  400 with Express's default HTML error page when the body is not valid JSON.
- Implementation status: IMPLEMENTED (deterministic engine; telemetry fields SIMULATED).
  Not called by the frontend, which runs the same engine in the browser.

### GET `/api/openvino/export-ir`

- Query: `device` (default `NPU`), `precision` (default `INT8_NNCF`). Values are not validated.
- Response 200, `Content-Type: application/xml`, `Content-Disposition: attachment` with
  file name `pavement_pinn_{device}_{precision}.xml` in lower case. The body is a fixed
  XML document; the query only affects the file name.
- Implementation status: SIMULATED. The XML is a hand-written four-layer descriptor
  with a custom operation type; it is not exported from a trained model and no weights
  file accompanies it. It should not be presented as a deployable OpenVINO model.
- Consumer: download link in the OpenVINO diagnostics modal.

### GET `/api/openvino/export-config`

- Query: `device` (default `NPU`), `precision` (default `INT8_NNCF`), `streams` (default `2`).
- Response 200, `Content-Type: application/json`, attachment named
  `openvino_config_{device}.json`. JSON with `model_name`, `openvino_version`,
  `target_device`, `precision_mode`, `nncf_quantization`, `performance_config` and
  `deployment_code_sample` (C++ and Python snippets as strings).
- Implementation status: SIMULATED (a configuration template; `nncf_quantization.enabled`
  simply mirrors whether `precision` equals `INT8_NNCF`).
- Consumer: download link in the OpenVINO diagnostics modal.

### POST `/api/generate-narrative`

- Request body, JSON: `role` (one of the five role identifiers) and `simulationData`
  (a `SimulationResult`; read defensively, every field optional).
- Response: always 200, JSON with `success` true, `narrative` (text) and `source`:
  - `gemini-3.7-flash` when the Gemini call succeeded;
  - `rule-engine-offline` when no usable `GEMINI_API_KEY` is configured;
  - `rule-engine-fallback` when the Gemini call failed.
- The offline text is the narrative embedded in `simulationData.aiNarrative` for the
  role, or a template. Any role other than `FIELD_ENGINEER` and `OPERATIONS_MANAGER`
  receives the policy narrative.
- The `role` and `simulationData` values are interpolated into the Gemini prompt
  without sanitisation; a caller controls the prompt content (pre-existing).
- Errors: 400 for malformed JSON. Gemini failures are swallowed and logged with `console.warn`.
- Implementation status: IMPLEMENTED with offline fallback. The Gemini path itself is
  NOT TESTED: in the audited environment the configured key was rejected by Google
  ("API key not valid"), so only the fallback paths were observed.
- Consumer: `requestAiNarrative` in `src/services/api/narrativeApi.ts`, used by the simulation panel.

## Summary table

| Method | Path | Auth | Role check | Frontend consumer | Status |
|---|---|---|---|---|---|
| GET | `/api/health` | none | none | none | IMPLEMENTED |
| GET | `/api/roads` | none | none | none | IMPLEMENTED (static data) |
| POST | `/api/simulate` | none | none | none | IMPLEMENTED |
| GET | `/api/openvino/export-ir` | none | none | diagnostics modal link | SIMULATED artifact |
| GET | `/api/openvino/export-config` | none | none | diagnostics modal link | SIMULATED artifact |
| POST | `/api/generate-narrative` | none | none | simulation panel | IMPLEMENTED with fallback |

## Compatibility verification

| Check | Result |
|---|---|
| `GET /api/roads` body identical to baseline (SHA-256) | PASS |
| `GET /api/openvino/export-ir` body and headers identical to baseline | PASS |
| `GET /api/openvino/export-config` body and headers identical to baseline | PASS |
| `POST /api/simulate` envelope, key order and deterministic values | PASS |
| `POST /api/simulate` 500 message for a missing `params` | PASS (same text) |
| `POST /api/generate-narrative` envelope and offline text | PASS |
| Malformed JSON gives 400 | PASS |
| Default port 3000 and base path | PASS |

## Secrets

- `GEMINI_API_KEY` is read only in `server/integrations/geminiClient.ts`, on the server.
  A source search and a search of the built bundle found no reference to it in frontend code.
- `.github/workflows/deploy.yml` passes the secret to the static build as
  `VITE_GEMINI_API_KEY`. Nothing reads that variable, so it is not in the published
  bundle today. Because Vite inlines every referenced `VITE_*` variable into public
  JavaScript, that line is a latent risk and is best removed. The workflow file was
  left untouched.
- The server does not load `.env` files (`dotenv` is installed but never imported).

## Recommended next steps (not done)

1. Real authentication and per-endpoint authorization before any non-demo deployment.
2. Input validation on `POST /api/simulate` and a JSON 404 for unknown `/api/` paths.
3. A public projection of the road dataset for `GET /api/roads`.
4. Remove `VITE_GEMINI_API_KEY` from the deploy workflow.
