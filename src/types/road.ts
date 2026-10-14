/** Road network, condition and Weigh-In-Motion station domain types. */

export type RoadConditionCategory = 'GOOD' | 'MODERATE' | 'LIGHT_DAMAGE' | 'HEAVY_DAMAGE';

export type AlertSeverity = 'GREEN' | 'YELLOW' | 'RED';

export interface WimStationDetails {
  stationId: string;
  stationName: string;
  corridor: string;
  province: string;
  coordinates: [number, number]; // [lat, lng] exact coordinates
  licensePlate: string;
  vehicleClass: string;
  grossWeightTon: number;
  maxAxleLoadTon: number;
  legalLimitTon: number;
  overloadPercent: number;
  overloadCategory?: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
  speedKmh: number;
  fwdDeflectionMicron: number;
  pinnDamageImpactIndex: number; // 0 - 100 severity
  overlayRecommendationCm: number;
  lastSyncTime: string;
  alertSeverity: AlertSeverity;
}

export interface RoadSegment {
  id: string;
  name: string;
  corridor: string; // e.g. "Jalur Pantura Jawa", "Trans-Sumatra", "Trans-Papua"
  province: string;
  kmPost: string;
  coordinates: [number, number]; // [lat, lng]
  polyline: [number, number][]; // Line coordinates for map rendering
  lengthKm: number;
  currentPci: number; // 0 - 100
  conditionCategory: RoadConditionCategory;
  defaultCbrPercent: number; // Subgrade CBR %
  defaultAsphaltThicknessCm: number;
  defaultAxleLoadTon: number; // Average axle load
  dailyTrafficVolumeLhr: number; // LHR (Lalu Lintas Harian Rata-rata)
  heavyVehiclePercent: number;
  hasWimStation: boolean;
  wimStationName?: string;
  lastSurveyDate: string;
  activeOdolAlert?: AlertSeverity;
  activeWimStatus?: {
    lastOverloadWeightTon: number;
    lastTruckPlate: string;
    timestamp: string;
  };
  wimDetails?: WimStationDetails;
  /** Canonical Karawang pilot segment (spec v2.2 §6.0, KRW-001..004). */
  pilot?: boolean;
  /** Provenance of the segment attributes (PCI, CBR, thickness, traffic). */
  attributeStatus?: 'SYNTHETIC' | 'ESTIMATED' | 'OBSERVED';
  /** Provenance of the polyline: ILLUSTRATIVE until digitised from open road geometry. */
  geometryStatus?: 'ILLUSTRATIVE' | 'DIGITISED';
}
