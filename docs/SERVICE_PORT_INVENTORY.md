# Service and port inventory

No secrets here. Live values come from the commands below, not from this file; the table records
what was observed on 2026-10-19 so a reader knows what "normal" looks like.

## Services

| Service | Working directory | Port | Protocol | Start command | Identity / health | Depends on |
|---|---|---|---|---|---|---|
| PINN runtime (Express API + Vite dev middleware, one workflow store) | repository root | 3000 by default (`--port`) | HTTP + websocket (HMR) | `npm run dev` | `GET /api/runtime` (runtime id, PID, commit, code sync), `GET /api/health` | `.data/` (store, session key), optional Python engine |
| Alias port (forwarder to the runtime) | repository root | any extra `--port` (e.g. 5173) | HTTP + websocket | `npm run dev -- --port 5173` while a runtime runs | same `/api/runtime` answer as the runtime (same runtime id) | the registered runtime |
| Independent runtime (experiments only) | repository root | chosen | HTTP | `npm run dev -- --port N --independent --data-dir <dir>` | own runtime id, own store | its own data dir |
| Python inference engine | `engine/` | 8100 (`INFERENCE_URL`) | HTTP | see `engine/README` | engine health route; Express returns 503 `INFERENCE_UNAVAILABLE` when down | — |
| Production server (built) | repository root | `PORT` | HTTP | `npm run build && npm start` | `/api/runtime`, `/api/health` | `dist/` |
| Live static site | GitHub Pages (`gh-pages` branch) | 443 | HTTPS | GitHub Actions `Deploy to GitHub Pages` | `/<repo>/version.json` | — |

Observed 2026-10-19 (`npm run dev:status`):

```
port  server        runtime   pid    role               commit   code    store
3000  PINN runtime  2fdb3eb6  33716  primary            58a2342  SYNCED  1a564feff95b
5173  PINN runtime  2fdb3eb6  33716  alias (forwarder)  58a2342  SYNCED  1a564feff95b
✓ consistent: every port reaches the same runtime and store; code is up to date.
```

## Commands

| Need | Command |
|---|---|
| Start (or add ports to) the one runtime | `npm run dev [-- --port N ...]` |
| Restart after server/domain edits (verified: only the registered runtime is stopped) | `npm run dev:restart` |
| Which process, commit, store and code state answers each port | `npm run dev:status` |
| Same, failing (exit 1) on any inconsistency | `npm run dev:check` |
| Identity of one port | `curl http://localhost:<port>/api/runtime` |
| Revision of the live site | `curl https://farrelberwyn.github.io/Pavement-PINN/version.json` |

## Why ports cannot drift apart

- One registered runtime per checkout (`.data/dev-runtime.json`); a second `npm run dev` becomes an alias, never a second backend or store.
- A taken port is reported with its owner and never killed.
- `/api/runtime` reports a content fingerprint of the loaded server code; the UI banner warns when files changed after start, and `npm run dev:restart` clears it.
- Other worktrees/branches are not served; `dev:status` lists them when present.
