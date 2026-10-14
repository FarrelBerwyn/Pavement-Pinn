/**
 * Frontend API client primitives.
 *
 * The backend mounts its API at the origin root (`/api/...`), independent of the
 * Vite `base` used for the SPA assets, so API URLs are root-absolute — exactly as
 * they were before the restructure.
 */

/** Resolve an API path (e.g. `/api/health`) to the URL the browser should request. */
export function apiUrl(path: string): string {
  return path;
}

/**
 * GitHub Pages serves only the static build: there is no Express backend there.
 * Callers use this to skip network calls and fall back to offline behaviour.
 */
export function isStaticHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
}
