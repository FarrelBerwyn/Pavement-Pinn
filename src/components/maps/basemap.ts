/**
 * Basemap sources and tile-failure handling for the Leaflet maps.
 *
 * Pure module (no Leaflet import) so the fallback decision can be unit-tested. When a
 * provider serves no tile at all, the map switches once to another provider instead of
 * staying blank; if that one fails too, the caller shows a notice and keeps the data
 * layers visible.
 */

export type BaseMapStyle = 'DARK' | 'SATELLITE' | 'LIGHT';

export interface BasemapSource {
  url: string;
  attribution: string;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap contributors';

const OSM_STANDARD: BasemapSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: OSM_ATTRIBUTION
};

const ESRI_LIGHT_GRAY: BasemapSource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: ESRI_ATTRIBUTION
};

export const BASEMAP_SOURCES: Record<BaseMapStyle, BasemapSource> = {
  SATELLITE: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI_ATTRIBUTION
  },
  LIGHT: OSM_STANDARD,
  DARK: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI_ATTRIBUTION
  }
};

/** The fallback always comes from a different provider than the primary source. */
export const BASEMAP_FALLBACKS: Record<BaseMapStyle, BasemapSource> = {
  SATELLITE: OSM_STANDARD,
  LIGHT: ESRI_LIGHT_GRAY,
  DARK: OSM_STANDARD
};

/** Failed tiles, with none loaded, before the current source is given up on. */
export const TILE_FAILURE_THRESHOLD = 4;

export type TileStage = 'primary' | 'fallback' | 'failed';

export interface TileHealth {
  stage: TileStage;
  loaded: number;
  errors: number;
}

export const INITIAL_TILE_HEALTH: TileHealth = { stage: 'primary', loaded: 0, errors: 0 };

export function recordTileLoad(health: TileHealth): TileHealth {
  return { ...health, loaded: health.loaded + 1 };
}

/**
 * A source is abandoned only when it has delivered nothing: single missing tiles on a
 * working provider (edge of coverage, a dropped request) do not trigger a switch.
 */
export function recordTileError(health: TileHealth): TileHealth {
  const errors = health.errors + 1;
  if (health.stage === 'failed' || health.loaded > 0 || errors < TILE_FAILURE_THRESHOLD) {
    return { ...health, errors };
  }
  return { stage: health.stage === 'primary' ? 'fallback' : 'failed', loaded: 0, errors: 0 };
}

export function sourceForStage(style: BaseMapStyle, stage: TileStage): BasemapSource {
  return stage === 'primary' ? BASEMAP_SOURCES[style] : BASEMAP_FALLBACKS[style];
}
