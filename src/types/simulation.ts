/** PINN simulation input/output contracts. */

import type { AlertSeverity, RoadSegment } from './road';
import type { HardwareDevice, PrecisionMode, PerformanceHint, IntelTelemetry } from './runtime';

export interface SimulationParams {
  segmentId: string;
  axleLoadTon: number; // 10 - 25 Ton (ODOL range)
  rainIntensityMmHr: number; // 0 - 100 mm/hr
  floodDurationHours: number; // 0 - 48 hrs
  surfaceTemperatureC: number; // 25 - 60 C
  subgradeCbrPercent: number; // 3 - 10 %
  asphaltThicknessCm: number; // 5 - 25 cm
  asphaltModulusMpa: number; // 1200 - 3500 MPa
  targetDevice: HardwareDevice;
  precisionMode: PrecisionMode;
  numStreams?: number;
  performanceHint?: PerformanceHint;
}

export interface DeflectionPoint {
  distanceMm: number;
  deflectionMicron: number;
}

export interface TensorResults {
  tensileStrainEt: number; // microstrain at bottom of asphalt
  compressiveStrainEv: number; // microstrain at top of subgrade
  surfaceDeflectionMaxMicron: number; // maximum surface deflection in microns
  stressTopMpa: number;
  stressBottomMpa: number;
}

export interface RoleSpecificOutputs {
  // Field Engineer
  fieldEngineer: {
    recommendedOverlayThicknessCm: number;
    recommendedOverlayType: string;
    potholeHorizonDays: number; // estimated days until structural pothole
    deflectionBasin: DeflectionPoint[];
    structuralPriorityRank: number;
    engineeringNotes: string;
  };
  // Operations Manager
  operationsManager: {
    alertStatus: AlertSeverity;
    maxAllowedDynamicTonnageTon: number; // seasonal/weather adjusted limit
    wimActionRequired: 'ALLOW' | 'INSPECT_AND_WEIGH' | 'TRANSFER_CARGO_AND_PENALIZE' | 'REROUTE_MANDATORY';
    speedRestrictionKmh: number;
    suggestedDetourCorridor: string;
    operationalAlertSummary: string;
  };
  // Policy Maker
  policyMaker: {
    pci5YearProjection: { year: number; pciNoAction: number; pciPreventiveAction: number }[];
    estimatedEconomicLossRupiahBillions: number; // e.g. Rp 14.2 Billion
    preventiveCostSavingsRupiahBillions: number; // e.g. Rp 38.5 Billion
    zeroOdolTargetImpactPercent: number;
    executiveBrief: string;
  };
}

export interface SimulationResult {
  id: string;
  timestamp: string;
  params: SimulationParams;
  roadSegment: RoadSegment;
  predictedPci: number; // 0 - 100
  pciDropPoints: number;
  pavementLifeRemainingYears: number;
  tensors: TensorResults;
  roleOutputs: RoleSpecificOutputs;
  telemetry: IntelTelemetry;
  aiNarrative: {
    fieldEngineerNarrative: string;
    operationsNarrative: string;
    policyMakerNarrative: string;
  };
}
