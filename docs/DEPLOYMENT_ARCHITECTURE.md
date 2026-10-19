# Deployment architecture

Repository: https://github.com/FarrelBerwyn/Pavement-Pinn

There are two ways PAVEMENT-PINN runs today, and they are deliberately different.

| | Local full stack | Live: GitHub Pages (static demo) |
|---|---|---|
| Frontend | Vite (dev middleware inside the Express runtime) | Static build in `gh-pages`, served by GitHub Pages over HTTPS |
| API | Express, same origin, `/api/*` | **None.** The browser uses the offline demo gateway |
| Login | Server-checked demo credentials, HttpOnly session cookie, 2-hour absolute limit | Demo credentials checked in the browser (no security; labelled in the UI) |
| Workflow store | `.data/workflow.json` (file) | In-memory, per browser tab |
| PINN / layered-elastic engine | Python inference service (`engine/`), called by Express | Not available (pages explain this instead of faking results) |
| Revision identity | `GET /api/runtime` (runtime id, PID, commit, code fingerprint) | `GET <site>/version.json` (commit SHA, build time, run id) |

## Request flow

Local:

```
Browser ──same origin──▶ Express runtime (one process, one store)
                          ├─ /api/*            → routes (auth, workflow, intelligence, engine proxy)
                          │                       └─ Python engine (INFERENCE_URL) for /api/engine/*
                          └─ everything else   → Vite dev middleware (HMR on the same server)
Alias ports (npm run dev -- --port N) forward HTTP and websockets to the same runtime.
```

Live (static):

```
Browser ──HTTPS──▶ GitHub Pages: index.html, assets, 404.html (SPA deep links), version.json
                   no /api: `isStaticHost()` (hostname ends with github.io) switches the app to the
                   offline gateway, so no request goes to localhost or to a missing backend.
```

## Configuration (single sources of truth)

| Setting | Where | Notes |
|---|---|---|
| Base path | `VITE_BASE_PATH` → `src/constants/deployment.ts` | Pages build sets `/<repo name>/` (`/Pavement-Pinn/`); Express uses the same value |
| API origin | same origin (`src/services/api/client.ts` `apiUrl`) | No API host is baked into the browser bundle |
| Session | `SESSION_SECRET` (≥ 32 chars) | Unset locally: a key kept in `.data/session-secret` (gitignored) |
| Session limit | fixed 7200 s | `SESSION_MAX_AGE_SECONDS` may only shorten it, never in production |
| Demo login | `DEMO_AUTH` | `false` turns the demo account picker off |
| Python engine | `INFERENCE_URL` | Server-side only |
| Port / data | `PORT`, `DATA_DIR` | See `docs/SERVICE_PORT_INVENTORY.md` |

`.env.example` lists these with placeholders. Real values never go in the repository.

## Authentication and cookies

- Server mode: `POST /api/auth/login` sets `pinn_session` (HttpOnly, SameSite=Lax, Path=/, `Secure` in production / over HTTPS), valid until `issuedAt + 2 h`. Nothing extends it. Every `/api` request with an expired or revoked session is refused with 401 `SESSION_EXPIRED`. `POST /api/auth/logout` revokes the token.
- Same-origin only: there is no cross-origin API today, so no CORS headers are emitted. A split frontend/API deployment must add an explicit CORS allow-list and `SameSite=None; Secure` cookies (see the upgrade path).

## Upgrade path: full stack on Vercel

GitHub Pages cannot run the Express API, the session store or the Python engine. To go live with them:

1. Authorize the Vercel connector (or link the repo in the Vercel dashboard).
2. Serve the Express app as one serverless function (`api/index.ts` exporting `createApp()`), with `vercel.json` rewriting `/api/(.*)` to it and everything else to the static build (`VITE_BASE_PATH=/`).
3. Replace the file store (`.data/workflow.json`) with a hosted database (Supabase is the planned one, D-021); a serverless filesystem does not persist.
4. Set `SESSION_SECRET`, `DEMO_AUTH`, `INFERENCE_URL` in Vercel's environment settings.
5. Host the Python engine separately (it needs a long-running process) and point `INFERENCE_URL` at it.
6. Keep same origin (frontend and `/api` on one Vercel domain) so cookies and auth need no CORS.

Until then the live site is the static demo, and says so.
