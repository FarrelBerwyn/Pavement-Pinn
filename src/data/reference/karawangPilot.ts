/**
 * Canonical Karawang pilot corridor (spec v2.2 §6.0): Jalan Nasional Pantura, segment
 * Klari → Jatisari → toward Simpang Jomin, road codes KRW-001..KRW-004.
 *
 * DATA STATUS — read before using any number here:
 * - Polylines are ILLUSTRATIVE: a few hand-placed points along the corridor. The precise
 *   bounding geometry is DATA REQUIRED (spec §6.4), to be digitised from open road data.
 * - PCI, CBR, thickness, axle load, traffic volume and heavy-vehicle share are SYNTHETIC
 *   demo values chosen to show four different conditions (spec §6.5: good / watch /
 *   degraded / high risk). They are not Karawang field measurements.
 * - No WIM station is claimed: official WIM/FWD data for this corridor was not found
 *   (spec §6.3, DATA REQUIRED), so `hasWimStation` is false.
 * Verified context (spec §6.3, OSINT, Feb 2026): damage on Pantura Klari attributed by
 * BBPJN to rain and ODOL vehicles; potholes of 10–30 cm reported; a fatal incident at
 * Balonggandu, Jatisari; reconstruction of Klari–Jatisari planned by the regency.
 */
import type { RoadSegment } from '../../types';

const common = {
  corridor: 'Jalan Nasional Pantura Karawang (Klari → Jatisari → arah Simpang Jomin)',
  province: 'Jawa Barat',
  hasWimStation: false,
  lastSurveyDate: 'DATA REQUIRED',
  pilot: true,
  attributeStatus: 'SYNTHETIC',
  geometryStatus: 'ILLUSTRATIVE'
} as const;

export const KARAWANG_PILOT_SEGMENTS: RoadSegment[] = [
  {
    ...common,
    id: 'KRW-001',
    name: 'KRW-001 · Pantura Klari (titik terparah)',
    kmPost: 'Klari — depan Polsek Klari (perkiraan)',
    coordinates: [-6.3458, 107.3778],
    polyline: [
      [-6.3445, 107.366],
      [-6.3452, 107.3722],
      [-6.3461, 107.3815],
      [-6.347, 107.39]
    ],
    lengthKm: 2.6,
    currentPci: 28,
    conditionCategory: 'HEAVY_DAMAGE',
    defaultCbrPercent: 4,
    defaultAsphaltThicknessCm: 9,
    defaultAxleLoadTon: 13,
    dailyTrafficVolumeLhr: 52000,
    heavyVehiclePercent: 34
  },
  {
    ...common,
    id: 'KRW-002',
    name: 'KRW-002 · Pantura Klari–Jatisari (tengah)',
    kmPost: 'Antara Klari dan Jatisari (perkiraan)',
    coordinates: [-6.3495, 107.415],
    polyline: [
      [-6.347, 107.39],
      [-6.3485, 107.405],
      [-6.3503, 107.4225],
      [-6.352, 107.44]
    ],
    lengthKm: 5.5,
    currentPci: 47,
    conditionCategory: 'LIGHT_DAMAGE',
    defaultCbrPercent: 5,
    defaultAsphaltThicknessCm: 10,
    defaultAxleLoadTon: 12,
    dailyTrafficVolumeLhr: 48000,
    heavyVehiclePercent: 31
  },
  {
    ...common,
    id: 'KRW-003',
    name: 'KRW-003 · Pantura Balonggandu/Jatisari',
    kmPost: 'Desa Balonggandu, Kec. Jatisari (perkiraan)',
    coordinates: [-6.3585, 107.4855],
    polyline: [
      [-6.352, 107.44],
      [-6.3558, 107.4672],
      [-6.36, 107.495],
      [-6.364, 107.515]
    ],
    lengthKm: 8.4,
    currentPci: 63,
    conditionCategory: 'MODERATE',
    defaultCbrPercent: 6,
    defaultAsphaltThicknessCm: 11,
    defaultAxleLoadTon: 11,
    dailyTrafficVolumeLhr: 45000,
    heavyVehiclePercent: 29
  },
  {
    ...common,
    id: 'KRW-004',
    name: 'KRW-004 · Pantura menuju Simpang Jomin',
    kmPost: 'Jatisari — arah Simpang Jomin (perkiraan)',
    coordinates: [-6.3705, 107.5315],
    polyline: [
      [-6.364, 107.515],
      [-6.3685, 107.5262],
      [-6.3735, 107.5385],
      [-6.378, 107.55]
    ],
    lengthKm: 4.1,
    currentPci: 82,
    conditionCategory: 'GOOD',
    defaultCbrPercent: 7,
    defaultAsphaltThicknessCm: 12,
    defaultAxleLoadTon: 10,
    dailyTrafficVolumeLhr: 41000,
    heavyVehiclePercent: 26
  }
];
