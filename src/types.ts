/**
 * Types for PAVEMENT-PINN System
 * Physics-Informed Neural Network Road Pavement Degradation Prediction
 * & Multi-Stakeholder Edge AI Decision Support System
 */

export type UserRole =
  | 'FIELD_ENGINEER'
  | 'OPERATIONS_MANAGER'
  | 'POLICY_MAKER'
  | 'PUBLIC_REPORTER'
  | 'PUBLIC_VIEWER';

export type RoadConditionCategory = 'GOOD' | 'MODERATE' | 'LIGHT_DAMAGE' | 'HEAVY_DAMAGE';

export type AlertSeverity = 'GREEN' | 'YELLOW' | 'RED';

export type HardwareDevice = 'CPU' | 'iGPU' | 'NPU' | 'AUTO' | 'MULTI';

export type PrecisionMode = 'FP32' | 'FP16' | 'INT8_NNCF';

export type PerformanceHint = 'LATENCY' | 'THROUGHPUT' | 'CUMULATIVE_THROUGHPUT';

export type DamageType =
  | 'POTHOLE'
  | 'ALLIGATOR_CRACK'
  | 'RUTTING'
  | 'CORRUGATION'
  | 'SUBSIDENCE'
  | 'CRACK'
  | 'SURFACE_DAMAGE'
  | 'ROAD_DEFORMATION'
  | 'DEPRESSION'
  | 'PATCHING';

export type ReportSeverity = 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type ReportStatus = 'PENDING' | 'VERIFIED_BY_ENGINEER' | 'SCHEDULED_FOR_REPAIR' | 'REPAIRED';

export interface DamageReport {
  id: string;
  reporterName: string;
  reporterRole: string;
  reporterAvatar?: string;
  timestamp: string;
  segmentId: string;
  segmentName: string;
  corridor: string;
  province: string;
  coordinates: [number, number];
  damageType: DamageType;
  damageTypeLabel: string;
  severity: ReportSeverity;
  estimatedDepthCm: number;
  estimatedAreaM2: number;
  photoUrl: string;
  description: string;
  status: ReportStatus;
  upvotesCount: number;
  userUpvoted?: boolean;

  // Computer Vision AI Analysis Data
  aiAnalysis?: {
    class: string;
    label: string;
    icon: string;
    confidence: number;
    severity: string;
    characteristics: string[];
    detectionBox?: {
      xPercent: number;
      yPercent: number;
      widthPercent: number;
      heightPercent: number;
    };
  };

  // WIM Vehicle Overload Correlation Analysis
  wimCorrelation: {
    hasWimData: boolean;
    stationId: string;
    stationName: string;
    corridor: string;
    recentTruckPlate: string;
    recentTruckClass: string;
    maxAxleLoadTon: number;
    legalLimitTon: number;
    overloadPercent: number;
    overloadCategory: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
    correlatedOverloadTrucksCount: number;
    estimatedPinnContributionPercent: number;
    causeAnalysisSummary: string;
  };

  // Community Citizen Reviews & Comments
  reviews?: ReportReview[];

  // Infrastructure Repair & Before/After Comparison Details
  repairDetails?: {
    afterPhotoUrl: string;
    repairDate?: string;
    repairMethod?: string;
    repairedPciImprovement?: string;
    engineerNote?: string;
    agencyInCharge?: string;
  };
}

export interface ReportReview {
  id: string;
  userName: string;
  userAvatar?: string;
  userBadge?: string;
  rating: number;
  timeAgo: string;
  dateFormatted: string;
  comment: string;
  likesCount?: number;
}

export interface DeviceHardwareProfile {
  deviceType: HardwareDevice;
  vendorName: string;
  rendererName: string;
  logicalCores: number;
  systemMemoryGb: number;
  webGpuSupported: boolean;
  webGlSupported: boolean;
  webNnSupported: boolean;
  hasNpuAccelerator: boolean;
  recommendedTarget: HardwareDevice;
  recommendedPrecision: PrecisionMode;
  recommendedStreams: number;
}

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
}

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

export interface IntelTelemetry {
  deviceUsed: HardwareDevice;
  precisionUsed: PrecisionMode;
  inferenceLatencyMs: number; // e.g. 8.4 ms
  powerConsumptionWatts: number;
  cpuUtilizationPercent: number;
  npuUtilizationPercent: number;
  throughputSps: number; // simulations per second
  physicsLossValue: number; // residual PDE loss
  dataLossValue: number; // FWD reference loss
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

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userRole: UserRole;
  userAgency: string;
  action: string;
  segmentName: string;
  details: string;
}
