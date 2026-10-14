# Restructure Test Report

Date: 2026-10-14. Baseline: commit `fffa344` plus seven uncommitted user edits
(checkpoint `refs/backup/pre-restructure`).

Status labels: PASS (directly verified), FAIL (verified failure), BLOCKED (could not
be verified because of a specific blocker), NOT TESTED (not executed), SIMULATED
(behaviour is simulated, not a live implementation), PLANNED (not implemented).

A PASS for compilation is never used as a PASS for end-to-end behaviour: static,
automated and browser results are reported separately.

## 1. Summary

| Area | Result |
|---|---|
| Typecheck (`npm run lint`) | PASS |
| Production build (`npm run build`) | PASS |
| Automated tests (`npm test`) | PASS, 61 of 61 |
| PINN numerical regression | PASS, 76 scenarios identical |
| API contract compatibility | PASS, 6 of 6 endpoints |
| Routing (16 required URLs plus unknown) | PASS in unit tests and in the browser |
| Role by route isolation | PASS in unit tests (135 combinations) and in the browser for 7 of the 8 accounts |
| Critical user journeys in the browser | 9 of 10 PASS, 1 BLOCKED (see section 6) |
| Static-host deep links (GitHub Pages behaviour) | PASS against a local simulator; NOT TESTED on github.io |
| Rollback procedure | PASS in a throwaway copy of the repository |
| Commits, pushes, deployments | none were made |

No FAIL results. Gaps are listed in section 8.

## 2. Environment

Windows 11, Node v24.16.0, npm 12.0.2, TypeScript 5.8.3, Vite 6.4.3.
The user's own dev server was running on port 3000 throughout and was left alone;
verification servers were started on ports 3100, 3200 and 3300 and stopped afterwards.

## 3. Static checks

| Check | Command | Before | After |
|---|---|---|---|
| Typecheck | `npm run lint` | exit 0 | exit 0, no diagnostics |
| Build | `npm run build` | exit 0 | exit 0 |
| Main JS chunk | | 2,140.60 kB (gzip 566.56) | 2,177.99 kB (gzip 577.47) |
| CSS | | 160.37 kB | 161.10 kB |
| Server bundle | | 41.0 kB | 44.1 kB |
| `dist/404.html` | | absent | present, identical to `index.html` |

The 37 kB growth is the router, providers, guards and the new pages.

Caveat on the typecheck: `@types/react` is not installed, so component props are
typed `any` and `tsc` cannot catch a wrong or missing prop. It does catch unresolved
imports and undefined identifiers, which is what mattered for the file moves. This
weakness predates the restructure and is why the browser checks below carry more weight.

No ESLint or other linter is configured; `lint` is the typecheck.

## 4. Automated tests

Runner: Node's built-in test runner through `tsx` (already a dev dependency). No test
framework was added. Command: `npm test`, which runs `tsx --test "tests/**/*.test.ts"`.

| Suite | Tests | Result | What it covers |
|---|---|---|---|
| `tests/physics-validation/pinn-regression.test.ts` | 14 | PASS | golden comparison of 76 scenarios, invariants, rule thresholds |
| `tests/unit/module-boundaries.test.ts` | 10 | PASS | import resolution, layering rules, no cycles, old paths gone |
| `tests/unit/routes.test.ts` | 10 | PASS | required URLs, canonical paths, no shadowing, base path, shell bindings |
| `tests/unit/rbac.test.ts` | 10 | PASS | role by route, role by action, accounts, landing rules, stale-permission sweep |
| `tests/integration/api.test.ts` | 17 | PASS | every endpoint against the real Express app on an ephemeral port |
| Total | 61 | PASS | duration under one second |

Notes:

- The API suite deletes `GEMINI_API_KEY` from its own process so that it never calls
  the real Gemini service; the failure path is covered with an injected failing client.
- Three API responses are compared with SHA-256 hashes recorded from the original server.
- Frontend components have no unit tests (no DOM test environment is installed).
  Their verification is the browser session in section 5.

Not present before and not added: computer-vision tests. The classifier is a keyword
heuristic; its taxonomy is exercised only through the browser flow.

## 5. Browser verification

Performed in a real browser against the running app, by driving the DOM and reading
the resulting URL and content. Viewport 1366 by 768. These are manual-style checks,
not a repeatable automated end-to-end suite.

### 5.1 Routing

| Check | Result |
|---|---|
| `/` redirects to `/dashboard/` for the public identity | PASS |
| Sidebar: Laporan, Analitik, Simulasi PINN, Pengaturan change the URL to `/reports/`, `/dashboard/analytics/`, `/engine/simulation/`, `/settings/` | PASS |
| "Back to Map" returns to `/dashboard/` | PASS |
| Browser back and forward across four entries | PASS |
| Full reload of `/engine/fwd` (no trailing slash) while signed in as engineer: URL canonicalised, view rendered, identity kept | PASS |
| Query string and hash preserved (`/roads/:id/?from=test#x`) | PASS |
| Unknown URL shows the not-found page at that URL | PASS |
| Unknown road id shows the inline not-found state | PASS |
| All required URLs render their view | PASS (each was opened at least once as an allowed role) |

### 5.2 Guards and identity

| Check | Result |
|---|---|
| Public identity opens `/engineering/`: redirected to `/login/?next=...`, no workspace content rendered | PASS |
| Login as modern field engineer from that page lands on `/engineering/` | PASS |
| Engineer opens `/policy/` and `/operations/monitoring/odol/`: forbidden page, no foreign content | PASS |
| Operations manager opens `/engineering/`: forbidden page | PASS |
| Account switch engineer to operations manager while on `/engineering/tasks/` lands on `/operations/tasks/` | PASS |
| Account switch public to policy maker lands on `/policy/` | PASS |
| Identity stored per tab and restored after reload | PASS |
| Closing the login dialog returns to the previous view | PASS |
| Engine hub shows restricted tools as locked for a public identity, linking to login with `next` | PASS |

### 5.3 Per role

| Identity | Verified |
|---|---|
| USR-004 public reporter | map with 31 markers, five sidebar entries (same as baseline), reports, analytics, simulator, settings, report creation, edit button present |
| USR-005 public viewer | same sidebar as baseline (recorded before the restructure; not re-opened afterwards) |
| USR-006 field engineer, modern | dashboard, map, tasks, simulator, PCI history, FWD tools, technical reference |
| USR-008 operations manager, modern | home, WIM map, four monitoring views, two action views, tasks, reports |
| USR-007 policy maker, modern | four policy tabs, "Keluar" opens the account switcher |
| USR-001 field engineer, classic | navbar, map, simulator tab, dashboard tab, three modals, deep links, modern-only notice, reports page, forbidden page |
| USR-002 operations manager, classic | dashboard tab with the ODOL alert banner |
| USR-003 policy maker, classic | dashboard tab |

### 5.4 Features

| Check | Result |
|---|---|
| Run a simulation; `POST /api/generate-narrative` answers 200; narrative shown | PASS |
| PDF export produces a 16,835-byte PDF blob (download suppressed) | PASS |
| OpenVINO diagnostics modal opens from the modern shell and the classic navbar | PASS |
| Audit trail modal shows entries appended at runtime | PASS |
| Bina Marga WIM pipeline modal opens | PASS |
| Report creation: synthetic image uploaded, analysis step, submit, success screen | PASS |
| New report appears in the detection history (0 of 15 became 1 of 16) | PASS |
| Language switch, theme toggle | PASS |
| Base map layers: OpenStreetMap, Esri satellite, Esri dark | PASS |
| Severity filter (31 to 21 markers) and heatmap layer | PASS |
| Marker click opens the report detail panel | PASS |
| Upvote count updates in the open detail panel | KNOWN DEFECT, pre-existing (stale snapshot) |
| Uncaught errors or React warnings in the console | none observed |

One console error is logged repeatedly, before and after: a map marker icon with an
invalid SVG path ("path attribute d: Expected number"). It is pre-existing and harmless.

### 5.5 Deployment shapes

| Host | Check | Result |
|---|---|---|
| Dev server, port 3100 | all six endpoints; deep links return the SPA | PASS |
| Production build, `node dist/server.cjs`, port 3200 | bundle served under `/PavementPinn/assets/`; deep link without trailing slash renders the road page; `/` redirects to the dashboard | PASS |
| Static host simulator, port 3300 (real files 200, everything else 404 with `404.html`) | deep link `/PavementPinn/engine/pinn/` boots and renders; protected deep link redirects to login keeping the query; `/PavementPinn/` redirects to the dashboard | PASS |
| GitHub Pages itself | | NOT TESTED (nothing was deployed) |

## 6. The ten critical journeys

| # | Journey | Result |
|---|---|---|
| 1 | Public visitor opens the dashboard without logging in | PASS |
| 2 | Public visitor views road-health information (map, analytics, road detail) | PASS |
| 3 | A reporter creates a community report | PASS |
| 4 | An engineer opens the technical dashboard and runs a simulation | PASS |
| 5 | An operations manager opens the WIM views | PASS |
| 6 | A policy maker opens policy analysis | PASS |
| 7 | PDF export | PASS for the simulation panel; other export buttons NOT TESTED |
| 8 | Deep links and refresh | PASS |
| 9 | Unauthorized users cannot access protected backend actions | BLOCKED: the backend has no protected actions and no authorization, so there is nothing to enforce. Frontend route guards PASS. |
| 10 | No critical console or runtime errors | PASS |

Journey 9 is not a regression: it reflects a capability that never existed. It is
recorded as BLOCKED rather than PASS because the requirement is not met.

## 7. Defects

Fixed as part of the restructure (each was verified broken at baseline or by inspection):

1. Login, OpenVINO-diagnostics and audit modals could not open from the modern shell.
2. `npm start` served HTML for the bundle's asset requests (wrong static mount for the base path).
3. Map popup "run simulation" did nothing visible in the modern shell.

Still present, pre-existing, not changed:

1. Stale upvote count in the report detail panel.
2. Intermittent `Invalid LatLng object: (NaN, NaN)` crash from a `flyTo` effect in
   `LeafletMap` when the map container has no size; no error boundary. Seen once at
   baseline, not reproduced afterwards.
3. Upvote state is shared between demo identities.
4. Unknown `/api/` paths answer with HTML and status 200.
5. No input validation on `POST /api/simulate`.
6. Missing `@types/react` (weak typecheck for components).

## 8. Not tested, and why

| Item | Reason |
|---|---|
| Mobile layout and touch gestures | only a desktop viewport was exercised |
| Device camera capture, geolocation | need device permissions |
| BATM and ETLE actions, SPK actions, overlay calculators, policy brief generation, scenario simulator | views render; the individual actions were not pressed |
| PDF export from dashboards other than the simulation panel | same generator; not pressed |
| OpenVINO benchmark button, WIM pipeline run | simulated features; not pressed |
| A real Gemini response | the configured API key is rejected by Google as invalid |
| Deployment on github.io | no deployment was performed |
| Performance and load | no benchmark tooling exists |
| Cross-browser | one Chromium-based browser only |
| Repeatable automated end-to-end suite | no browser-automation framework is installed; adding one was out of scope |

The components behind these items were moved with only their import lines changed.

## 9. Deployment status

- `.github/workflows/deploy.yml` is unchanged. It runs `npx vite build`, which now also
  emits `dist/404.html`, and publishes `dist/` to the `gh-pages` branch.
- Asset base path `/PavementPinn/` is unchanged by default.
- Status: **compatible by construction and verified locally; NOT TESTED in production.**
- Nothing was committed, pushed or deployed.

## 10. Rollback

Checkpoint: `refs/backup/pre-restructure` (commit `477f549`), the exact working tree
before the restructure, including the seven uncommitted edits. It is a plain git ref;
it does not appear in `git stash list` and is not pushed by default.

To return to the pre-restructure state while keeping the restructure recoverable:

```bash
git stash push --include-untracked -m "pavement-pinn restructure (shelved)"
```

```bash
git restore --source=refs/backup/pre-restructure --worktree -- .
```

The first command shelves everything (moved, modified and new files). The second
restores the original files as unstaged modifications. Result verified in a throwaway
copy of the repository: `git status` showed the same seven modified files as before
and their diff matched the original one exactly.

To bring the restructure back afterwards: discard the restored edits with
`git restore -- .`, then run `git stash pop`. This reverse direction was not rehearsed.

A second ref, `refs/backup/post-restructure`, records the finished restructure
(tracked and untracked files) at the time this report was written.

To delete the backup refs once they are no longer needed:
`git update-ref -d refs/backup/pre-restructure` and the same for `post-restructure`.
