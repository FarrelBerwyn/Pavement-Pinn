# Dependency Map

Describes the code as it is after the restructure. The rules in section 2 are enforced
by `tests/unit/module-boundaries.test.ts` (10 static checks over every import).

## 1. Final directory tree (actual files)

```text
pavement-pinn/
  index.html  package.json  tsconfig.json  vite.config.ts  .env.example
  .github/workflows/deploy.yml
  server/
    index.ts                      process entry: config, app, frontend host, listen
    app.ts                        createApp(): express.json() then the API router
    config/env.ts                 PORT, NODE_ENV, VITE_BASE_PATH
    routes/                       index.ts plus one file per resource: health, roads, pinn, openvino, narrative
    controllers/                  health, roads, simulation, openvino, narrative
    services/                     simulationService, openvinoExportService, narrativeService
    repositories/roadSegmentRepository.ts   read-only access to the static dataset
    integrations/gemini/geminiClient.ts  lazy Gemini client
    middleware/frontendHost.ts    Vite dev middleware or static dist + SPA fallback
  src/
    main.tsx                      browser entry
    app/
      App.tsx                     providers + shell host + route outlet
      router.tsx                  History-API router, Link
      routeConfig.ts              typed route table, matching, base-path helpers
      navigation.ts               route to shell-view bindings, landing rules
      pageRegistry.tsx            route id to page component
      pageContext.tsx             what a page reads (session, app state, navigation)
      guards/routeAccess.ts       access decisions, home and landing routes
      providers/                  SessionProvider, AppStateProvider, GlobalModalsProvider
      layouts/                    ModernAppLayout, ClassicPortalLayout, Navbar
    pages/
      dashboard/AnalyticsPage     login/LoginPage        settings/SettingsPage
      reports/ReportsPage         roads/RoadDetailPage   not-found/NotFoundPage
      engine/                     EnginePage, PinnPage, SimulationPage,
                                  FwdPage, PredictionPage
      computer-vision/             ComputerVisionPage, DamageDetectionPage, InspectionHistoryPage
      engineering/                EngineeringPage, WorkOrdersPage, TechnicalReferencePage
      operations/OperationsPage   policy/PolicyPage
    features/
      authentication/             LoginModal, demoAccounts
      rbac/                       accessPolicy, RoleHeaderBanner (unused component)
      community-reports/          CommunityReportsDashboard, ReportDetailModal,
                                  ReportDetailBottomSheet, ReportRoadIssueCard
      road-health/                NationalRoadHealthMap, RoadHistoryView, nationalRoadHealthData
      policy-analysis/            ExecutivePolicyDashboard, ExecutivePolicyView,
                                  StrategicPolicyMapView, StrategicPolicyDrawers,
                                  SegmentHealthProfileCard, policyMapData
      wim/                        OperationsHomeView, OperationsManagerAppView,
                                  OperationsManagerDashboard, OperationsPosWimMapView,
                                  BinaMargaWimPipelineModal
      fwd/                        FieldEngineerDashboard, FieldEngineerTools
      engineering-dashboard/      PavementPinnDashboard
      work-orders/                MyTasksView
      technical-reference/        TechnicalReferenceView
      openvino-diagnostics/       OpenVINOModelDiagnosticsModal
      audit-trail/                AuditTrailModal
    engines/
      pinn/core/pinnEngine.ts
      computer-vision/classification/cvDamageClasses.ts
    runtime/
      intel-hardware/deviceDetector.ts
      openvino/simulatedBenchmark.ts
    services/
      api/                        client, endpoints
      wim/binaMargaWimScraper.ts
      reporting/pdfGenerator.ts
    components/
      maps/LeafletMap.tsx         simulation-viewer/SimulationPanel.tsx   ui/PageOverlay.tsx
    data/
      reference/indonesianRoads.ts
      mock/communityReports.ts    mock/auditLogs.ts
    types/                        index (barrel), rbac, road, runtime, reports, simulation, audit, api
    constants/deployment.ts       base path shared by Vite, server and router
    i18n/translations.ts          styles/index.css          assets/pavement-pinn-logo.jpg
  tests/
    unit/                         module-boundaries, routes, rbac
    integration/api.test.ts
    physics-validation/           pinn-regression.test.ts, pinnScenarios.ts, fixtures/pinn-golden.json
  scripts/capture-pinn-baseline.ts
  docs/                           architecture/, api/, validation/
```

### Directories from the target architecture that were deliberately NOT created

Creating them would have meant empty folders or invented functionality.

| Directory | Reason |
|---|---|
| `server/database/`, `server/jobs/` | there is no database and no background job |
| `models/`, `datasets/` | the repository contains no model artifact and no dataset file |
| `engines/prediction/`, `engines/rule-engine/` | PCI projection and the threshold rules are inside the single `runPinnSimulation` function; splitting it would risk numerical drift for no functional gain |
| `engines/pinn/` `inference`, `training`, `validation`, `calibration` | none of these exist in code |
| `engines/computer-vision/` `detection`, `preprocessing`, `postprocessing`, `inference` | only a taxonomy and a keyword heuristic exist |
| `services/weather/`, `services/geospatial/`, `features/weather/`, `features/pci/`, `features/road-structure/` | no code owns these concerns separately |
| `components/charts/`, `components/data-tables/`, `hooks/`, `public/` | no shared module of that kind exists yet |
| `tests/e2e/`, `tests/performance/` | no browser-automation or benchmark framework is installed (browser checks were run manually; see the test report) |

## 2. Dependency rules

Frontend direction: `app` (shells, router) and `pages` on top, then `features` and
`components`, then `services`, `engines`, `runtime`, `data`, and `types` at the bottom.

Backend direction: `routes` to `controllers` to `services` to `repositories` and `integrations`.

Enforced rules:

1. Every relative import resolves to a file.
2. `engines/` and `runtime/` import no React, no UI library, and nothing from
   `components`, `features`, `pages` or `app`.
3. `engines/` import only `types` (and other engine modules).
4. `types/` import only `types/`.
5. Frontend code never imports `server/`, Node built-ins, `express`, `dotenv` or `@google/genai`.
6. `server/` may import from `src/` only the isomorphic shared kernel:
   `src/types`, `src/engines`, `src/data/reference`, `src/constants`.
7. `server/` never imports React or browser UI libraries.
8. `features`, `components`, `services`, `engines`, `runtime`, `data`, `types`, `i18n`
   never import `pages/` or `app/`.
9. No circular imports between source files (type-only imports excluded).
10. The pre-restructure paths no longer exist (single source of truth).

### Known exceptions and coupling that remains

- `app/layouts/ModernAppLayout.tsx` imports four workspace pages (`PolicyPage`,
  `OperationsPage`, `EngineeringPage`, `WorkOrdersPage`), and pages import
  `app/pageContext`. The shell hosts the pages, so `app` and `pages` reference each
  other at directory level; there is no file-level cycle (rule 9 passes).
- `components/maps/LeafletMap.tsx` imports `features/community-reports/ReportDetailModal`
  and `features/authentication/demoAccounts`. This upward dependency is pre-existing.
- `ModernAppLayout.tsx` (2,850 lines, down from 3,357) still contains the public map
  workspace: the map, its floating cards, the report-detail panel and the mobile
  navigation share about forty pieces of local state, so extracting them was judged
  too risky for a zero-regression refactor.
- `src/types/api.ts` holds one runtime constant (`API_PATHS`) besides types, so that
  server and client share the endpoint paths.

## 3. Module ownership

| Module | Owns | Used by |
|---|---|---|
| `engines/pinn/core` | all pavement-response, PCI and rule-engine calculations | simulation panel, policy views, work orders, providers, server |
| `engines/computer-vision/classification` | damage taxonomy and the simulated classifier | report card, computer-vision pages |
| `runtime/intel-hardware` | browser hardware detection | simulation panel, OpenVINO diagnostics |
| `runtime/openvino` | the simulated benchmark | OpenVINO diagnostics |
| `services/api` | browser calls to the Express API | simulation panel, OpenVINO diagnostics |
| `services/reporting` | PDF generation (jsPDF) | dashboards, simulation panel, policy and work-order views |
| `services/wim` | simulated Bina Marga WIM pipeline | WIM pipeline modal |
| `data/reference` | road segments and WIM station list | providers, map, reports, server |
| `data/mock` | seed community reports and seed audit entries | AppStateProvider |
| `features/authentication` | demo accounts and the login dialog | session, shells, most features |
| `features/rbac` | role groups, access evaluation, action matrix | route guards |
| `app/providers` | session, shared app state, global modals | shells and pages |

## 4. Shared kernel between browser and server

The Express server reuses frontend-owned modules instead of duplicating them:
`runPinnSimulation`, `INDONESIAN_ROAD_SEGMENTS`, the type contracts in `src/types`
(including `API_PATHS`), and `normalizeBasePath`. All of them are free of browser
globals, so the same code runs under Node and is bundled into `dist/server.cjs` by esbuild.

## 5. Migration table (old path to new path)

Moves were done with `git mv`, so history follows each file. Apart from import lines
the moved files are byte-identical, except where a row says otherwise.

| Old path | New path | Notes |
|---|---|---|
| `server.ts` | `server/index.ts` and the modules listed in section 1 | split into app, routes, controllers, services, repository, integration, middleware |
| `src/App.tsx` | `src/app/App.tsx` | rewritten as providers plus shell host; state moved to `app/providers`, classic markup to `ClassicPortalLayout` |
| `src/index.css` | `src/styles/index.css` | |
| `src/types.ts` | `src/types/index.ts` | barrel re-exporting `rbac`, `road`, `runtime`, `reports`, `simulation`, `audit`, `api`; every existing import of `types` still works |
| `src/utils/pinnEngine.ts` | `src/engines/pinn/core/pinnEngine.ts` | |
| `src/utils/deviceDetector.ts` | `src/runtime/intel-hardware/deviceDetector.ts` | `runLocalOpenVINOBenchmark` moved to `src/runtime/openvino/simulatedBenchmark.ts` |
| `src/utils/pdfGenerator.ts` | `src/services/reporting/pdfGenerator.ts` | |
| `src/utils/i18n.ts` | `src/i18n/translations.ts` | |
| `src/services/binaMargaWimScraper.ts` | `src/services/wim/binaMargaWimScraper.ts` | |
| `src/data/userAccounts.ts` | `src/features/authentication/demoAccounts.ts` | exports `USER_ACCOUNTS` and `UserAccount` unchanged |
| `src/data/indonesianRoads.ts` | `src/data/reference/indonesianRoads.ts` | |
| `src/data/communityReports.ts` | `src/data/mock/communityReports.ts` | |
| `src/data/nationalRoadHealthData.ts` | `src/features/road-health/nationalRoadHealthData.ts` | |
| `src/data/policyMapData.ts` | `src/features/policy-analysis/policyMapData.ts` | |
| `src/data/cvDamageClasses.ts` | `src/engines/computer-vision/classification/cvDamageClasses.ts` | |
| `components/PublicUserLayout.tsx` | `src/app/layouts/ModernAppLayout.tsx` | component renamed `ModernAppLayout`; overlays and workspace branches extracted to `src/pages` |
| `components/Navbar.tsx` | `src/app/layouts/Navbar.tsx` | |
| `components/LeafletMap.tsx` | `src/components/maps/LeafletMap.tsx` | |
| `components/SimulationPanel.tsx` | `src/components/simulation-viewer/SimulationPanel.tsx` | inline `fetch` replaced by `services/api/endpoints` |
| `components/LoginModal.tsx` | `src/features/authentication/LoginModal.tsx` | |
| `components/RoleHeaderBanner.tsx` | `src/features/rbac/RoleHeaderBanner.tsx` | still unused |
| `components/AuditTrailModal.tsx` | `src/features/audit-trail/AuditTrailModal.tsx` | |
| `components/OpenVINOModelDiagnosticsModal.tsx` | `src/features/openvino-diagnostics/OpenVINOModelDiagnosticsModal.tsx` | export links built by `services/api/endpoints` |
| `components/BinaMargaWimPipelineModal.tsx` | `src/features/wim/BinaMargaWimPipelineModal.tsx` | |
| `components/Operations{HomeView,ManagerAppView,ManagerDashboard,PosWimMapView}.tsx` | `src/features/wim/` | |
| `components/{CommunityReportsDashboard,ReportDetailModal,ReportDetailBottomSheet,ReportRoadIssueCard}.tsx` | `src/features/community-reports/` | |
| `components/{ExecutivePolicyDashboard,ExecutivePolicyView,StrategicPolicyMapView,StrategicPolicyDrawers,SegmentHealthProfileCard}.tsx` | `src/features/policy-analysis/` | |
| `components/{NationalRoadHealthMap,RoadHistoryView}.tsx` | `src/features/road-health/` | |
| `components/{FieldEngineerDashboard,FieldEngineerTools}.tsx` | `src/features/fwd/` | |
| `components/PavementPinnDashboard.tsx` | `src/features/engineering-dashboard/PavementPinnDashboard.tsx` | |
| `components/MyTasksView.tsx` | `src/features/work-orders/MyTasksView.tsx` | |
| `components/TechnicalReferenceView.tsx` | `src/features/technical-reference/TechnicalReferenceView.tsx` | |

(`components/` above is short for `src/components/`.)

Totals: 44 files moved, 122 import specifiers rewritten in 40 files. A comparison
against the checkpoint showed 120 lines added and 120 removed across all moved files
at that stage, that is, import lines only.

### Compatibility adapters

None are needed and none were left behind: every consumer was updated in the same
change, and the old paths no longer exist. The `src/types` barrel is a permanent
public surface, not a temporary shim.

## 6. Configuration touched

| File | Change |
|---|---|
| `package.json` | `dev` and `build` point at `server/index.ts`; new `test` script (`tsx --test`, Node's built-in runner, no new dependency) |
| `vite.config.ts` | `base` from `normalizeBasePath(VITE_BASE_PATH)` (same default); build plugin that emits `404.html` |
| `.env.example` | documents `PORT` and `VITE_BASE_PATH` |
| `tsconfig.json`, `index.html`, `.github/workflows/deploy.yml`, `metadata.json`, `.gitignore` | unchanged |

No runtime dependency was added or removed.
