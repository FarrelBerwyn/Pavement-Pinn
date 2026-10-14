# Route Map

Source of truth: `src/app/routeConfig.ts` (27 routes). This document mirrors that file;
`tests/unit/routes.test.ts` and `tests/unit/rbac.test.ts` fail if they drift apart.

## How routing works

- **Router:** `src/app/router.tsx`, a small in-house History-API router. The project had
  no router and the route table is static, so no routing dependency was added.
- **Base path:** every URL below is app-relative. The deployed URL is the base path plus
  the route, for example `/PavementPinn/engine/pinn/`. The base comes from
  `src/constants/deployment.ts` (default `/PavementPinn/`, override with `VITE_BASE_PATH`).
- **Canonical form:** trailing slash. `/engine/pinn` is rewritten to `/engine/pinn/`
  in place, keeping query string and hash.
- **Root:** `/` redirects to the signed-in identity's home (see below).
- **Unknown paths:** render the not-found page at the requested URL (no redirect).
- **History:** in-app navigation pushes entries; guard redirects replace the entry, so
  the back button never returns to a redirecting URL.

## Access rules

| Decision | When | Result |
|---|---|---|
| ALLOW | the role is in the route's access list | route renders |
| LOGIN_REQUIRED | a public role (`PUBLIC_REPORTER`, `PUBLIC_VIEWER`) opens a protected route | redirect to `/login/?next=...` |
| FORBIDDEN | an official role opens another role's route | "Akses dibatasi" page at the same URL |

Public routes never redirect to login. These are **frontend guards only**; see
`RBAC_MATRIX.md` for what they do and do not protect.

## Routes

`Kind` is `workspace` when the application shell renders the view itself, and `page`
when a component from `src/pages` is mounted in the shell's outlet.

### Public

| URL | Rendered by | Kind | Access |
|---|---|---|---|
| `/dashboard/` | modern shell map workspace in `app/layouts/ModernAppLayout.tsx`; classic portal map tab | workspace | PUBLIC |
| `/dashboard/analytics/` | `pages/dashboard/AnalyticsPage.tsx` | page | PUBLIC |
| `/login/` | `pages/login/LoginPage.tsx` (wraps `features/authentication/LoginModal`) | page | PUBLIC |
| `/roads/:roadId/` | `pages/roads/RoadDetailPage.tsx` | page | PUBLIC |
| `/reports/` | `pages/reports/ReportsPage.tsx` | page | PUBLIC |
| `/settings/` | `pages/settings/SettingsPage.tsx` | page | PUBLIC |

`/dashboard/` is the public road-health homepage. A signed-in operations manager sees
the WIM map there instead (unchanged behaviour: it was their "map" view).

`/roads/:roadId/` shows only public-safe fields: identity, PCI, condition, survey date,
traffic volume, whether a WIM station exists, and community reports. It does not show
WIM vehicle records (plates, per-truck weights) or engineering diagnostics. An unknown
`roadId` renders an inline "not found" state with links to the valid segments.

### Engine

| URL | Rendered by | Kind | Access |
|---|---|---|---|
| `/engine/` | `pages/engine/EngineHubPage.tsx` | page | PUBLIC |
| `/engine/pinn/` | `pages/engine/EnginePinnPage.tsx` | page | PUBLIC |
| `/engine/simulation/` | `pages/engine/EngineSimulationPage.tsx`; classic portal simulator tab | page | PUBLIC |
| `/engine/fwd/` | `pages/engine/EngineFwdPage.tsx` | page | FIELD_ENGINEER, OPERATIONS_MANAGER |
| `/engine/prediction/` | `pages/engine/EnginePredictionPage.tsx` | page | FIELD_ENGINEER, OPERATIONS_MANAGER |

The simulator is public because the public sidebar already offered it before the
restructure. Its inputs and outputs are synthetic; it exposes no private data.

### Computer Vision

| URL | Rendered by | Kind | Access |
|---|---|---|---|
| `/computer-vision/` | `ComputerVisionHubPage` in `pages/computer-vision/ComputerVisionPages.tsx` | page | PUBLIC |
| `/computer-vision/detection/` | `ComputerVisionDetectionPage` (launches the existing report card) | page | PUBLIC |
| `/computer-vision/history/` | `ComputerVisionHistoryPage` | page | PUBLIC |

All three pages state that classification is SIMULATED (no vision model runs).

### Stakeholder workspaces

| URL | Rendered by | Kind | Access |
|---|---|---|---|
| `/engineering/` | `pages/engineering/EngineeringPage.tsx`; classic portal dashboard tab | workspace | FIELD_ENGINEER |
| `/engineering/tasks/` | `pages/engineering/WorkOrdersPage.tsx` | workspace | FIELD_ENGINEER |
| `/engineering/reference/` | `pages/engineering/TechnicalReferencePage.tsx` | page | FIELD_ENGINEER, OPERATIONS_MANAGER |
| `/operations/` | `pages/operations/OperationsPage.tsx`; classic portal dashboard tab | workspace | OPERATIONS_MANAGER |
| `/operations/tasks/` | `pages/engineering/WorkOrdersPage.tsx` (shared) | workspace | OPERATIONS_MANAGER |
| `/operations/alerts/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/monitoring/road-condition/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/monitoring/wim/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/monitoring/odol/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/monitoring/weather/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/actions/traffic-engineering/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/operations/actions/alerts/` | `pages/operations/OperationsPage.tsx` | workspace | OPERATIONS_MANAGER |
| `/policy/` | `pages/policy/PolicyPage.tsx`; classic portal dashboard tab | workspace | POLICY_MAKER |

The four policy tabs (executive summary, strategic map, budget, priority programmes)
remain component state inside `/policy/`; they are not separate URLs.

### Not found and forbidden

`pages/not-found/NotFoundPage.tsx` exports `NotFoundPage` (unknown URL),
`ForbiddenPage` (role not allowed) and `ModernAppOnlyPage` (see below).

## Home and landing

| Identity | Home (target of `/`) |
|---|---|
| public roles | `/dashboard/` |
| modern-app officials | `/engineering/`, `/operations/` or `/policy/` |
| classic-portal officials | `/dashboard/` (the portal's default map tab) |

After switching account, the app stays on the current page when the new identity may
see it and otherwise goes home. For the modern shell this reproduces the original
rules exactly (`navAfterAccountSwitch` in `src/app/navigation.ts`), for example an
engineer on `/engineering/tasks/` who switches to the operations manager lands on
`/operations/tasks/`. From `/login/` the `next` parameter is used when the chosen
account is allowed to open it; only same-app paths are accepted.

## Shell bindings

The two shells keep their original view vocabulary; `src/app/navigation.ts` maps it to routes.

Classic portal tabs:

| Tab | URL |
|---|---|
| `MAP` | `/dashboard/` |
| `SIMULATOR` | `/engine/simulation/` |
| `DASHBOARD` | the role's workspace (`/engineering/`, `/operations/`, `/policy/`) |

With a classic-portal account, every other allowed route renders its page component
over the map. Routes that exist only in the modern shell (tasks, operations
monitoring, alerts) show `ModernAppOnlyPage`, because the classic portal never had
those views.

Modern shell view keys: each key that some code path assigns has exactly one URL
(`MAP` to `/dashboard/`, `REPORTS` to `/reports/`, `SIMULATION` to `/engine/simulation/`,
`ENGINEERING` to `/engine/fwd/`, `ROAD_HISTORY` to `/engine/prediction/`,
`TECHNICAL_REFERENCE` to `/engineering/reference/`, `ANALYTICS` to `/dashboard/analytics/`,
`DASHBOARD` and `SPK_ORDERS` to the role's own workspace, the `MONITORING_*`,
`TINDAKAN_*` and `ALERTS` keys to the `/operations/...` URLs).

## Compatibility redirects

`LEGACY_REDIRECTS` in `routeConfig.ts` (replace-style, query and hash preserved):

| Alias | Canonical |
|---|---|
| `/map/` | `/dashboard/` |
| `/simulation/` and `/simulator/` | `/engine/simulation/` |
| `/analytics/` | `/dashboard/analytics/` |
| `/cv/` | `/computer-vision/` |
| `/engineer/` | `/engineering/` |
| `/ops/` | `/operations/` |

No URL existed before the restructure, so these are conveniences, not migrations.

## Deep links and refresh by host

| Host | Mechanism | Verified |
|---|---|---|
| Dev server (`npm run dev`) | Vite `appType: 'spa'` fallback | PASS |
| Production Express (`npm start`) | static mount under the base path plus `index.html` fallback | PASS |
| GitHub Pages | `dist/404.html` (copy of `index.html`, emitted by the build) boots the SPA | PASS against a local static-host simulator; NOT TESTED on github.io itself |

On GitHub Pages a deep link is answered with HTTP status 404 and the application
shell as body. Browsers render it normally; crawlers and link checkers see a 404.
