/**
 * Pilot corridors as configuration (Dokumen Induk v3 D-03): corridor 1 Narogong,
 * corridor 2 Karawang. Geometry is approximate until surveyed data exists (HD-07, G-01).
 */
import narogong from '../../config/corridors/narogong.json' with { type: 'json' };
import karawang from '../../config/corridors/karawang.json' with { type: 'json' };

export interface CorridorBounds { minLat: number; maxLat: number; minLng: number; maxLng: number }

export interface Corridor {
  id: string;
  order: number;
  name: string;
  trackingPrefix: string;
  bounds: CorridorBounds;
  managingAuthority: string | null;
  dataStatus: 'APPROXIMATE' | 'SURVEYED';
  notes: string;
}

export const PILOT_CORRIDORS: readonly Corridor[] = ([narogong, karawang] as Corridor[]).sort((a, b) => a.order - b.order);

/** The pilot corridor containing the point, or null when it lies outside every corridor. */
export function findCorridor(lat: number, lng: number): Corridor | null {
  return PILOT_CORRIDORS.find(({ bounds: b }) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) ?? null;
}
