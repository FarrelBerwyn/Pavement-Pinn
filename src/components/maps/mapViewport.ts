/**
 * Guards for Leaflet view changes while the map container has no size.
 *
 * Leaflet's `flyTo` divides by the larger map dimension. When a map is created or moved
 * while its container is 0 x 0 (hidden tab, collapsed panel, `display: none` ancestor)
 * the animation maths yields NaN and Leaflet throws "Invalid LatLng object: (NaN, NaN)"
 * from inside a React effect, which unmounts the whole application.
 *
 * The helpers below are written against a structural type instead of importing Leaflet,
 * so they can be unit-tested in Node without a DOM.
 */

export interface MapSize {
  x: number;
  y: number;
}

/** The subset of `L.Map` used here. */
export interface ViewportMap {
  getSize(): MapSize;
  flyTo(center: unknown, zoom?: number, options?: unknown): unknown;
  setView(center: unknown, zoom?: number, options?: unknown): unknown;
  fitBounds(bounds: unknown, options?: unknown): unknown;
  invalidateSize(options?: unknown): unknown;
  on?(type: string, handler: () => void): unknown;
}

/** View changes that could not be applied yet because the map had no size. */
const pendingViewChange = new WeakMap<object, () => void>();

export function mapHasSize(map: ViewportMap): boolean {
  const size = map.getSize();
  return Number.isFinite(size.x) && Number.isFinite(size.y) && size.x > 0 && size.y > 0;
}

/**
 * `map.flyTo` when the map is visible. Without a size the animation cannot be computed,
 * so the view is set directly (no animation); once the container gets a size,
 * `recoverMapSize` re-centres it.
 */
export function safeFlyTo(map: ViewportMap, center: unknown, zoom?: number, options?: unknown): void {
  if (mapHasSize(map)) {
    pendingViewChange.delete(map);
    map.flyTo(center, zoom, options);
    return;
  }
  map.setView(center, zoom, { animate: false });
}

/**
 * `map.fitBounds` when the map is visible. The zoom that fits a bounding box depends on
 * the map size, so without one the request is remembered and applied on recovery.
 */
export function safeFitBounds(map: ViewportMap, bounds: unknown, options?: unknown): void {
  if (mapHasSize(map)) {
    pendingViewChange.delete(map);
    map.fitBounds(bounds, options);
    return;
  }
  pendingViewChange.set(map, () => map.fitBounds(bounds, options));
}

/** Re-measure the map and apply a view change that was waiting for a size. */
export function recoverMapSize(map: ViewportMap): void {
  map.invalidateSize();
  if (!mapHasSize(map)) return;
  const pending = pendingViewChange.get(map);
  if (pending) {
    pendingViewChange.delete(map);
    pending();
  }
}

/**
 * Keep a map in sync with its container: Leaflet itself only reacts to window resizes,
 * not to the container appearing or changing size. Stops observing when the map is
 * removed. Returns a disposer for callers that prefer to clean up explicitly.
 */
export function attachMapResizeRecovery(map: ViewportMap, container: Element | null): () => void {
  if (!container || typeof ResizeObserver === 'undefined') return () => {};
  const observer = new ResizeObserver(() => {
    if (container.isConnected) recoverMapSize(map);
  });
  observer.observe(container);
  const dispose = () => observer.disconnect();
  map.on?.('unload', dispose);
  return dispose;
}
