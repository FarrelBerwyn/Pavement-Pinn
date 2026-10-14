# Relocation Report

Date: 2026-10-14.

## 1. Decision: the project was not moved

| Item | Value |
|---|---|
| Source path | `D:\Farrel Folder\Programming\Intel AI Global Impact Festival 2026\Projects\pavement-pinn` |
| Destination path | the same path (unchanged) |
| Why | the owner's instruction after the inspection: the project stays where it is; what is tidied is the **content inside it**, so that it follows the target folder structure |
| Operation performed | in-place alignment of the remaining file names with the target structure (section 3). No directory relocation, no copy, nothing deleted outside Git-tracked renames |

Because nothing left the folder, there is no second copy to verify and no original to
clean up.

## 2. Inspection results (before any change)

| Check | Finding |
|---|---|
| Git root | the source path above |
| Branch / HEAD | `restructure/modular-architecture` at `20dcaed` |
| Local `main` / `origin/main` | `fffa344` / `a32ef56` (unrelated histories; see `validation/POST_RESTRUCTURE_HARDENING.md` section 12) |
| Backup refs | `refs/backup/pre-restructure` `477f549`, `refs/backup/post-restructure` `81f060f` |
| Uncommitted work | 3 modified and 2 new files from the PINN audit; all preserved |
| Stash, worktrees, submodules | none |
| Size | 295 MB, of which `node_modules` 286 MB, `.git` 3 MB |
| Environment files | `.env.example` only; no `.env` |
| Models, datasets, notebooks, virtual environments | none |
| Absolute references to the project path | none in project files or Git configuration |
| Processes using the folder | the owner's dev server on port 3000 (left running, not touched) |
| Path | 89 characters, contains spaces; Windows long-path support is off; longest path inside the repository is 116 characters, so the total stays under the 260-character limit |

Things noticed around the project that matter later:

- The parent folder holds six similarly named sibling repositories (`pavementpinn` and
  five `pavementpinn-*` variants) with separate histories. `pavementpinn-navigate` is at
  the commit that is `main` on GitHub. Working in the wrong folder is an easy mistake.
- Several of those sibling repositories keep a GitHub access token in clear text in
  their remote URL. They were not modified. The tokens should be revoked and replaced.

## 3. Target structure versus the repository

Most of the target structure was already in place from the restructure commit
`b2bd8dd`. The table lists every area of the target and its state now.

| Target | State | Note |
|---|---|---|
| `src/app/` `App.tsx`, `router.tsx`, `routeConfig.ts`, `providers/`, `guards/` | present | guards are pure functions in `guards/routeAccess.ts`, used by `App.tsx` |
| `src/app/layouts/` one layout per role | different | two shells exist (`ModernAppLayout`, `ClassicPortalLayout`), each serving several roles. Splitting them per role is a rewrite of a 2,850-line component, not a move |
| `src/pages/login`, `reports`, `roads`, `settings`, `not-found`, `engineering`, `operations`, `policy` | present | |
| `src/pages/engine/` `EnginePage`, `PinnPage`, `SimulationPage`, `FwdPage`, `PredictionPage` | **aligned now** | renamed from `EngineHubPage`, `EnginePinnPage`, `EngineSimulationPage`, `EngineFwdPage`, `EnginePredictionPage` |
| `src/pages/computer-vision/` `ComputerVisionPage`, `DamageDetectionPage`, `InspectionHistoryPage` | **aligned now** | the single `ComputerVisionPages.tsx` was split into the three files plus `components/SimulationNotice.tsx` |
| `src/pages/dashboard/DashboardPage.tsx` | not created | the public dashboard is still composed inside `ModernAppLayout`; extracting it is a refactor. `AnalyticsPage.tsx` lives here |
| `src/features/` authentication, rbac, road-health, wim, fwd, community-reports, policy-analysis, audit-trail | present | plus `engineering-dashboard`, `work-orders`, `technical-reference`, `openvino-diagnostics` for code the target list did not name |
| `src/features/` weather, road-structure, pci | not created | no code owns these concerns separately |
| `src/engines/pinn/core/pinnEngine.ts` | present | |
| `src/engines/pinn/core/` `physicsModels`, `burmister`, `damageModel`, `physicsLoss`; `inference`, `training`, `validation`, `calibration` | not created | none of this exists. The engine is one closed-form function; a file named `burmister.ts` would misdescribe it (see `validation/PINN_VALIDATION_GAP.md`) |
| `src/engines/computer-vision/classification/` | present | other sub-folders not created: only a taxonomy and a keyword heuristic exist |
| `src/runtime/intel-hardware/deviceDetector.ts` | present | |
| `src/runtime/openvino/` `model-loader`, `device-selector`, `quantization`, `benchmarks` | not created | no OpenVINO runtime is used; only `simulatedBenchmark.ts` exists (SIMULATED) |
| `src/services/api/` `client.ts`, `endpoints.ts` | **aligned now** | `narrativeApi.ts` and `openvinoExportApi.ts` merged into `endpoints.ts` |
| `src/services/wim`, `reporting` | present | `weather`, `geospatial` not created: no code |
| `src/components/` ui, maps, simulation-viewer | present | `charts`, `data-tables` not created: no shared module of that kind |
| `src/data/mock`, `reference` | present | `fixtures` not created |
| `src/types`, `constants`, `i18n`, `styles` | present | `utils`, `hooks` not created: nothing to put in them |
| `server/app.ts`, `index.ts`, `config/`, `controllers/`, `services/`, `repositories/` | present | |
| `server/routes/` one file per resource | **aligned now** | `health`, `roads`, `pinn`, `openvino`, `narrative` route files, composed by `index.ts` in the original order. `auth`, `computer-vision`, `wim`, `reports` routes not created: no such endpoints |
| `server/integrations/gemini/` | **aligned now** | `geminiClient.ts` moved into it. `bina-marga-wim/` not created: the WIM pipeline is a frontend simulation |
| `server/middleware/` authentication, authorization, validation, error-handler | not created | there is no authentication to wire; adding files would imply protection that does not exist. `frontendHost.ts` lives here |
| `server/database/`, `server/jobs/`, `server/tests/` | not created | no database, no jobs; API tests are in `tests/integration` |
| `models/`, `datasets/`, `public/` | not created | no model, dataset or public asset exists |
| `tests/` unit, integration, physics-validation | present | `e2e`, `performance` not created: no such tooling |
| `docs/` architecture, api, validation | present | `models`, `deployment` not created |
| API under `/api/v1/...` | not changed | the six endpoints keep their existing paths; versioning would change the API contract |

Folders marked "not created" follow the note in the target description itself: a
folder is created when its implementation exists.

## 4. What changed in this task

Pure renames, moves and splits. No logic, formula, threshold, role, route or API
contract changed.

| Change | Files |
|---|---|
| Engine page names | 5 files renamed (Git detects them as renames, 97 to 99 percent similar) |
| Computer-vision pages | 1 file split into 3 pages and 1 shared component |
| Frontend API clients | 2 files merged into `src/services/api/endpoints.ts` |
| Server routes | `routes/index.ts` now composes 5 new per-resource files |
| Gemini integration | moved to `server/integrations/gemini/` |
| Importers updated | `pageRegistry.tsx`, `SimulationPanel.tsx`, `OpenVINOModelDiagnosticsModal.tsx`, `narrativeController.ts` |
| Documents | names updated in `ROUTE_MAP`, `DEPENDENCY_MAP`, `API_INVENTORY`, `POST_RESTRUCTURE_HARDENING`; this report added |

Safety: before the change the complete working tree (including uncommitted files) was
recorded at `refs/backup/pre-structure-alignment` (`8a71740`). The earlier backup refs
are untouched. Nothing was committed, pushed or deployed.

## 5. Verification (actual results)

| Check | Result |
|---|---|
| `tsc --noEmit` (the `lint` script's command) | exit 0 |
| `npm test` | exit 0; 106 tests, 106 passed, 0 skipped |
| PINN golden regression (inside `npm test`) | 76 scenarios identical |
| `npm run build` | exit 0; 2,603 modules; `dist/404.html` present |
| Fresh dev server from this folder (`tsx server/index.ts`, port 3100) | started; all six endpoints answered as before (`/api/roads` 18,133 bytes, simulate PCI 10 and tensile strain 24 for the reference request); unknown API path 404 JSON |
| Browser, on that server | engine hub (4 cards), PINN overview (10 formulas), simulation panel, computer-vision hub (8 classes), detection page, history page, public dashboard (31 markers); no runtime error |
| Other roles, PDF export, report creation, mobile layout | NOT TESTED in this task (the files involved were not touched) |
| GitHub Pages | NOT TESTED (nothing deployed) |

Old names remaining in source, tests or documents: none.

## 6. Remaining blockers and observations

1. The work is uncommitted on `restructure/modular-architecture` (audit files from the
   previous task plus this alignment).
2. Local and remote histories are still unreconciled (hardening report, section 12).
3. Layout observation, not changed and not investigated further: at a window width of
   about 800 px the sidebar is drawn on top of the full-screen page overlays and hides
   their left edge. The older overlays (reports, simulation) use the same styling, so
   this predates this task. It needs a visual check at common widths.
4. A real relocation remains possible later. If one is wanted, a short path without
   spaces is advisable before Python or OpenVINO tooling is introduced;
   `D:\Developments\GITHUB\` already holds other repositories and has no project of
   this name.
5. Areas of the target structure that need real implementation rather than moves are
   listed in section 3 as "not created" or "different".
