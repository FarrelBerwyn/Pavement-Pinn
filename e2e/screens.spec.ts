/**
 * Captures each workspace tab, the PINN index and the tracking page for the side-by-side
 * comparison with mockups/png (structure, zones, tab order, panel contents — not pixels).
 * Output: docs/handoff/ui-workspace/screenshots/.
 */
import { test } from '@playwright/test';
import { DEMO_CREDENTIALS } from '../src/data/reference/demoCredentials';

const OUT = 'docs/handoff/ui-workspace/screenshots';

test('capture workspace screens as Ops Manager', async ({ page }) => {
  const c = DEMO_CREDENTIALS.find((x) => x.role === 'OPERATIONS_MANAGER')!;
  await page.goto('login/');
  await page.getByPlaceholder('nama@instansi.go.id atau username').fill(c.username);
  await page.getByPlaceholder('Masukkan kata sandi').fill(c.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login/'));
  await page.goto('operations/pinn/');
  await page.getByTestId('pinn-kpis').waitFor();
  await page.screenshot({ path: `${OUT}/0_index.png` });
  const tabs = [['overview', '1_overview'], ['camera', '2_camera'], ['3d', '3_3d'], ['structure', '4_structure'], ['pinn', '5_pinn'], ['validation', '6_validation']];
  for (const [tab, name] of tabs) {
    await page.goto(`operations/pinn/ROAD-2026-001/?obj=POTHOLE-024&tab=${tab}`);
    await page.getByTestId(`main-${tab}`).waitFor();
    await page.waitForTimeout(tab === '3d' || tab === 'overview' || tab === 'camera' ? 2500 : 600);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
  const code = (await page.getByTestId('tracking-code').innerText()).trim();
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(`track/${code}/`);
  await page.getByTestId('track-page').waitFor();
  await page.screenshot({ path: `${OUT}/7_pengguna.png`, fullPage: true });
});
