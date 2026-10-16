# Deployment

## What can be deployed today

| Target | Contents | Workflow API | Status |
|---|---|---|---|
| GitHub Pages (`.github/workflows/deploy.yml`, push to `main`) | static SPA only | **none** — the app detects `github.io` and runs the workflow in the browser's memory, labelled "DEMO OFFLINE" | works; no persistence, no server authorization |
| Node server (`npm run build && npm start`) | SPA + Express API + workflow store | yes | ready to run on any Node 20 host with a writable `DATA_DIR` |
| Supabase (PostgreSQL/PostGIS, Auth, Storage) | schema in `supabase/migrations/` | not wired | **BLOCKED**: no project credentials |

Nothing has been deployed or pushed from this work.

## Run the full system on a Node host

```bash
npm ci
npm run build
```

```bash
PORT=3000 DATA_DIR=/var/lib/pavement-pinn SESSION_SECRET=<64 hex chars> NODE_ENV=production npm start
```

- `DATA_DIR` must be on persistent storage (the JSON snapshot is the database in this
  mode; back it up like one). Writes are atomic (temp file + rename).
- `SESSION_SECRET` (≥ 32 chars) keeps sessions valid across restarts.
- `DEMO_AUTH=false` disables demo login (the five public dummy credentials) where real
  users exist; anonymous citizen reporting keeps working. There is no other login until
  an identity provider is connected. Do not set `VITE_DEMO_ACCESS` for production builds
  (docs/LOGIN_AND_DEMO_AUTH.md).
- Serve behind HTTPS (reverse proxy or platform TLS). The app sets `nosniff`,
  `Referrer-Policy` and `X-Frame-Options`; add HSTS at the proxy.
- Health: `GET /api/health` (liveness) and `GET /api/system-health` (component status).
- Rate limits are per process; run one instance or add a shared limiter.

## Moving to Supabase (when a project exists)

1. Create the project; enable PostGIS.
2. Apply `supabase/migrations/20261014000000_workflow_core.sql` with the Supabase CLI
   (`supabase db push`) on a non-production project first.
3. Implement a `SupabaseCaseStore` behind `CaseStore` that writes the case, its child
   records and audit rows in one transaction (service-role key on the server only).
4. Replace `/api/auth/login` (demo credentials) with verification of Supabase Auth JWTs; map users to
   `profiles.role` (assigned by an administrator, never self-chosen).
5. Move photos to a private Storage bucket; store only object keys.
6. Seed `road_segments` from digitised geometry (G-01) instead of illustrative points.

Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in a `VITE_*` variable.

## CI

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint` (typecheck), `npm test` and
`npm run build` on pull requests and pushes. It has not run yet because nothing was pushed.
