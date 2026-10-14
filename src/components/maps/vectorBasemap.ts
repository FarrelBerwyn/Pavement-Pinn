/**
 * Basemap styles for the MapLibre (globe) map and the order in which they are tried.
 *
 * Pure module: no MapLibre import, so the selection can be unit-tested.
 *
 * Providers
 * - MapTiler: used when a browser key is configured (VITE_MAPTILER_KEY). MapTiler keys
 *   for map display are public by design and must be restricted to the site's origins in
 *   the MapTiler dashboard; they are not secrets, but they are also never hard-coded here.
 * - OpenFreeMap: keyless vector tiles, used when no key is configured and as the fallback.
 * - Esri World Imagery: raster imagery for the satellite style when no key is configured.
 *
 * All three draw on OpenStreetMap-derived or licensed data; the attribution shown on the
 * map comes from the sources themselves, plus the entries declared below for sources
 * whose metadata carries none.
 */
import type { BaseMapStyle } from './basemap';

export type BasemapProvider = 'MAPTILER' | 'OPENFREEMAP' | 'ESRI_IMAGERY' | 'NONE';

/** Minimal style used when no basemap can be loaded: data layers still render on it. */
export const EMPTY_STYLE = {
  version: 8 as const,
  name: 'pavement-pinn-empty',
  sources: {},
  layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': '#dde5ea' } }]
};

const ESRI_IMAGERY_STYLE = {
  version: 8 as const,
  name: 'pavement-pinn-imagery',
  sources: {
    imagery: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
    }
  },
  layers: [{ id: 'imagery', type: 'raster' as const, source: 'imagery' }]
};

export type BasemapStyleInput = string | typeof EMPTY_STYLE | typeof ESRI_IMAGERY_STYLE;

export interface BasemapCandidate {
  provider: BasemapProvider;
  /** A style URL, or an inline style object. */
  style: BasemapStyleInput;
  /** Human-readable name for the status notice; never contains the key. */
  label: string;
}

const OPENFREEMAP: Record<BaseMapStyle, string | null> = {
  LIGHT: 'https://tiles.openfreemap.org/styles/liberty',
  DARK: 'https://tiles.openfreemap.org/styles/dark',
  SATELLITE: null
};

const MAPTILER: Record<BaseMapStyle, string> = {
  LIGHT: 'streets-v2',
  DARK: 'streets-v2-dark',
  SATELLITE: 'hybrid'
};

/** A usable key is a non-empty token without whitespace; anything else counts as "not configured". */
export function normalizeMaptilerKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  return key !== '' && /^[A-Za-z0-9_-]+$/.test(key) ? key : null;
}

/**
 * Ordered styles to try for a basemap choice. The last entry is always the empty style,
 * so the data layers have something to render on even with no network.
 */
export function basemapCandidates(style: BaseMapStyle, maptilerKey?: unknown): BasemapCandidate[] {
  const key = normalizeMaptilerKey(maptilerKey);
  const candidates: BasemapCandidate[] = [];

  if (key) {
    candidates.push({
      provider: 'MAPTILER',
      style: `https://api.maptiler.com/maps/${MAPTILER[style]}/style.json?key=${key}`,
      label: 'MapTiler'
    });
  }

  const keyless = OPENFREEMAP[style];
  if (keyless) {
    candidates.push({ provider: 'OPENFREEMAP', style: keyless, label: 'OpenFreeMap' });
  } else {
    candidates.push({ provider: 'ESRI_IMAGERY', style: ESRI_IMAGERY_STYLE, label: 'Esri World Imagery' });
  }

  // A different provider than everything above, before giving up on a basemap entirely
  if (style !== 'LIGHT') {
    candidates.push({ provider: 'OPENFREEMAP', style: OPENFREEMAP.LIGHT as string, label: 'OpenFreeMap' });
  }

  candidates.push({ provider: 'NONE', style: EMPTY_STYLE, label: '' });
  return candidates;
}

/** Style URL with any key removed, safe to put in a log line or a test message. */
export function redactStyle(style: BasemapStyleInput): string {
  return typeof style === 'string' ? style.replace(/([?&]key=)[^&]+/, '$1[REDACTED]') : `inline:${style.name}`;
}
