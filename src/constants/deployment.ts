/**
 * Deployment base path — single source of truth for the Vite `base`, the Express
 * static mount and the client router.
 *
 * GitHub Pages serves this project at https://<user>.github.io/PavementPinn/, so the
 * default must stay `/PavementPinn/`. Override with the VITE_BASE_PATH env var
 * (e.g. `VITE_BASE_PATH=/` for a root-hosted deployment).
 */
export const DEFAULT_BASE_PATH = '/PavementPinn/';

/** Normalise to a leading and trailing slash: `PavementPinn` becomes `/PavementPinn/`, empty becomes `/`. */
export function normalizeBasePath(input?: string | null): string {
  const raw = (input ?? '').trim();
  if (raw === '') return DEFAULT_BASE_PATH;
  const trimmed = raw.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}
