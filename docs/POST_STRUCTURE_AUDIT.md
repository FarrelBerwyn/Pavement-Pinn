# Post-Structure Security and Git Audit

Date: 2026-10-14. Scope: the repository after the in-place folder-structure alignment
(see `RELOCATION_REPORT.md`). This audit is read-only apart from this file: nothing was
committed, staged, pushed, deleted or changed in application code, remotes or branches.

Status labels: PASS, FAIL, BLOCKED, NOT TESTED.

## 1. Repository and Git state

| Item | Value |
|---|---|
| Git root | `D:\Farrel Folder\Programming\Intel AI Global Impact Festival 2026\Projects\pavement-pinn` |
| Branch | `restructure/modular-architecture` |
| HEAD | `20dcaed` (fix: post-restructure hardening), parent `b2bd8dd`, parent `fffa344` |
| Local `main` | `fffa344` |
| `origin/main` (local tracking ref, not fetched) | `a32ef56`, no common ancestor with local history |
| Remote | `origin`, github.com, HTTPS, no credentials in the URL |
| Backup refs | `refs/backup/pre-restructure` `477f549`, `refs/backup/post-restructure` `81f060f`, `refs/backup/pre-structure-alignment` `8a71740`; all three present |
| Stash | empty |
| Audited working tree | tree hash `0a3ede3f89e124ef7f22dbf188c306ccaf18e8aa` (computed with a temporary index; the real index was not touched) |

Git history is consistent: branch, HEAD and backup refs are where the previous reports
left them. The only known inconsistency is the old one, local versus remote history
(`validation/POST_RESTRUCTURE_HARDENING.md` section 12), which is unchanged.

## 2. Inventory of uncommitted work

Working tree versus HEAD: 32 files changed, 1,122 insertions, 245 deletions.

### 2.1 Staged (index versus HEAD)

| Status | Path |
|---|---|
| R100 | `server/integrations/geminiClient.ts` to `server/integrations/gemini/geminiClient.ts` |
| R100 | `src/pages/computer-vision/ComputerVisionPages.tsx` to `ComputerVisionPage.tsx` |
| R100 | `src/pages/engine/EngineHubPage.tsx` to `EnginePage.tsx` |
| R100 | `src/pages/engine/EngineFwdPage.tsx` to `FwdPage.tsx` |
| R100 | `src/pages/engine/EnginePinnPage.tsx` to `PinnPage.tsx` |
| R100 | `src/pages/engine/EnginePredictionPage.tsx` to `PredictionPage.tsx` |
| R100 | `src/pages/engine/EngineSimulationPage.tsx` to `SimulationPage.tsx` |
| R100 | `src/services/api/narrativeApi.ts` to `endpoints.ts` |
| D | `src/services/api/openvinoExportApi.ts` |

**The index is not a committable state.** It holds only the path moves; the renamed
files still carry their old content in the index, and the content edits are unstaged.
Committing the index as it is would produce a commit that does not compile.

### 2.2 Intent-to-add (path registered in the index, no content staged)

These ten entries come from an accidental `git add -N .` during the alignment task.
It is harmless (no content was staged, nothing was lost) but it makes `git status`
show them as "A" in the unstaged column.

- `docs/validation/PINN_VALIDATION_GAP.md`
- `server/routes/health.routes.ts`, `narrative.routes.ts`, `openvino.routes.ts`, `pinn.routes.ts`, `roads.routes.ts`
- `src/pages/computer-vision/DamageDetectionPage.tsx`, `InspectionHistoryPage.tsx`, `components/SimulationNotice.tsx`
- `tests/physics-validation/pinn-mathematical-audit.test.ts`

### 2.3 Unstaged modifications (working tree versus index)

- Documents: `README.md`, `docs/api/API_INVENTORY.md`, `docs/architecture/DEPENDENCY_MAP.md`,
  `docs/architecture/ROUTE_MAP.md`, `docs/validation/PINN_REGRESSION_REPORT.md`,
  `docs/validation/POST_RESTRUCTURE_HARDENING.md`
- Server: `server/controllers/narrativeController.ts`, `server/routes/index.ts`
- Frontend importers: `src/app/pageRegistry.tsx`,
  `src/components/simulation-viewer/SimulationPanel.tsx`,
  `src/features/openvino-diagnostics/OpenVINOModelDiagnosticsModal.tsx`
- Renamed files with edits: `src/pages/computer-vision/ComputerVisionPage.tsx`,
  the five `src/pages/engine/*Page.tsx`, `src/services/api/endpoints.ts`

### 2.4 Untracked

- `docs/RELOCATION_REPORT.md`
- `docs/POST_STRUCTURE_AUDIT.md` (this file)

## 3. Rename and move review

Method: each new file compared with its HEAD predecessor, line endings normalised.

| Change | Evidence | Verdict |
|---|---|---|
| `geminiClient.ts` moved into `gemini/` | 0 changed lines | structural only |
| Five engine pages renamed | 2 changed lines each; 0 after normalising the component name (the exported function was renamed to match the file) | structural plus export rename |
| `ComputerVisionPages.tsx` split into 3 pages and `components/SimulationNotice.tsx` | 149 of 149 non-import lines of the old file are present in the new files, after applying the three export renames and adding `export` to four shared constants | structural plus export rename |
| `narrativeApi.ts` and `openvinoExportApi.ts` merged into `endpoints.ts` | 22 of 22 non-import lines present | structural only |
| `routes/index.ts` split into five `*.routes.ts` files | 22 of 22 non-import lines present; registration order identical to HEAD (health, roads, simulate, export-ir, export-config, generate-narrative, then the `/api` JSON 404) | structural only |
| Importers (`pageRegistry.tsx`, `SimulationPanel.tsx`, `OpenVINOModelDiagnosticsModal.tsx`, `narrativeController.ts`) | import paths and imported names only | structural only |

Documented content changes (not pure moves):

1. Export names: `EngineHubPage`, `EnginePinnPage`, `EngineSimulationPage`,
   `EngineFwdPage`, `EnginePredictionPage` became `EnginePage`, `PinnPage`,
   `SimulationPage`, `FwdPage`, `PredictionPage`; `ComputerVisionHubPage`,
   `ComputerVisionDetectionPage`, `ComputerVisionHistoryPage` became
   `ComputerVisionPage`, `DamageDetectionPage`, `InspectionHistoryPage`.
2. Four module-private constants in the computer-vision file became exports so the
   split files can share them.
3. From the earlier PINN audit task (not part of the alignment): `README.md`,
   `docs/validation/PINN_REGRESSION_REPORT.md`, `docs/validation/POST_RESTRUCTURE_HARDENING.md`
   edited; `docs/validation/PINN_VALIDATION_GAP.md` and
   `tests/physics-validation/pinn-mathematical-audit.test.ts` added. These are documents
   and one test; no application code.

No file under `src/engines`, `src/data` or the test fixtures differs from HEAD. The
golden fixture hash is unchanged (`96584b69...`, LF-normalised sha256).

## 4. Credential exposure

All values are redacted. No token value was printed, copied or written during this audit.

### 4.1 Sibling repositories

| Folder | Remote | Host | Credential embedded in remote URL | Form |
|---|---|---|---|---|
| `Projects\pavementpinn-adjust` | `origin` | github.com | **YES** | token as user name |
| `Projects\pavementpinn-layout` | `origin` | github.com | **YES** | `oauth2:` plus token as password |
| `Projects\pavementpinn-navigate` | `origin` | github.com | **YES** | token as user name |
| `Projects\pavementpinn-shared` | `origin` | github.com | **YES** | account name plus token as password |
| `Projects\pavementpinn-update` | `origin` | github.com | **YES** | token as user name |
| `D:\Download C - Dirapihkan 19 Sept\pavement_pinn` | `origin` | github.com | **YES** | token as user name |

Result: FAIL, six of six. Each folder has one remote; none stores an additional
credential in an `http.extraheader` setting. Whether the six URLs hold one token or
several was not compared, and whether the tokens are still valid was not tested.

Not done, by instruction: no token revoked or replaced, no sibling remote rewritten.

Earlier exposure to be aware of: during the relocation inspection in this same session
these URLs were printed unredacted into the session's terminal output. They therefore
also exist in the local session transcript. Treat every token as exposed.

Owner actions required:

1. Revoke the tokens on GitHub (Settings, Developer settings, Personal access tokens),
   and check the account's security log for unexpected use.
2. After revocation, approve replacing each sibling remote URL with the plain
   `https://github.com/<owner>/<repo>.git` form and let Git Credential Manager hold
   the sign-in.

### 4.2 This repository

| Check | Result |
|---|---|
| `origin` URL contains credentials | no (PASS) |
| GitHub token patterns in tracked or working files | 0 files (PASS) |
| Google API key patterns | 0 files (PASS) |
| Private key blocks | 0 files (PASS) |
| `.env` tracked | no; only `.env.example` (PASS) |

Pattern scan only; it covers the tracked files in the working tree. Older commits and
the backup refs were NOT scanned in this audit.

## 5. Commands executed

All run once, against tree `0a3ede3f`. The last earlier run was against the same code
(no code file was newer than the previous build output); it was repeated here so the
result is tied to a recorded tree hash.

| Command | Exit code | Result |
|---|---|---|
| `git` read-only inspection (`rev-parse`, `for-each-ref`, `diff`, `diff --cached`, `ls-files`, `remote get-url` piped through redaction, `grep`) | 0 | sections 1 to 4 |
| `npm run lint` (`tsc --noEmit`) | 0 | no errors |
| `npm test` | 0 | 106 tests, 106 passed, 0 failed, 0 skipped |
| `npm run build` | 0 | 2,603 modules; `dist/404.html` and `dist/server.cjs` present |

After the commands, `git status` was unchanged and the owner's dev server on port 3000
was still listening.

## 6. Test results and untested areas

| Area | Status | Basis |
|---|---|---|
| Typecheck | PASS | exit 0 |
| Unit, integration and physics tests | PASS | 106 of 106, the expected count |
| PINN golden regression | PASS | 76 scenarios identical, fixture hash pinned |
| Production build | PASS | exit 0 |
| API route registration | PASS | six routes registered through `API_PATHS` in the HEAD order; 24 API tests exercise them through the real app |
| Frontend imports, stale paths | PASS | 0 references to any old file or export name in `src`, `server`, `tests`, `scripts`, `README.md`, `docs` (the relocation report mentions the old names on purpose) |
| Browser rendering | NOT TESTED in this audit | last checked in the alignment task on a fresh server: engine and computer-vision pages and the public dashboard only |
| Role permissions in the browser | NOT TESTED | unit tests cover the guard functions (10 RBAC tests); no role was exercised in a browser here |
| Mobile layout | NOT TESTED | |
| PDF export | NOT TESTED | |
| Report creation and upvote flows in the browser | NOT TESTED | |
| GitHub Pages | NOT TESTED | nothing was deployed |
| Gemini narrative with a valid key | NOT TESTED | the machine's key is rejected by Google; only the fallback path runs |

## 7. Suspected behaviour changes and risks

No behaviour change was found. Risks, in order of importance:

1. **Exposed GitHub tokens** in six sibling repositories (section 4.1).
2. **Index state.** A plain `git commit` now would record moves without their edits
   and omit ten new files. Stage everything explicitly before committing (section 8).
3. **Local and remote histories are unrelated.** A push of this branch creates a new
   branch on GitHub; a push to `main` would be rejected. Reconciliation is still an
   open decision.
4. **Renamed exports** are an API change for any code outside this repository that
   imports the page components. Inside the repository every importer is updated.
5. **Look-alike sibling folders**: `pavementpinn-navigate` is at the commit that is
   `main` on GitHub. Work done there by mistake would diverge further.
6. Pre-existing, unchanged: no backend authentication; the PINN engine is a
   deterministic closed-form model (`validation/PINN_VALIDATION_GAP.md`); a possible
   sidebar overlap at about 800 px width, not verified.

## 8. Recommended commit grouping

Not executed. Two commits on `restructure/modular-architecture`, in this order:

**Commit A, `test: PINN mathematical audit and validation gap`** (earlier task)

- `tests/physics-validation/pinn-mathematical-audit.test.ts`
- `docs/validation/PINN_VALIDATION_GAP.md`
- `docs/validation/PINN_REGRESSION_REPORT.md`
- `README.md`
- `docs/validation/POST_RESTRUCTURE_HARDENING.md` as it was before the alignment
  (the alignment later changed 3 lines in it; simplest is to put the whole file in
  commit B instead)

**Commit B, `refactor: align file layout with target structure`**

- the nine staged renames and the delete, with their content edits
- the five `server/routes/*.routes.ts` files and `server/routes/index.ts`
- the three new computer-vision files
- the four importers
- `docs/api/API_INVENTORY.md`, `docs/architecture/DEPENDENCY_MAP.md`,
  `docs/architecture/ROUTE_MAP.md`, `docs/RELOCATION_REPORT.md`,
  `docs/POST_STRUCTURE_AUDIT.md`

A single commit of everything is also acceptable; the split only keeps the scientific
audit separate from the file moves. Either way the result must equal tree `0a3ede3f`
plus this file. Commit A alone was verified earlier (it is the content of
`refs/backup/pre-structure-alignment`); commit B is the state verified in section 5.

## 9. Awaiting approval

- Commit (grouping above), and whether to push the branch.
- Token revocation by the owner, then approval to clean the six sibling remote URLs.
- History reconciliation between local and `origin/main`.
