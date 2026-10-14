# Baseline Audit (pre-restructure)

Snapshot of the repository **before** any file was moved. Everything in this document
was read from the code or measured by running it; nothing is assumed.

- Commit: `fffa344` on `main` ("fix: set base=/PavementPinn/ for GitHub Pages, skip API call on static host")
- Audit date: 2026-10-14
- Toolchain observed: Node v24.16.0, npm 12.0.2, TypeScript 5.8.3, Vite 6.4.3, React 19, Express 4, Tailwind 4
- Recoverable checkpoint of this exact state: git ref `refs/backup/pre-restructure` (see RESTRUCTURE_TEST_REPORT.md, rollback section)

## 1. Directory structure at baseline

```text
pavement-pinn/
  .env.example  .gitignore  README.md  metadata.json  index.html
  package.json  package-lock.json  bun.lock (0 bytes)  tsconfig.json  vite.config.ts
  server.ts                     223 lines  Express + Vite middleware, all endpoints inline
  .github/workflows/deploy.yml  GitHub Pages deploy of the static build
  src/
    main.tsx  App.tsx (399)  types.ts (279)  index.css  vite-env.d.ts
    assets/pavement-pinn-logo.jpg
    components/   27 flat .tsx files (largest: PublicUserLayout 3356, LeafletMap 1932)
    data/         communityReports, cvDamageClasses, indonesianRoads,
                  nationalRoadHealthData, policyMapData, userAccounts
    services/     binaMargaWimScraper.ts
    utils/        pinnEngine.ts, deviceDetector.ts, pdfGenerator.ts, i18n.ts
```

No `tests/`, `docs/`, `scripts/`, `public/`, `models/` or `datasets/` directory existed.
Total source: about 36,500 lines.

## 2. Entry points

- Browser: `index.html` loads `/src/main.tsx`, which renders `App` inside `StrictMode`.
  `index.html` also loads Leaflet 1.9.4 and leaflet.heat from the unpkg CDN (the npm
  packages are bundled as well; the map code falls back to the global `L.heatLayer`).
- Server: `server.ts`, run by `npm run dev` (`tsx server.ts`). In development it embeds
  Vite in middleware mode; in production (`npm start`, `node dist/server.cjs`) it serves
  `dist/` statically. Port 3000 was hard-coded.

## 3. Navigation at baseline: there was no router

Searches for `window.location`, `history.pushState`, `popstate`, `hashchange`,
`React.lazy`, dynamic `import()` and `import.meta.glob` found nothing (the single
`window.location.hostname` use is the GitHub Pages check in the simulation panel).
Navigation was plain React state:

- `App.tsx` chose one of two shells from the signed-in demo account:
  - **modern app shell** (`PublicUserLayout`) for public roles and `MODERN_APP` accounts;
  - **classic portal** (navbar, full-screen map, floating panels) for `CLASSIC_PORTAL` accounts.
- Classic portal state: `activeTab` with values `MAP`, `SIMULATOR`, `DASHBOARD`
  (`OPENVINO` and `AUDIT` opened modals).
- Modern shell state: `activeNav` with 21 values (`MAP`, `REPORTS`, `ANALYTICS`,
  `SIMULATION`, `DASHBOARD`, `ENGINEERING`, `SPK_ORDERS`, `ROAD_HISTORY`,
  `TECHNICAL_REFERENCE`, `ALERTS`, six `MONITORING_*` / `TINDAKAN_*` values, ...) plus
  `policyNavTab` for the policy workspace. Five of the 21 values were never assigned by
  any code path (`BERANDA_OPERASI`, `PETA_POS_WIM`, `WEATHER_FLOOD`, `TRAFFIC_ENG`, `SETTINGS`).
- Consequences: no deep links, no refresh persistence, no browser back/forward.

There were no React contexts, custom hooks, state stores, `localStorage`,
`sessionStorage`, cookies or IndexedDB usage anywhere.

## 4. Roles, accounts and permissions

Five role identifiers in `src/types.ts`: `FIELD_ENGINEER`, `OPERATIONS_MANAGER`,
`POLICY_MAKER`, `PUBLIC_REPORTER`, `PUBLIC_VIEWER`.

Eight demo accounts in `src/data/userAccounts.ts`:

| Account | Role | Shell | Clearance |
|---|---|---|---|
| USR-001 | FIELD_ENGINEER | classic portal | Level 3 |
| USR-006 | FIELD_ENGINEER | modern app | Level 3 |
| USR-002 | OPERATIONS_MANAGER | classic portal | Level 2 |
| USR-008 | OPERATIONS_MANAGER | modern app | Level 2 |
| USR-003 | POLICY_MAKER | classic portal | Level 1 |
| USR-007 | POLICY_MAKER | modern app | Level 1 |
| USR-004 | PUBLIC_REPORTER | modern app (default identity on load) | Level 4 |
| USR-005 | PUBLIC_VIEWER | modern app | Level 5 |

- `allowedScopes` and `restrictedScopes` are **display strings** shown in the login
  dialog. No code evaluates them.
- "Login" is an account picker. The password field is pre-filled and never checked.
- Real gating was only: which sidebar entries each role sees, a `useEffect` that reset
  the modern shell's view when the account changed, and one in-component check
  (only `PUBLIC_REPORTER` sees the edit-report button).
- The backend had no authentication or authorization.

## 5. Dependency map at baseline

- `App.tsx` imported 12 components, 3 data modules, `pinnEngine` and `types`.
- `PublicUserLayout.tsx` imported 14 components plus `pinnEngine`, `pdfGenerator`, `i18n`.
- `server.ts` imported `src/data/indonesianRoads`, `src/utils/pinnEngine`, `src/types`
  (the engine and dataset are shared by browser and server).
- `pinnEngine.ts` depended only on `types.ts` (pure, no React, no DOM).
- `LeafletMap.tsx` (a shared map component) imported feature UI (`ReportDetailModal`)
  and `userAccounts` — an upward dependency that still exists.
- `RoleHeaderBanner.tsx` was imported by nothing (dead code).

## 6. Backend and persistence

Six HTTP endpoints, all defined inline in `server.ts` (full contracts in
`docs/api/API_INVENTORY.md`). Unknown `/api/*` paths fall through to the SPA and
return the HTML shell with status 200.

**Persistence: none.** There is no database, ORM, migration, or file write. Road
segments are a TypeScript array; community reports and the audit trail live in React
state and reset on refresh.

## 7. Model, AI and hardware integration inventory

| Capability | What the code actually does | Status |
|---|---|---|
| PINN engine (`pinnEngine.ts`) | One pure function of closed-form formulas with fixed coefficients. No network weights, no training loop, no PDE residual. | IMPLEMENTED as a deterministic surrogate; a trained PINN is PLANNED |
| Physics-loss and data-loss values | `0.0018 + random` and `0.0011 + random` | SIMULATED |
| OpenVINO inference telemetry | Per-device lookup constants with random jitter | SIMULATED |
| Hardware detection (`deviceDetector.ts`) | Reads `navigator` and the WebGL renderer string, then recommends a target. NPU presence is inferred heuristically (WebNN present, or an Intel renderer with 12 or more cores). | IMPLEMENTED as detection heuristics; proves nothing about OpenVINO execution |
| Local OpenVINO benchmark | Times a JavaScript `tanh` loop and blends it with lookup constants | SIMULATED |
| OpenVINO IR / config export | Hand-written XML with a custom op and a JSON template; no weights file | SIMULATED |
| Computer vision classification | Keyword match on the image URL or file name, default `pothole`; confidence and box come from the taxonomy table | SIMULATED |
| Bina Marga WIM scraper and PINN training | Generates random records locally; no HTTP request is made | SIMULATED |
| Gemini narrative | Real `@google/genai` call when `GEMINI_API_KEY` is set, otherwise a rule-engine template | IMPLEMENTED with offline fallback |

No model artifact (`.onnx`, `.xml` + `.bin`, `.pt`, `.tflite`) and no dataset file exists in the repository.

## 8. Commands and baseline results

| Check | Command | Baseline result |
|---|---|---|
| Typecheck / lint | `npm run lint` (runs `tsc --noEmit`) | PASS, exit 0, no diagnostics |
| Production build | `npm run build` | PASS, exit 0. `index-*.js` 2,140.60 kB, CSS 160.37 kB, `server.cjs` 41.0 kB. Vite warns about the single large chunk. |
| Tests | none defined | NOT TESTED (no test script, no test files) |
| Dev server | `npm run dev` | already running on port 3000 during the audit; all six endpoints answered |
| Browser smoke | public map | PASS: map with 24 tiles and 31 markers, five sidebar entries |

Baseline API responses and a 76-scenario PINN snapshot were captured before the
restructure and are asserted by the test suite (see the validation reports).

## 9. Uncommitted user changes at baseline (all preserved)

Seven tracked files had uncommitted edits. They were carried through the moves intact:

- `LeafletMap`, `NationalRoadHealthMap`, `OperationsHomeView`, `OperationsPosWimMapView`,
  `StrategicPolicyMapView`: tile layers switched from CARTO to OpenStreetMap and Esri.
- `userAccounts.ts`: new avatar URLs (file also gained a byte-order mark).
- `main.tsx`: added `import 'leaflet/dist/leaflet.css'`.

## 10. Risks, technical debt and defects found at baseline

Defects that existed before the restructure:

1. **Dead buttons in the modern shell.** The login, OpenVINO-diagnostics and audit
   modals were mounted only in the classic branch of `App.tsx`. In the modern shell
   "Switch User Account", "Keluar" and "Detail Arsitektur" changed state but showed
   nothing. Verified in the browser. *Fixed by the restructure.*
2. **Production server could not serve its own bundle.** `express.static(dist)` was
   mounted at `/` while the bundle requests `/PavementPinn/assets/...`, so asset
   requests received the HTML fallback. Found by inspection (could not be run at
   baseline because port 3000 was occupied). *Fixed by the restructure.*
3. **Map popup "run simulation" did nothing visible in the modern shell** (it selected
   the segment and set the classic tab state). *Now opens the simulator.*
4. **Stale upvote count in the report detail panel.** The panel renders a snapshot of
   the report that is not refreshed after an upvote. *Still present.*
5. **Intermittent map crash.** One page load in an unsized browser pane threw
   `Invalid LatLng object: (NaN, NaN)` from a `flyTo` effect in `LeafletMap`, and with
   no error boundary the whole app unmounted. Not reproduced once the viewport had a
   size. *Still present.*
6. Unknown `/api/*` paths return the SPA HTML with status 200. *Unchanged.*
7. `POST /api/simulate` performs no validation; a missing body field returns HTTP 500
   and missing numbers come back as `null`. *Unchanged (contract preserved).*

Technical debt and unverified capabilities:

- **`@types/react` and `@types/react-dom` are not installed.** `React.FC` therefore
  resolves to `any`, component props are unchecked, and `tsc` passes even where JSX
  reads properties that do not exist on the type. The typecheck is a real gate only
  for non-JSX code and for undefined identifiers.
- `dotenv` is a dependency but is never imported; `.env` files are not loaded.
- `deploy.yml` passes `VITE_GEMINI_API_KEY` to the build. No code reads it, so it is
  not in the bundle today, but any future `import.meta.env.VITE_GEMINI_API_KEY` would
  publish the key.
- `package.json` name is still the template name `react-example`; `bun.lock` is empty.
- Single 2.1 MB JavaScript chunk; no code splitting.
- Several components exceed 1,200 lines; tile-layer URLs are duplicated in five files.
- A console error `path attribute d: Expected number` is logged repeatedly by a map
  marker icon.
- No ground-truth data exists to validate the engine's coefficients, so numerical
  agreement with field measurements is unverified.
