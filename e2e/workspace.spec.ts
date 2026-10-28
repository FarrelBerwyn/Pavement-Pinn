/**
 * R7-01 golden path for the Analysis Workspace (handoff prompt §3 + addendum "Tes tambahan").
 * Demo credentials come from src/data/reference/demoCredentials.ts (local test values).
 */
import { expect, test, type Page } from '@playwright/test';
import { DEMO_CREDENTIALS } from '../src/data/reference/demoCredentials';

const cred = (role: string) => DEMO_CREDENTIALS.find((c) => c.role === role)!;
const WS = 'operations/pinn/ROAD-2026-001/';

async function login(page: Page, role: string) {
  await page.goto('login/');
  const c = cred(role);
  await page.getByPlaceholder('nama@instansi.go.id atau username').fill(c.username);
  await page.getByPlaceholder('Masukkan kata sandi').fill(c.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login/'));
}

async function logout(page: Page) {
  await page.context().clearCookies();
}

const chip = (page: Page) => page.getByTestId('active-object-chip');

test.describe.serial('Analysis Workspace', () => {
  test('policy maker and citizens cannot open the PINN pages; the sidebar shows PINN only to M.O/F.E', async ({ page }) => {
    await login(page, 'POLICY_MAKER');
    await expect(page.getByTestId('nav-pinn')).toHaveCount(0);
    await page.goto('operations/pinn/');
    await expect(page.getByTestId('pinn-index')).toHaveCount(0);
    const api = await page.request.get('/api/v3/workspaces');
    expect(api.status()).toBe(403);
    await logout(page);
    await login(page, 'PUBLIC_REPORTER');
    expect((await page.request.get('/api/v3/workspaces')).status()).toBe(403);
    await logout(page);
    await login(page, 'OPERATIONS_MANAGER');
    await expect(page.getByTestId('nav-pinn')).toBeVisible();
  });

  test('Ops Manager: sidebar -> list -> workspace; six tabs keep the active object; refresh keeps it', async ({ page }) => {
    await login(page, 'OPERATIONS_MANAGER');
    await page.getByTestId('nav-pinn').click();
    await expect(page.getByTestId('pinn-index')).toBeVisible();
    await expect(page.getByTestId('pinn-kpis')).toContainText('Laporan dalam analisis');
    await page.getByTestId('open-ROAD-2026-001').click();
    await expect(page.getByTestId('analysis-workspace')).toBeVisible();

    // Pick POTHOLE-024 explicitly (after switching away) from the object table.
    await page.getByTestId('object-table').getByText('CRACK-021').click();
    await expect(chip(page)).toHaveText('CRACK-021');
    await page.getByTestId('object-table').getByText('POTHOLE-024').click();
    await expect(chip(page)).toHaveText('POTHOLE-024');

    await page.getByTestId('tab-camera').click();
    await expect(chip(page)).toHaveText('POTHOLE-024');
    await expect(page.getByTestId('object-card')).toContainText('POTHOLE-024');

    await page.getByTestId('tab-3d').click();
    await expect(page.getByTestId('viewer-3d')).toBeVisible();
    await expect(page.getByTestId('indicator-panel')).toContainText('Volume (integrasi defisit)');
    await expect(page.getByTestId('object-card')).toContainText('POTHOLE-024');
    // The Ops Manager cannot edit geometry: the button is disabled with the reason.
    await expect(page.getByTestId('edit-contour')).toBeDisabled();
    await expect(page.getByTestId('edit-contour')).toHaveAttribute('title', 'Hanya Field Engineer');

    await page.getByTestId('tab-structure').click();
    await expect(page.getByTestId('main-structure')).toContainText('Bidang potong @ POTHOLE-024');

    await page.getByTestId('tab-pinn').click();
    await expect(page.getByTestId('pinn-heatmap')).toBeVisible();
    await expect(page.getByTestId('decision-summary')).toContainText('ASSUMED');
    await page.getByTestId('use-for-decision').click();
    await expect(page.getByTestId('assumed-list')).toContainText('Lapis AC: ASSUMED');
    await page.getByRole('button', { name: 'Batal' }).click();

    await page.getByTestId('tab-validation').click();
    await expect(page.getByTestId('main-validation')).toContainText('Validasi belum tersedia');

    await page.reload();
    await expect(chip(page)).toHaveText('POTHOLE-024');
    await expect(page.getByTestId('tab-validation')).toHaveAttribute('aria-selected', 'true');
  });

  test('Ops Manager cannot POST corrections (403)', async ({ page }) => {
    await login(page, 'OPERATIONS_MANAGER');
    const r = await page.request.post('/api/v3/reports/ROAD-2026-001/corrections', { data: { kind: 'class', objectId: 'POTHOLE-024', field: 'class.value', newValue: 'pothole', reason: 'uji akses M.O' } });
    expect(r.status()).toBe(403);
  });

  test('F.E corrects the contour, M.O approves, /track shows the revision', async ({ page }) => {
    await login(page, 'FIELD_ENGINEER');
    await page.goto(`${WS}?obj=POTHOLE-024&tab=3d`);
    const before = await page.getByTestId('indicator-panel').innerText();
    await page.getByTestId('edit-contour').click();
    await expect(page.getByTestId('polygon-editor')).toBeVisible();
    await page.getByTestId('correction-reason').fill('Batas lubang dikoreksi setelah cek lapangan');
    await page.getByTestId('correction-submit').click();
    // T4–T5 rerun on the real inference service; the volume becomes "corrected".
    await expect(page.getByTestId('indicator-panel')).toContainText('corrected', { timeout: 30_000 });
    expect(await page.getByTestId('indicator-panel').innerText()).not.toEqual(before);

    await page.getByTestId('tab-overview').click();
    await page.getByTestId('submit-version').click();
    await page.getByTestId('version-text').fill('Petugas lapangan memperbaiki batas lubang.');
    await page.getByTestId('version-confirm').click();
    await expect(page.getByTestId('version-actions')).toContainText('menunggu persetujuan');
    // The corrector cannot approve: no approve button for the F.E.
    await expect(page.getByTestId('approve-v1')).toHaveCount(0);
    const code = (await page.getByTestId('tracking-code').innerText()).trim();

    await logout(page);
    await login(page, 'OPERATIONS_MANAGER');
    await page.goto('operations/pinn/');
    await expect(page.getByTestId('approval-queue')).toContainText('ROAD-2026-001 · v1');
    await page.goto(WS);
    await page.getByTestId('approve-v1').click();
    await page.getByTestId('version-confirm').click();
    await expect(page.getByTestId('version-actions')).not.toContainText('menunggu persetujuan');

    await page.goto(`track/${code}/`);
    await expect(page.getByTestId('track-page')).toContainText('Diverifikasi petugas');
    await expect(page.getByTestId('track-changes')).toContainText('Petugas lapangan memperbaiki batas lubang.');
    // No personal data on the public page.
    await expect(page.getByTestId('track-page')).not.toContainText('Ahmad');
    await expect(page.getByTestId('track-page')).not.toContainText('Hendra');
  });

  test('"Analisis PINN" on a report card opens the same report', async ({ page }) => {
    await login(page, 'OPERATIONS_MANAGER');
    await page.goto('operations/tasks/');
    const link = page.locator('[data-testid^="pinn-link-REP-KRW-"]').first();
    const id = (await link.getAttribute('data-testid'))!.replace('pinn-link-', '');
    await link.click();
    await expect(page.getByTestId('report-id')).toHaveText(id);
    // A citizen report without a 3D sequence still opens; geometry tabs say why and offer the task.
    await page.getByTestId('tab-3d').click();
    await expect(page.getByTestId('unavailable-card')).toContainText('Tugaskan FE ambil sekuens');
  });
});
