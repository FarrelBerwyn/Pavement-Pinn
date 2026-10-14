# Post-Restructure Hardening Report

Date: 2026-10-14. Starting point: the restructured working tree recorded at
`refs/backup/post-restructure`. Nothing was committed, pushed, deployed, reset, cleaned
or stashed, and no user-level setting was edited.

Status labels: PASS (directly verified), FAIL (verified failure), BLOCKED (could not be
verified, with the reason), NOT TESTED, SIMULATED, PLANNED.

## 1. Summary

| Area | Result |
|---|---|
| Working tree versus the restructure snapshot | PASS: identical before this pass began (no drift, no unexplained zero-byte files) |
| Claude hook safety | FAIL as configured (reproduced). Two inert replacements verified. Awaiting approval; nothing changed |
| Report upvote count and state | FIXED and verified (unit tests and browser) |
| Map with a zero-size container | FIXED and verified (reproduced first, then unit tests and browser) |
| TypeScript gate | FIXED: React types installed, 25 hidden type errors corrected, one of them a runtime crash |
| Login, role switching, refresh, stale permissions | PASS (existing tests; all 8 accounts now seen in the browser) |
| Backend authorization | PLANNED: still none. Documented, not faked |
| Credentials in the bundle | PASS: a canary build and the live site both contain no key |
| PINN golden comparison | PASS: 76 of 76 scenarios identical |
| PINN strain thresholds | Finding corrected and quantified. No scientific assumption changed |
| Dependency advisories | FIXED: 6 advisories (1 critical) to 0, lockfile only |
| Final `npm run lint`, `npm test`, `npm run build` | PASS, PASS (92 of 92), PASS |
| GitHub Pages | NOT TESTED for the new build (nothing deployed) |

Two statements in the previous reports were wrong and are corrected here:

1. The hook problem is not caused by single quotes. See section 3.
2. The PINN report said the strain notes are never produced inside the documented
   input ranges. They are, in a very small corner. See section 6.

## 2. Phase 1: working-state audit

| Claim from the previous report | Verification |
|---|---|
| 44 files moved | PASS: `git status` shows 44 renames (39 renamed and modified, 5 renamed only) |
| 122 imports rewritten | NOT TESTED again: the figure comes from the migration script's own log; every relative import resolves (boundary test) |
| lint, build and 61 tests passed | PASS: the tree was byte-identical to the tested snapshot; the same scripts pass again at the end of this pass with a stricter gate |
| 76 PINN scenarios match | PASS (rerun as part of `npm test`) |
| Browser verification for 7 of 8 accounts | Now 8 of 8: USR-005 was opened in this pass |
| No backend authorization, no database | PASS (confirmed by reading `server/`) |
| Hooks may create empty files | PASS (reproduced; mechanism identified) |
| Stale upvote count, map crash, missing React types, unsafe secret configuration | All four confirmed; see sections 4 and 5 |

Other checks:

- Entry points: `index.html` loads `src/main.tsx`; `npm run dev` runs `server/index.ts`;
  `npm start` runs `dist/server.cjs`. Route table: 27 routes in `src/app/routeConfig.ts`.
- Backup refs present: `refs/backup/pre-restructure` and `refs/backup/post-restructure`.
- Zero-byte files: only the tracked, pre-existing `bun.lock`. During this pass the hook
  created two more empty files in the repository root (`c` and `strain`); both were
  untracked, empty, timestamped inside the session, and were removed.
- Stale imports, duplicate implementations, broken asset paths: none (boundary tests,
  typecheck and build).
- The user's own dev server on port 3000 was left running throughout.

## 3. Phase 2: Claude hook safety

### What is configured

`~/.claude/settings.json` defines the same command for five events (UserPromptSubmit,
PreToolUse, PostToolUse, Notification, Stop), differing only in one argument:

```text
cmd.exe /d /c 'call "%USERPROFILE%\.petdex\bin\petdex-hook.cmd" bubble pre claude-code'
```

The wrapper `petdex-hook.cmd` is two lines: it forwards its arguments to
`C:\Users\MSI\Downloads\petdex-desktop-win32-x64.exe` (present, about 6 MB).
`settings.json.pre-petdex-backup` in the same folder has no hooks, so the hooks were
added by the petdex installer.

### Mechanism (measured, not assumed)

Claude Code runs hook commands through Git Bash here. Git Bash (MSYS) rewrites
arguments that look like POSIX paths before starting a Windows program, so `/d` and
`/c` reach `cmd.exe` as `D:/` and `C:/`. A probe program started the same way received
exactly `["D:/", "C:/", "call x"]`. Without a real `/c`, `cmd.exe` starts as an
interactive shell and reads the hook's JSON payload from standard input as command lines.

The single quotes are not the cause; they are valid in Bash.

### Evidence

All tests used a stand-in wrapper in a temporary directory that only records what it
receives. The real petdex executable was never started. Payloads contained only
harmless markers.

| Invocation | Exit | Interactive `cmd` | Stand-in hook ran | Arguments received | Stdin delivered | Side effects in the working directory |
|---|---|---|---|---|---|---|
| As configured, through Git Bash | 0 | yes | no | none | none | empty file created from payload text |
| As configured, through Node `shell: true` | 1 | no | no | none | none | none (fails: `'call` is not a command) |
| As configured, through PowerShell | 0 | no | yes | `bubble`, `pre`, `claude-code` | complete | none |
| Candidate F (see below), Git Bash | 0 | no | yes | `bubble`, `pre`, `claude-code` | complete | none |
| Candidate G (see below), Git Bash | 0 | no | yes | `bubble`, `pre`, `claude-code` | complete | none |
| `cmd.exe //d //c '...'` and `MSYS_NO_PATHCONV=1` variants | 1 | no | no | none | none | none (inner quotes get mangled) |

Only the first row matches what the live session shows (a `cmd` banner and prompt in
every hook output), which confirms that Git Bash is the interpreter in use.

With the configured command, in the temporary directory:

- A payload containing an arrow function created an empty file named after the token
  that followed the arrow. PASS as a reproduction of the junk files.
- A payload containing a rename arrow that pointed at an **existing 18-byte file
  truncated it to 0 bytes**. This is the data-loss case.
- A payload containing an ampersand followed by `echo` **executed the echo**. Text
  after an ampersand is run as a command.
- Whether a given character is live depends on quote parity: JSON writes an inner
  double quote as backslash-quote, `cmd` still counts it as a quote, so after an odd
  number of them the rest of the value is outside `cmd` quoting.
- Payloads longer than about 8,190 characters are split into chunks, each run as its
  own command line.
- The hook reports success (exit 0) every time, so nothing signals the problem.
- The petdex program itself never runs under the current configuration.

Risk in practice: any tool input or output that contains a redirect or ampersand in the
exposed state can create or empty a file relative to the session's working directory,
or run a command. Source code, diffs and `git status` rename lines all contain such
characters. At the start of this pass the repository was identical to the snapshot, so
no real file had been damaged up to that point; the final lint, test and build runs
passing is the evidence for the rest of the pass.

### Proposed minimal patch (not applied)

Replace the `command` string of all five hooks, keeping the last three words as they
are for each event (`user-prompt`, `pre`, `post`, `notification`, `stop`).

Candidate F, recommended: call the wrapper directly, with no `cmd.exe` switches for
MSYS to rewrite.

```text
"$USERPROFILE/.petdex/bin/petdex-hook.cmd" bubble pre claude-code
```

Candidate G, equivalent: keep `cmd.exe`, double the slashes, and drop `call` and the
inner quotes.

```text
cmd.exe //d //c "%USERPROFILE%\\.petdex\\bin\\petdex-hook.cmd" bubble pre claude-code
```

Both were verified with the hazardous payload: correct exit code, exact argument
boundaries, unchanged working directory, payload delivered on stdin, no banner, no file
created, nothing executed.

Things to decide before applying:

1. Fixing the command means the petdex executable will start running on every prompt
   and tool call. Today it never runs. It lives in `Downloads`; it was not inspected or
   executed in this pass, so its behaviour is NOT TESTED.
2. The alternative is to remove the five hook entries (the pre-petdex backup shows the
   file without them). That removes the risk and the feature.
3. Either change is an edit to a user-level settings file and needs your approval.

Until then, the session keeps working with payloads shaped to stay inert, and empty
junk files are swept at the end.

## 4. Phase 3: application regressions

### 4.1 Report upvotes

| Item | Result |
|---|---|
| Reproduced | PASS (previous session: the open panel kept showing 84 after a click) |
| Cause 1 | Report panels hold a copy of the report and were never refreshed |
| Cause 2 | The upvote flag was stored on the report, so it was shared by every demo identity |
| Fix | `src/features/community-reports/reportState.ts`: per-account upvote ledger, shared count, and `resolveLiveReport` for open panels. Wired in `AppStateProvider`, `ModernAppLayout`, `LeafletMap`, `CommunityReportsDashboard` |
| Unit tests | PASS: `tests/unit/report-state.test.ts`, 10 tests |
| Browser | PASS: reporter sees "Upvoted (84)", clicks, the open panel shows "Upvote Laporan (83)"; the viewer sees it un-voted at 83, votes, 84; back as reporter it is un-voted at 84 |

Related defect found and fixed: an edit made in the modern shell stayed in the open
panel and never reached the shared list. It now calls the existing edit handler.
Verified in the browser: the edited text appears on `/reports/` and the audit trail
gains an "EDIT LAPORAN WARGA" entry.

### 4.2 Map with a zero-size container

| Item | Result |
|---|---|
| Reproduced | PASS: mounting the map inside a hidden container threw "Invalid LatLng object: (NaN, NaN)" and React unmounted the whole application (root emptied) |
| Cause | Leaflet's `flyTo` divides by the map size; the mount effect calls it immediately |
| Fix | `src/components/maps/mapViewport.ts`: `safeFlyTo`, `safeFitBounds`, `recoverMapSize`, `attachMapResizeRecovery`. Applied to all five Leaflet maps (six `flyTo` and two `fitBounds` call sites) |
| Safety net | `src/app/AppErrorBoundary.tsx` around the shell: a crashing component now shows a retry panel instead of a blank page |
| Unit tests | PASS: `tests/unit/map-viewport.test.ts`, 6 tests with a fake map that fails the way Leaflet does |
| Browser, crash | PASS: the same reproduction no longer crashes; the map mounts at 0 by 0 |
| Browser, recovery | PASS: after the container was shown again the map measured 1110 by 704 and filled with 20 tiles and 45 markers |

Note on the recovery check: the embedded browser pane delivered no animation frames
and no resize callbacks while it was not being painted, so recovery could not be
observed until a screenshot forced a paint. That is a property of the test
environment; a hidden browser tab behaves the same way and recovers when shown.

### 4.3 TypeScript validation gate

| Item | Result |
|---|---|
| Finding | PASS as a finding: `@types/react` and `@types/react-dom` were absent, `React.FC` was `any`, and `tsc` could not see component props |
| Fix | Both packages added as dev dependencies (`^19`) |
| What the real gate found | 25 errors in 8 files, all of them components reading a property that does not exist |
| After fixes | PASS: `npm run lint` exits 0 with the real types |
| Guard | `tests/unit/typecheck-gate.test.ts`, 3 tests (types installed, lint script unchanged, no `@ts-nocheck`) |

The 25 errors and what was done:

| Location | Was reading | Effect before | Now |
|---|---|---|---|
| `FieldEngineerTools`, loss panel (3) | `result.lossMetrics` | **Runtime crash** when the "Diagnostik Loss Solver PINN" tab was opened. Reproduced in the browser | Uses `telemetry.physicsLossValue` and `dataLossValue`; total is their sum. Values remain SIMULATED |
| `FieldEngineerTools`, overlay calculator | `overlayThicknessCm` | Always fell back to 6.0 cm | `recommendedOverlayThicknessCm` (14.3 cm seen in the browser) |
| `RoadHistoryView` (8) | `segment.pci` | PCI blank, before and after values `NaN` | `currentPci` ("44 / 100" seen in the browser) |
| `RoadHistoryView` | `segment.sta` | Option label "STA undefined" | `kmPost` |
| `RoadHistoryView` (3) | `segment.esalDaily` | Card showed "NaNk" | Shows a dash and "Data ESAL belum tersedia"; no ESAL figure was invented |
| `ExecutivePolicyView` (2) | `seg.pci`, `account.organization` | Blank | `currentPci`, `agency` |
| `ModernAppLayout`, `ReportDetailBottomSheet` | `account.avatar` | Always the generic avatar | `avatarUrl` |
| `ModernAppLayout` quick search | `seg.district`, `seg.damageSeverity` | Blank line | `province`, `conditionCategory` |
| `ReportRoadIssueCard` | `segment.district` | Sub-location always "Jakarta, ..." | Corridor and province |
| `PredictionPage` | missing required prop | Prop undefined | `communityReports` passed |
| `OperationsPage` | redundant comparison | Dead condition | Removed; behaviour identical |

These are behaviour changes, each one replacing a blank, a wrong constant or a crash
with the value the code was evidently trying to show.

### 4.4 Login, logout, role switching, refresh, stale permissions

No defect found. Evidence: the 27 by 5 route matrix, landing rules and the
no-stale-permission sweep in `tests/unit/rbac.test.ts` (unchanged, passing), plus the
browser session of the previous pass. New in this pass: USR-005 (public viewer) was
opened and behaves as specified (public sidebar, no edit button).

There is still no dedicated logout control in the UI; "Keluar" opens the account
switcher, as designed. `SessionProvider.logout()` exists and is unused. NOT TESTED in
the browser for that reason.

### 4.5 Routes and navigation

Routing code was not touched in this pass. PASS by the existing unit tests (10 route
tests). Spot checks on the final production build: a deep link without a trailing
slash was canonicalised and rendered, and a protected deep link returned the
application shell.

### 4.6 Simulation, PDF, reports, map layers, workspaces

| Check on the final build | Result |
|---|---|
| Simulation run and narrative request | PASS (HTTP 200, narrative shown) |
| PDF export | PASS (17,107-byte PDF blob; download suppressed) |
| Report creation through the detection page | PASS (1 of 16 reports with an analysis) |
| FWD tools: diagnostics and overlay tabs | PASS |
| PCI history view | PASS |
| Map layers, language, theme, filters, heatmap | NOT TESTED again (verified in the previous pass; that code was not changed, apart from the guarded map calls) |
| Operations and policy workspaces | NOT TESTED again in the browser (only the map calls changed there; typecheck and build pass) |
| Mobile layout, camera, geolocation, BATM and ETLE actions | NOT TESTED (unchanged from the previous report) |

## 5. Phase 4: backend and credential safety

### Endpoint classification

"Protected" would mean the server checks who is calling. No endpoint does.

| Endpoint | Class | Reads or changes | Sensitivity |
|---|---|---|---|
| `GET /api/health` | public | nothing | none |
| `GET /api/roads` | public, demo data | returns the bundled road dataset | includes demonstration WIM records with licence plates and vehicle weights. The values are synthetic, but the shape is what a real deployment must not expose |
| `POST /api/simulate` | public, demo | computes only; stores nothing | none; no input validation |
| `GET /api/openvino/export-ir` | public, demo | static text | none; SIMULATED artifact |
| `GET /api/openvino/export-config` | public, demo | template text | none; SIMULATED artifact |
| `POST /api/generate-narrative` | public | may call Gemini with the server's key | **spends the owner's API quota for any caller** |
| any other `/api/...` | public | nothing | now a JSON 404 |

No endpoint modifies stored data, because nothing is stored. Frontend route guards do
not protect any of this: every endpoint answers a plain unauthenticated request.

### Targeted hardening applied

| Change | Verification |
|---|---|
| Unknown `/api/...` paths answer 404 JSON instead of the HTML shell with status 200 | PASS: tests and a request against the production build |
| Request values are reduced to one short line before entering the Gemini prompt (control characters removed, 120-character cap) | PASS: a hostile body cannot add prompt lines or inflate the prompt; a genuine result produces the same prompt lines |
| Unknown role values are answered offline and never forwarded to Gemini | PASS: a counting client records zero calls |
| Request bodies above the 100 kB default are rejected with 413 | PASS (pins existing Express behaviour) |
| Dependency advisories: express, body-parser, qs, proxy-addr (critical), source-map-js, dompurify | PASS: `npm audit` reports 0 after `npm audit fix`; `package.json` unchanged, lockfile only |

Tests: `tests/integration/api-hardening.test.ts`, 7 tests. The 17 existing contract
tests still pass, so no documented success response changed.

What this hardening is not: it is not authentication, authorization or rate limiting.
An anonymous caller can still trigger Gemini calls with a valid role.

### Credentials

| Check | Result |
|---|---|
| Does the deploy workflow pass a secret as a `VITE_` variable? | Yes: `VITE_GEMINI_API_KEY`, line 30 of `deploy.yml` |
| Is it in the bundle? | PASS, it is not. A build run with a unique canary value in that variable produced a `dist/` containing zero occurrences of the canary |
| Why not | The only `import.meta.env` use in the source is `BASE_URL` in `src/app/router.tsx`; Vite inlines only variables that are referenced |
| Live site | PASS: the JavaScript bundle currently served at the project's GitHub Pages URL contains no Google-key-shaped string and no mention of the variable (counts only; nothing was printed) |
| Server-side key | Read only in `server/integrations/gemini/geminiClient.ts` |
| Key in this environment | Present but rejected by Google as invalid, so a real Gemini response is NOT TESTED |

The workflow line is a latent risk, not a current leak: a single future reference to
`import.meta.env.VITE_GEMINI_API_KEY` would publish the key. Recommended change, not
applied because it is deployment configuration: delete the two `env` lines from the
build step of `.github/workflows/deploy.yml`.

### Authorization: design decisions that are missing

Production-grade protection cannot be added without choosing things the project has
not decided. No security architecture was invented. Open decisions:

1. Identity provider: government single sign-on, an OIDC provider, or local accounts.
2. Session model: server-side sessions with cookies, or signed tokens; and their lifetime.
3. Where roles come from and who may assign them.
4. Persistence: there is no database, so there is nowhere to keep users, sessions,
   reports or an audit trail.
5. Which data is public. Today everything ships in the public JavaScript bundle; a
   public projection of the road dataset is needed before real WIM data is used.
6. Abuse controls for the narrative endpoint: rate limits, quotas, or requiring a login.
7. Hosting: GitHub Pages cannot run the backend at all, so the API needs a host.

The demo workflow (account picker, eight accounts, in-memory data) is unchanged.

## 6. Phase 5: PINN scientific integrity

| Question | Answer |
|---|---|
| Golden comparison | PASS: 76 of 76 scenarios identical to the pre-restructure engine, tolerance 0 |
| Origin of outputs | Deterministic closed-form formulas for strains, deflection, PCI, economics and alerts. Constants plus random jitter for latency, power and the two loss values (SIMULATED). No trained model and no measured dataset is involved anywhere |
| Units and ranges | Documented in `PINN_REGRESSION_REPORT.md`; the ranges are comments, the engine validates nothing |
| Boundary behaviour and finiteness | PASS for the 61 in-range scenarios; non-finite results for invalid input are pinned, not endorsed |
| Alert thresholds | Verified by tests at their exact boundaries (14 and 18 t, 25 and 50 mm/h) |
| Software regression versus physical validation | Only the first is established. There is no reference data in the repository |

### Why strain rarely reaches its thresholds

The earlier statement that the notes are never produced was wrong; it came from
one-at-a-time sweeps. A full grid scan (`scripts/analyze-pinn-thresholds.ts`) gives:

| Input space | Grid points | Maximum tensile strain | Above 180 | Above 200 | Above 250 |
|---|---|---|---|---|---|
| What the simulation panel can set (axle 8 to 25 t, thickness 5 to 25 cm; temperature fixed at 42 C, modulus fixed at 2400 MPa) | 735 | 183 | 1 | 0 | 0 |
| Documented API ranges (axle 10 to 25 t, thickness 5 to 25 cm, modulus 1200 to 3500 MPa, temperature 25 to 60 C) | 124,992 | 274 | 819 | 364 | 15 |
| The 15 reference segments at their defaults (8 to 18 cm asphalt) | 15 | 59 | 0 | 0 | 0 |

Causes, all visible in the code:

1. Tensile strain depends only on axle load, thickness, modulus and temperature. Rain,
   flood and CBR do not affect it (pinned by a test).
2. Thickness enters as `h^1.75`: doubling the asphalt divides the strain by about 3.4.
   For a legal 10 t axle at panel defaults the engine returns 73 microstrain at 5 cm,
   22 at 10 cm, 11 at 15 cm and 4 at 25 cm.
3. The thresholds are exceeded only for asphalt of 6 cm or thinner; the reference
   segments are 8 to 18 cm.
4. The panel has no control for temperature or modulus, which are the two inputs
   needed to reach the higher values.
5. Three different thresholds are in use: the engine's notes switch at 180 and 250
   (while its critical text cites a limit of 200), and the panel and the PDF mark
   "exceeds the limit" at 200.

Consequences today: all 15 reference segments get the "stable" note; "Melebihi Ijin"
can never appear from the panel; the alerts users see come from the axle, rain and PCI
rules, not from strain.

What cannot be concluded from the repository: whether the response coefficients are
too small or the thresholds too high. That needs calibration data or a reference
layered-elastic solution. **No threshold or coefficient was changed.** Decisions for the
model owner:

- calibrate the response formulas against FWD or strain-gauge data, or a reference solver;
- choose one documented strain criterion and use it in the engine, the panel and the PDF;
- expose temperature and modulus in the panel if they are meant to vary;
- until then, present the strain notes as illustrative.

The finding is pinned by `tests/physics-validation/pinn-threshold-characterization.test.ts`
(5 tests). They describe current behaviour; a deliberate recalibration must update them.

## 7. Phase 6: deployment and compatibility

| Check | Result |
|---|---|
| Build configuration and asset base path | PASS: unchanged; bundle references `/PavementPinn/assets/` |
| `dist/404.html` emitted and identical to `index.html` | PASS |
| Production server: direct route loading and SPA fallback | PASS on the final build (port 3200) |
| Production server: API availability and JSON 404 | PASS |
| Local static-host simulation of GitHub Pages | PASS in the previous pass; routing code unchanged since, so it was not repeated |
| **Actual GitHub Pages** | NOT TESTED for this build. The live site still serves the pre-restructure bundle: a deep link there returns 404 and there is no `404.html` yet. That is the expected state before a deploy, and it means deep links will only work on Pages after the next deployment |
| API on GitHub Pages | Not available by design (static host); the frontend falls back to the offline narrative |

Nothing was deployed and the workflow file was not changed.

## 8. Final checks

Run after the last code and dependency change:

| Command | Outcome |
|---|---|
| `npm run lint` | PASS, exit 0 (now with React types) |
| `npm test` | PASS, exit 0, 92 of 92 tests, 0 skipped |
| `npm run build` | PASS, exit 0. JS 2,180.98 kB (gzip 578.35), CSS 161.19 kB, `server.cjs` 44.9 kB, `404.html` present |
| `npm audit` | 0 vulnerabilities |

Test suites: PINN regression 14, PINN threshold characterization 5, module boundaries
10, routes 10, RBAC 10, report state 10, map viewport 6, typecheck gate 3, API
contract 17, API hardening 7.

## 9. Files changed in this pass

New: `src/components/maps/mapViewport.ts`, `src/features/community-reports/reportState.ts`,
`src/app/AppErrorBoundary.tsx`, `scripts/analyze-pinn-thresholds.ts`,
`tests/physics-validation/thresholdAnalysis.ts`, five test files, this report.

Modified: `package.json` and `package-lock.json` (two type packages; audit fixes),
`server/routes/index.ts`, `server/services/narrativeService.ts`, `src/app/App.tsx`,
`AppStateProvider.tsx`, `ModernAppLayout.tsx`, the five map components,
`CommunityReportsDashboard`, `ReportDetailBottomSheet`, `ReportRoadIssueCard`,
`FieldEngineerTools`, `ExecutivePolicyView`, `RoadHistoryView`, `PredictionPage`,
`OperationsPage`, and four documents.

Not touched: the engine (`pinnEngine.ts`), the golden file, the route table, the
deploy workflow, `tsconfig.json`, `vite.config.ts`, and every user-level setting.

## 10. Waiting for a decision (as of the hardening pass; see section 11 for what was decided)

1. **Hook configuration**: apply candidate F, apply candidate G, or remove the hooks.
2. **Deploy workflow**: remove the unused `VITE_GEMINI_API_KEY` lines.
3. **Strain model**: calibration and a single threshold (section 6).
4. **Authorization design** (section 5).
5. **Commit**: all work is uncommitted in the working tree.

## 11. Follow-up decisions (2026-10-14)

Decisions taken after this report was first written, applied with minimal changes.

### 11.1 Claude hooks: disabled, not replaced

| Item | State |
|---|---|
| File changed | `~/.claude/settings.json` (user level; not part of this repository) |
| Change | the five petdex hook entries were removed from `hooks`, which is now empty. `effortLevel` and `theme` are untouched; byte-order mark, line endings and indentation preserved |
| Other hooks | none existed; nothing else was removed |
| Backup | `~/.claude/settings.json.pre-hook-disable-2026-10-14.bak`, byte-identical to the original (SHA-256 verified) |
| Restore | copy the backup over `settings.json` (this brings back the unsafe command) |
| Replacement command | NOT enabled |
| Effect on an already running session | NOT TESTED: a running session may keep the hooks it loaded at start; a new session reads the cleaned file |

Why the replacement was not enabled. A read-only inspection of the executable the
wrapper would start (it was not run):

| Property | Finding |
|---|---|
| Path | `Downloads/petdex-desktop-win32-x64.exe`, 6,182,400 bytes, dated 2026-09-23 |
| SHA-256 | `1D7F159AE6C76B31228A3A40FCF95BB560877ED02FBAAE7A1BCAC4351E82C2FB` |
| Authenticode signature | not signed |
| Version metadata | none (no company, product or version fields) |
| Origin | downloaded from the internet (zone 3) from a GitHub release-asset URL; the repository name is not recoverable from the URL |
| Behaviour when invoked | NOT TESTED |

An unsigned binary without metadata, running on every prompt and tool call with the
full hook payload on standard input, cannot be judged safe from this evidence. Before
re-enabling: identify the publishing repository, compare the hash with the published
release, and observe what the program does with its input in an isolated environment.
Only then use candidate F from section 3.

### 11.2 Deploy workflow: unused secret removed

Two lines were removed from the "Build Web Application" step of
`.github/workflows/deploy.yml`:

| Removed line | Reason |
|---|---|
| `VITE_GEMINI_API_KEY: (reference to the repository secret)` | no source file, test, script or build configuration reads this variable (the only `import.meta.env` use is `BASE_URL`); passing a secret under a `VITE_` name is a standing risk of publishing it |
| `env:` | it only introduced that one variable; an empty `env:` block is not valid for a step |

Unchanged: trigger (push to `main`), permissions, the five steps and their order, the
build command `npx vite build`, the deploy action, folder and target branch. The
repository secret itself was not touched. Static verification: line comparison shows
exactly these two lines removed and none added; indentation is consistent; no tab
characters; all trigger, permission, build and deploy lines are present. A YAML parser
was not available offline, so parser-level validation and an actual workflow run are
NOT TESTED. Nothing was deployed.

### 11.3 Commits

The work is recorded as two local commits on a separate branch (not on `main`, and not
pushed): first the restructure, as captured by `refs/backup/post-restructure`, then the
hardening pass including this section. The seven local edits that existed before the
restructure (tile layers in five map components, avatar URLs, the Leaflet stylesheet
import) are contained in the first commit at their new paths.

### 11.4 Still open before Stage 4

1. Decide the fate of the petdex hooks (section 11.1).
2. Strain model calibration and a single threshold (section 6).
3. Authorization, identity and persistence design (section 5).
4. A deployment to GitHub Pages and a check of deep links there.
5. Browser checks that remain NOT TESTED: mobile layout, camera, geolocation, BATM and
   ETLE actions, and a re-check of the operations and policy workspaces.
6. A real Gemini response (the configured key is rejected as invalid).
7. OpenVINO, hardware and computer-vision capabilities remain SIMULATED or PLANNED;
   nothing in this pass changed that.

## 12. Git reconciliation audit and readiness gate (2026-10-14)

Read-only investigation. No fetch, merge, rebase, reset, push or ref change was made.

### 12.1 State

| Ref | Commit | Meaning |
|---|---|---|
| `restructure/modular-architecture` (checked out) | `20dcaed` | hardening, parent `b2bd8dd` (restructure), parent `fffa344` |
| local `main` | `fffa344` | a root commit made on 2026-08-24 12:20 |
| `origin/main` (tracking ref) | `a32ef56` | parent `067f539`, a different root commit, both dated 2026-08-25 |
| remote `main` (queried with `git ls-remote`, which fetches nothing) | `a32ef56` | equal to the tracking ref, so the tracking ref is **not stale** |
| remote `gh-pages` | `0cd6e4d` | deployment output |
| `refs/backup/pre-restructure` | `477f549` | the working tree before the restructure, including the seven uncommitted edits |
| `refs/backup/post-restructure` | `81f060f` | the tree at the end of the restructure; identical to the tree of `b2bd8dd` |

Merge base of local `main` (or the working branch) with `origin/main`: none.

### 12.2 Cause of the missing merge base (from the tracking-ref log)

| When | Event | Remote `main` afterwards |
|---|---|---|
| 2026-08-24 09:58 | an earlier history existed on the remote (two commits, tip `542b38f`, still in the local object store) | `542b38f` |
| 2026-08-24 12:20 | local repository re-initialised: `fffa344` is "commit (initial)" with no parent | |
| 2026-08-24 12:21 | "update by push": the parentless `fffa344` replaced `542b38f`, which is only possible as a forced push | `fffa344` |
| 2026-08-25 04:01 to 04:07 | two commits made in another working copy (`067f539` "initial commit", `a32ef56`) | |
| by 2026-10-14 00:46 | a fetch recorded "forced-update" from `fffa344` to `a32ef56`: the remote had been force-replaced again | `a32ef56` |

So three unrelated root histories exist. The project was re-initialised and force-pushed
twice, from two different working copies. Nothing is "stale"; the histories simply do
not share a commit.

### 12.3 What differs in content

- Identical on both sides: the PINN engine, the server, the road dataset, the PDF
  generator, the device detector, the damage taxonomy, `package.json`, the deploy
  workflow as it was. The PINN findings therefore apply to the deployed engine too.
- The remote is a later and different line of the UI: 41 files differ from local `main`
  (about 8,000 lines each way). It has six files the local line never had
  (`BeforeAfterSlider`, `InteractiveWorkflowBar`, `ReportWorkflowTimeline`,
  `WorkflowModals`, `WorkflowTransitionPromptModal`, `utils/aiRoadDetection.ts`) and no
  lockfile.
- The seven local edits (tile layers, avatars, stylesheet import) are not on the remote.
- The restructure and hardening exist only locally.
- `aiRoadDetection.ts` on the remote is a canvas pixel heuristic with no ML dependency.
  It has not been audited; the computer-vision capability label must be reviewed after
  integration.

All verification in these reports was done on the local line. The remote-only
features have not been tested by this work.

### 12.4 Trial merge (in memory, nothing written to refs, index or working tree)

`git merge-tree --write-tree --merge-base=fffa344 HEAD a32ef56`, treating local `main`
as the common content ancestor: 29 files merge automatically, 11 paths conflict
(`ModernAppLayout`, `LeafletMap`, `demoAccounts`, `ReportDetailBottomSheet`,
`ReportRoadIssueCard`, `OpenVINOModelDiagnosticsModal`, `MyTasksView`, `vite.config.ts`,
and three modify-versus-delete cases: `App.tsx`, `types.ts`, `package-lock.json`). The
six remote-only files land at their old paths and must be placed in the new structure.

### 12.5 Recommended integration (not executed)

Goal: combine both lines with a real three-way merge, then join the result to the
actual remote history so it can be pushed without force. No history is rewritten.

1. Confirm that remote `main` is the intended product line (it is what is deployed).
2. Create an integration branch from the working branch.
3. Record the remote tree as one commit on top of local `main`, so Git has a merge base.
4. Merge that commit; resolve the 11 conflicts; move the six new files; run lint, tests,
   build and the browser checklist.
5. Join histories with a second merge that keeps the resolved tree and records
   `origin/main` as a parent.
6. Push the integration branch as a new remote branch and open a pull request. Merging
   it into `main` is what triggers deployment.

```text
git switch -c integrate/remote-main restructure/modular-architecture
git branch import/origin-main $(git commit-tree "origin/main^{tree}" -p main -m "import: tree of origin/main a32ef56")
git merge --no-ff import/origin-main
    (resolve, verify, commit)
git merge -s ours --allow-unrelated-histories origin/main -m "merge: join remote main history"
git push origin integrate/remote-main
```

Options considered and not recommended:

- Merging `origin/main` directly with `--allow-unrelated-histories`: with no merge base,
  moved files are not matched, so the remote versions would sit beside the restructured
  ones as duplicates.
- Force-pushing the local branch: destroys the remote-only work. Not acceptable.
- Re-running the restructure on top of the remote tree: possible, but repeats and
  re-verifies the whole migration.

### 12.6 Readiness checklist (nothing here has been run for the integrated result)

Browser, per account (8 accounts, desktop and one mobile width):

- [ ] public map loads; markers, filters, heatmap, three base layers
- [ ] login, account switch, refresh keeps the identity, back and forward
- [ ] every sidebar entry of each role changes the URL and renders its view
- [ ] protected URL as a public identity redirects to login; wrong role shows the 403 page
- [ ] simulation run, narrative, PDF export from each dashboard that offers it
- [ ] report creation by upload and by camera; geolocation; edit; upvote across two identities
- [ ] operations views: WIM map, four monitoring views, BATM and ETLE actions, tasks
- [ ] policy tabs, brief generation, strategic map
- [ ] FWD tools: all four tabs; PCI history view
- [ ] remote-only features after integration: workflow timeline and modals, before/after slider
- [ ] mobile layout: bottom navigation, bottom sheet, safe areas
- [ ] no uncaught console error

GitHub Pages, after an approved deploy:

- [ ] site root redirects to the dashboard
- [ ] a deep link such as `/PavementPinn/engine/pinn/` renders (served through `404.html`)
- [ ] refresh on a nested route; canonical trailing slash
- [ ] assets load under `/PavementPinn/assets/`; no request to `/api/` is required for the page to work
- [ ] the narrative falls back to the offline text; the two OpenVINO download links are known to be dead on a static host
- [ ] the published bundle contains no key-shaped string

Capability labels to keep: deterministic engine and rule alerts WORKING; OpenVINO
telemetry, device benchmark, IR export, WIM pipeline and damage classification
SIMULATED; trained PINN, backend authorization and persistence PLANNED.

### 12.7 Checks run in this pass

| Check | Result |
|---|---|
| Dev server from `server/index.ts` on port 3100 | PASS: `/api/health` 200, unknown API path 404 JSON, application shell and a deep link 200 |
| `npm run lint` | PASS, exit 0 |
| `npm test` | PASS, 106 of 106 (92 plus the 14 new audit tests) |
| `npm run build` | NOT re-run: no source, configuration or dependency changed since the build of commit `20dcaed` passed |
| Hooks | no hook output appeared in this pass, consistent with the five entries being disabled |
