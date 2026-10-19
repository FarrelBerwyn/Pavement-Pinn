# GitHub and deployment runbook

Repository: https://github.com/FarrelBerwyn/Pavement-PINN (remote name `pavement-pinn` in the local
checkout; the older `origin`, FarrelBerwyn/PavementPinn, has an unrelated history and is not pushed to).

## Commit and push

1. `npm run lint && npm test && npm run build` — all must pass.
2. Check nothing secret is staged: `git status`, and never `.env`, `.data/` (store, session key), keys or dumps. `.gitignore` covers `.env*` (except `.env.example`) and `.data/`.
3. Commit; the trailer is `Co-Authored-By: Pavement-PINN <farrel.berwyn18@gmail.com>`.
4. Push the working branch: `git push pavement-pinn <branch>`. Deploying means updating `main` there: `git push pavement-pinn <branch>:main` (fast-forward only; never `--force` on `main`).
5. Verify the remote SHA: `git ls-remote pavement-pinn refs/heads/main` equals `git rev-parse HEAD`.

## GitHub Actions

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | push to branches other than `main`, PRs | `npm ci`, typecheck, tests, build |
| `deploy.yml` | push to `main`, manual run | job `verify` (typecheck + tests) must pass, then `vite build` with `VITE_BASE_PATH=/<repo>/`, writes `version.json` (commit, run id), publishes `dist/` to the `gh-pages` branch |

A failing check stops the deploy; the previous site stays up.

## Hosting configuration (one-time, repository owner)

Settings → Pages → Build and deployment: **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.
Site: https://farrelberwyn.github.io/Pavement-PINN/

No secrets are needed for the static site. A full-stack deployment needs `SESSION_SECRET`,
`DEMO_AUTH`, `INFERENCE_URL` (and database credentials) set in that host's environment settings, never in the repo
(see `docs/DEPLOYMENT_ARCHITECTURE.md`, Vercel upgrade path).

## Verify a deployment

1. Actions run green (both jobs).
2. `curl https://farrelberwyn.github.io/Pavement-PINN/version.json` → `commit` equals the pushed SHA.
3. Open the site, sign in with a demo account (static demo login), check the roles' pages and the map.

## Rollback

- Re-deploy an earlier revision: Actions → Deploy to GitHub Pages → Run workflow on a tag/branch at that commit; or revert the bad commit on `main` (`git revert`) and push.
- Never force-push `main` or `gh-pages`.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Blank page, 404 on `/assets/...` | Wrong base path: the build must use `/<repo name>/` (the workflow sets it) |
| Deep link 404 | `404.html` missing from `dist/` (vite.config.ts copies it) |
| Site not updating | Pages source not set to `gh-pages`, or the deploy job failed (see the run log) |
| Login/API errors on the live site | Expected for server features: Pages has no backend; the app uses the offline demo gateway |
