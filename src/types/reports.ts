/** Community damage-report domain types. */
import type { UserRole } from './rbac';

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
  /** Account role of the creator. Recorded for reports made in the app; absent on the bundled demo reports. */
  creatorRole?: UserRole;
  /** 'SESSION': made in this browser session (not persisted). Absent: one of the bundled demo reports. */
  origin?: 'SESSION';
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
