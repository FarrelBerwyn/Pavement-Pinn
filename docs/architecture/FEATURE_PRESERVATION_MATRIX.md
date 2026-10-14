# Feature Preservation Matrix

Inventory of every capability that existed before the restructure, with its state afterwards.

## How to read the status

| Label | Meaning |
|---|---|
| PASS | exercised after the restructure and behaved as before (evidence column says how) |
| NOT TESTED | not exercised. The component was moved with only its import lines changed, and it typechecks and builds, but nobody clicked it |
| SIMULATED | works, but the capability itself is simulated (it was before as well) |
| FIXED | was broken at baseline and works now |
| KNOWN DEFECT | broken or flawed at baseline and still so |

Evidence codes: **B** = checked in a real browser session against the running app;
**T** = automated test in `tests/`; **C** = compiles and builds, source body unchanged.

A PASS based on **C** alone is never claimed: those rows are marked NOT TESTED.

## 1. Application shell and navigation

| Capability | Status | Evidence |
|---|---|---|
| Modern app shell (sidebar, header, map workspace) | PASS | B: same sidebar entries per role as recorded at baseline |
| Classic portal shell (navbar, map, floating panels) | PASS | B: three classic accounts, three tabs each |
| Switching between classic portal and modern app by account | PASS | B: USR-001, 002, 003 render the classic navbar; USR-004 to 008 the modern sidebar |
| Sidebar and tab navigation | PASS | B: every sidebar entry of all five roles; URL now follows the view |
| Account switcher dropdown in the header | PASS | B: engineer to operations to policy |
| Login dialog (account picker) | PASS | B: seven logins through it |
| Login dialog reachable from the modern shell | FIXED | B: "Switch User Account" and "Keluar" now open it |
| Light and dark theme toggle | PASS | B: header switches between dark and white styling and back |
| Language switch (Indonesian and English) | PASS | B: sidebar labels change and restore |
| Notifications panel, profile drawer, activity feed, quick search, sidebar collapse | NOT TESTED | C |
| Mobile layout (bottom navigation, bottom sheet gestures) | NOT TESTED | C: only desktop width 1366 by 768 was exercised |
| Deep links, refresh, back and forward | PASS (new capability) | B and T |

## 2. Geospatial

| Capability | Status | Evidence |
|---|---|---|
| Leaflet map with road segments and report markers | PASS | B: 24 tiles, 31 markers |
| OpenStreetMap light layer | PASS | B: tiles from tile.openstreetmap.org |
| Esri satellite layer | PASS | B: tiles from World_Imagery |
| Esri dark layer | PASS | B: tiles from World_Dark_Gray_Base |
| Severity filters | PASS | B: 31 markers for all, 21 for critical |
| Heatmap | PASS | B: heat canvas layer present |
| Marker click opens the report detail panel | PASS | B |
| Operations WIM map (`OperationsPosWimMapView`) | PASS | B: renders at `/dashboard/` for the operations manager |
| Policy strategic map (`StrategicPolicyMapView`) | PASS | B: renders as the default policy tab |
| National road-health map (`NationalRoadHealthMap`) | NOT TESTED | C: lives inside a policy tab that was opened, but the map itself was not inspected |
| Road selection from the map, recenter, map diagnostics | NOT TESTED | C |
| Heatmap density clusters (custom grouping of reports within about 4 km, in `LeafletMap`) | NOT TESTED | C: the heat layer was seen, the cluster pins were not inspected. No marker-cluster plugin is used |

## 3. PINN and engineering

| Capability | Status | Evidence |
|---|---|---|
| Simulation engine numerical behaviour | PASS | T: 76 scenarios identical to the pre-restructure snapshot |
| Multilayer response formulas, Fourth Power Law, environmental adjustments | PASS | T |
| FWD deflection basin | PASS | T: seven offsets, monotonic decay |
| PCI prediction and five-year projection | PASS | T |
| Rule-engine alerts (status, WIM action, speed limit, overlay) | PASS | T: threshold tests |
| Simulation panel (inputs, run, results) | PASS | B: run completed, narrative shown |
| Simulation panel in the classic portal | PASS | B |
| Field engineer dashboard (modern, `PavementPinnDashboard`) | PASS | B: renders with its sections |
| Field engineer dashboard (classic, `FieldEngineerDashboard`) | PASS | B: renders |
| FWD and overlay tools (`FieldEngineerTools`) | PASS | B: renders at `/engine/fwd/`; individual calculators NOT TESTED |
| Tasks and work orders (`MyTasksView`) | PASS | B: renders for engineer and operations manager; SPK actions NOT TESTED |
| PCI trend and treatment history (`RoadHistoryView`) | PASS | B: renders; data is sample records (SIMULATED) |
| Technical reference | PASS | B: renders |
| Strain and stress charts inside the dashboards | NOT TESTED | C |

## 4. Operations

| Capability | Status | Evidence |
|---|---|---|
| Operations home | PASS | B |
| Monitoring views (road condition, WIM posts, ODOL, weather) | PASS | B: each sidebar entry renders its view and URL |
| Traffic-engineering and warnings views | PASS | B |
| Classic operations dashboard, including the ODOL alert banner | PASS | B: alert text computed from the simulation result |
| WIM events and vehicle classifications | SIMULATED | data is generated or static; rendering B |
| BATM and ETLE enforcement workflows | NOT TESTED | C: the views render, the action buttons were not pressed |
| Bina Marga WIM pipeline modal | SIMULATED | B: opens from the classic navbar and from `/engine/pinn/`; pipeline run NOT TESTED |

## 5. Community reports

| Capability | Status | Evidence |
|---|---|---|
| Reports dashboard | PASS | B: `/reports/` in both shells |
| Report creation with photo upload and analysis step | PASS | B: a synthetic test image went through upload, analysis and submit; the report appeared in the list (15 to 16) |
| Damage classification | SIMULATED | B: result "Pothole 94%" came from the keyword heuristic and taxonomy table |
| Report detail panel with before and after view | PASS | B: opens from a marker; the comparison slider was not dragged |
| Edit button only for `PUBLIC_REPORTER` | PASS | B: visible for USR-004 |
| Upvote | KNOWN DEFECT | B: the click reaches the shared state, but the open detail panel shows a stale count (snapshot not refreshed). Pre-existing |
| Edit report form, reviews and comments, share, copy location | NOT TESTED | C |
| Device camera capture | NOT TESTED | needs camera permission; only the upload path was exercised |
| Geolocation | NOT TESTED | needs location permission; the flow fell back to default coordinates |
| Repair status tracking | NOT TESTED | C |

## 6. Policy

| Capability | Status | Evidence |
|---|---|---|
| Executive summary, strategic map, budget, priority programme tabs | PASS | B: each tab renders its heading |
| Classic policy dashboard | PASS | B |
| Fiscal projections and PCI projections | PASS | T for the engine values; rendering B |
| Executive brief and policy document generation, scenario simulator | NOT TESTED | C |
| Policy PDF export from the header button | NOT TESTED | C: same generator as the verified simulation PDF |

## 7. Reporting and diagnostics

| Capability | Status | Evidence |
|---|---|---|
| PDF export from the simulation panel | PASS | B: a 16,835-byte `application/pdf` blob was produced (the download itself was suppressed in the test) |
| PDF export from the other dashboards | NOT TESTED | C: same `generateOfficialReportPdf` function |
| Audit trail modal | PASS | B: opened from the classic navbar and showed three entries appended at runtime |
| Audit trail reachable from the modern shell | FIXED | B: button on `/engine/pinn/` |
| OpenVINO diagnostics modal | PASS | B: opens in both shells; download links point at the two export endpoints |
| OpenVINO diagnostics from the modern shell | FIXED | B: "Detail Arsitektur" in the simulation panel now opens it |
| OpenVINO benchmark button | NOT TESTED | C; the benchmark is SIMULATED |
| OpenVINO export downloads | PASS | T: both endpoints byte-identical to baseline; the browser download was not triggered |
| AI narrative (Gemini with rule-engine fallback) | PASS | B: `POST /api/generate-narrative` returned 200 and the text was shown. T: offline and failure paths. A real Gemini response was NOT TESTED (the configured key is rejected by Google as invalid) |

## 8. Backend

| Capability | Status | Evidence |
|---|---|---|
| Six API endpoints, same paths and payloads | PASS | T: 17 contract tests, three responses compared by hash |
| Dev workflow (`npm run dev`, Vite middleware) | PASS | B on port 3100 |
| Production server (`npm start`) | FIXED | B on port 3200: assets now load under the base path |
| Static build for GitHub Pages | PASS | B against a local static-host simulator |

## 9. Behaviour changes introduced on purpose

Everything else was intended to stay identical. These are the deliberate differences:

1. The URL now reflects the current view, and views can be opened by URL.
2. The demo identity survives a refresh within the tab (`sessionStorage`).
3. Login, OpenVINO-diagnostics and audit modals work from the modern shell (they were dead buttons).
4. The map popup "run simulation" opens the simulator in the modern shell as well.
5. Protected views opened without the right role show a login redirect or a 403 page
   instead of silently resetting to the map.
6. New pages: engine hub, PINN overview, three computer-vision pages, road detail,
   not-found and forbidden pages.
7. `PORT` and `VITE_BASE_PATH` are configurable (defaults unchanged).
8. The production server also serves the build under the base path.
9. In the classic portal, opening a standalone page (for example login) keeps the
   previous tab underneath; routes that never existed there show an explanatory page.

## 10. Summary

- Every capability found in the audit is still present; none was replaced by a placeholder.
- 73 rows in 8 groups: 50 PASS, 4 FIXED, 3 SIMULATED, 1 KNOWN DEFECT, 15 NOT TESTED.
- The NOT TESTED rows are real gaps in verification, not known failures. They share one
  property: the source body is unchanged apart from import lines.
- No row is FAIL. One row is a KNOWN DEFECT that predates the restructure.
