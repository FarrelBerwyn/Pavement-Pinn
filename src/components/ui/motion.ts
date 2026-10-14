/**
 * Motion preferences shared by components that animate outside CSS (map cameras).
 * CSS transitions read the same intent from the media query in styles/index.css.
 */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
