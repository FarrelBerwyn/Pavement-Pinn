/**
 * End-to-end tests (R7-01, handoff U6): the six-tab workspace on one active object, the
 * F.E correction -> M.O approval -> public tracking flow, and RBAC on the PINN pages.
 * Runs a fresh dev server (own data dir) and the real Python inference service.
 */
import { defineConfig } from '@playwright/test';

const APP_PORT = 5277;
const PY_PORT = 8177;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${APP_PORT}/PavementPinn/`, viewport: { width: 1600, height: 1000 }, screenshot: 'only-on-failure' },
  webServer: [
    {
      command: `inference/.venv/bin/python -m uvicorn app.main:app --app-dir inference --port ${PY_PORT}`,
      url: `http://127.0.0.1:${PY_PORT}/v1/geometry/health`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      // Fresh data dir per run: every run starts from the seeded demo data.
      command: `rm -rf .data/e2e && npm run dev -- --port ${APP_PORT} --independent --data-dir .data/e2e`,
      url: `http://localhost:${APP_PORT}/api/health`,
      env: { INFERENCE_URL: `http://127.0.0.1:${PY_PORT}` },
      reuseExistingServer: false,
      timeout: 180_000
    }
  ]
});
