# Development runtime: one system, many ports

A port is an access path, not a copy of the system. Every port opened with the commands below
reaches **one runtime**: one Express app, one workflow store (`.data/workflow.json`), one session
signer and one Vite dev server (HMR on every port).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the runtime on `PORT` or 3000. If a runtime of this project is already running, the port becomes an alias of it instead. |
| `npm run dev -- --port 3001 --port 5173` | Runtime on 3001; 5173 is an in-process alias (same app, store, sessions, HMR). |
| `npm run dev -- --port 3002` (runtime already running) | Forwarder alias on 3002 → the runtime's primary port (HTTP and websockets). Ctrl+C stops only the alias. |
| `npm run dev:status [port…]` | Table of every PAVEMENT-PINN port: runtime id, PID, role (primary / in-process alias / forwarder), commit, code status, store id, project root. |
| `npm run dev:check` | Same, exit 1 on: two runtimes sharing one store, another project root, a runtime running another commit than this checkout, changed server code, or a server without `/api/runtime`. |
| `npm run dev -- --independent --data-dir .data-x --port 4173` | Explicitly isolated runtime with its own store (experiments only; not registered, its data is not shared). |
| `npm run dev:server` | Plain single-port server (`tsx server/index.ts`), as in production. |

A port that is taken is reported with who holds it (`PINN runtime …`, `older PINN server`, or
`another program`); the launcher never stops other processes.

## How it fits together

- **Canonical root**: the folder containing `scripts/dev/launch.ts`; the launcher `chdir`s there and
  prints branch, commit and uncommitted-file count (uncommitted files are what runs). With more than one
  git worktree it says that other worktrees are not served until merged here.
- **Registry**: `.data/dev-runtime.json` (runtime id, PID, ports) and `.data/dev-aliases.json`
  (forwarders). A record whose PID is gone or whose port answers with another runtime id is ignored.
- **Identity**: `GET /api/runtime` — runtime id (per process), ports, request port, project name and
  root hash, branch/commit/dirty count, code sync status with changed files, store kind + hash
  (`storeId`) + repo-relative location (`outside-project` otherwise). No secrets, no absolute paths.
- **Stale code**: `GET /api/health` `server.syncStatus` compares the commit and the *content* of
  `server/` and `src/domain/` with what the process loaded (a file saved without changes is not
  stale). The banner lists the changed files. `dev:check` also compares each runtime's commit with
  this checkout, so a runtime cannot report itself in sync while running other code.
- **Data**: all ports read and write the same store through the same process. Across processes the
  file store uses a lock and compare-and-swap (D-042), so even an independent runtime pointed at the
  same file cannot overwrite newer data — but sessions and caches would be separate, which `dev:check`
  reports. Browser-only state (drafts, read marks, theme) stays per browser and per origin (port).

## Tested (2026-10-18)

- A: runtime on 3001 + in-process alias 5173 + forwarders 3002 and 3000 → one runtime id and store id on all four.
- B: report created through one port, read identically through all four; one copy on disk.
- C: transition through 5173 visible on 3000/3001/3002 with the same version and timestamp; citizen accept → 403; stale version via 3002 → 409; a token from one port works on the others.
- D: independent runtime with a simulated commit on 4173 → `dev:check` exits 1 for 4173 only; the main runtime has no warning.
- E: starting on a taken port fails with the holder's identity; the holder keeps running.
- F: runtime restart keeps data; forwarders reconnect to the new runtime; while it is down they answer 502 with a message.
