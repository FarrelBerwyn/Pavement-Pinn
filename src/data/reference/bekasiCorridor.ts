/**
 * Bekasi Industrial Corridor Segments (Cikarang / Cibitung)
 *
 * Digitised from verified OpenStreetMap (OSM) highway centerline traces:
 * - JLN-BKS-JABABEKA-UMAR: Jl. H. Umar Ismail, Kawasan Industri Jababeka 1, Cikarang
 *   (Test point A: lat -6.273324, lng 107.146211)
 * - JLN-BKS-MM2100-KALIMANTAN: Jl. Kalimantan, Kawasan Industri MM2100, Cibitung
 *   (Test point B: lat -6.299078, lng 107.102829)
 */

import type { RoadSegment } from '../../types';
import { CANONICAL_ROAD_GEOMETRIES, toLeafletPolyline } from '../../domain/geo/canonicalRoadGeometry';

export const BEKASI_CORRIDOR_SEGMENTS: RoadSegment[] = [
  {
    id: 'JLN-BKS-JABABEKA-UMAR',
    name: 'Jl. H. Umar Ismail (Kawasan Industri Jababeka 1)',
    corridor: 'Kawasan Industri Jababeka 1 - Cikarang',
    province: 'Jawa Barat',
    kmPost: 'KM 01+200',
    coordinates: [-6.2742, 107.1462],
    polyline: toLeafletPolyline(CANONICAL_ROAD_GEOMETRIES['JLN-BKS-JABABEKA-UMAR'].geometry.coordinates),
    lengthKm: 1.73,
    currentPci: 48,
    conditionCategory: 'LIGHT_DAMAGE',
    defaultCbrPercent: 5.0,
    defaultAsphaltThicknessCm: 14,
    defaultAxleLoadTon: 15.0,
    dailyTrafficVolumeLhr: 42000,
    heavyVehiclePercent: 35,
    hasWimStation: false,
    lastSurveyDate: '2026-09-10',
    geometrySource: 'OSM_CENTERLINE',
    geometryStatus: 'DIGITISED'
  },
  {
    id: 'JLN-BKS-MM2100-KALIMANTAN',
    name: 'Jl. Kalimantan (Kawasan Industri MM2100 - Cibitung)',
    corridor: 'Kawasan Industri MM2100 - Cibitung',
    province: 'Jawa Barat',
    kmPost: 'KM 02+100',
    coordinates: [-6.2983, 107.1032],
    polyline: toLeafletPolyline(CANONICAL_ROAD_GEOMETRIES['JLN-BKS-MM2100-KALIMANTAN'].geometry.coordinates),
    lengthKm: 2.34,
    currentPci: 36,
    conditionCategory: 'HEAVY_DAMAGE',
    defaultCbrPercent: 4.0,
    defaultAsphaltThicknessCm: 15,
    defaultAxleLoadTon: 18.0,
    dailyTrafficVolumeLhr: 54000,
    heavyVehiclePercent: 42,
    hasWimStation: false,
    lastSurveyDate: '2026-09-12',
    geometrySource: 'OSM_CENTERLINE',
    geometryStatus: 'DIGITISED'
  }
];
