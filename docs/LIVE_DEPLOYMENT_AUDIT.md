# Live deployment audit — 2026-10-19

Only what was observed is recorded here; anything not verified is listed under blockers.

## Repository

| | |
|---|---|
| Repository | https://github.com/FarrelBerwyn/Pavement-Pinn (renamed from `Pavement-PINN`; GitHub redirects the old URL) |
| Branch deployed | `main` |
| First push | `11de31a` — verified identical on GitHub (`git ls-remote` and the GitHub API) |
| Deployed commit | `735a42d` (CI fix: Node 22 so the test glob expands) |
| Older remote | `origin` = FarrelBerwyn/PavementPinn, unrelated history, not pushed to |

## Checks

| Check | Result | Evidence |
|---|---|---|
| Typecheck (local) | pass | `npm run lint` |
| Tests (local) | 323 / 323 pass | `npm test` |
| Build (local) | pass | `npm run build` (client + `dist/server.cjs`) |
| First deploy run | **failed at verify, nothing published** | run 39187395383: Node 20 did not expand `tests/**/*.test.ts`; the gate held |
| CI run on `735a42d` | success | `ci.yml` |
| Deploy run on `735a42d` | success (verify + build-and-deploy) | run 39187495460 |
| Pages enabled | yes, source `gh-pages` `/`, HTTPS enforced, status `built` | `gh api repos/FarrelBerwyn/Pavement-Pinn/pages` |

## Live site

URL: https://farrelberwyn.github.io/Pavement-Pinn/

| Check | Result |
|---|---|
| Served revision | `version.json` → commit `735a42da…`, run `39187495460`, built 2026-10-19T01:56:06Z (equals the pushed SHA) |
| `index.html` | HTTP 200 over HTTPS |
| Deep link (`/operations/`) | Pages answers with `404.html`, which is the app (SPA fallback), and the route renders |
| Login page | renders, labelled "Build statis tanpa server" |
| Public map (`/dashboard/`) | MapLibre globe, report pins, basemap tiles load |
| Requests to localhost / `127.0.0.1` | none |
| Requests to `/api` | none (static host detected, offline gateway used) |
| Console | only the deep-link 404 document and a browser-pane cache notice; no app errors |

## What this deployment is, and is not

- It is the **static demo**: frontend only, offline in-browser gateway, no backend.
- Not deployed (GitHub Pages cannot host them): Express API, server sessions and the 2-hour server limit, workflow store, Python inference/PINN engine, CV jobs. These run locally (`npm run dev`); the move to a full-stack host is described in `docs/DEPLOYMENT_ARCHITECTURE.md` (Vercel upgrade path).

## Blockers / not verified

1. Sign-in on the live site: enabled after this audit with `VITE_DEMO_ACCESS=true` (owner decision, 2026-10-19); the fictitious demo credentials are bundled and checked in the browser. See the follow-up section below.
2. Live role-by-role checks need the above, and are done by a person typing demo credentials (automation here does not enter passwords on non-local sites).
3. Backend, gateway, database, AI inference: not deployed (see above); no live API exists to test.
