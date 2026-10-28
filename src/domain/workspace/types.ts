/**
 * Analysis Workspace contract (docs/handoff/ui-workspace/spec/03_KONTRAK_DATA_DAN_API.md).
 *
 * One workspace per report. Every number the UI shows is a `Measured` value that carries
 * its unit, provenance and the stage/run that produced it; a missing value is `null` with a
 * reason, never 0. Zod schemas validate payloads at the API boundary and in the browser.
 *
 * Pure and isomorphic: no I/O, no clock, no randomness.
 */
import { z } from 'zod';

export const STAGE_IDS = [
  'T0_capture',
  'T1_reconstruct',
  'T2_preprocess',
  'T3_detect',
  'T4_surface',
  'T5_quantify',
  'T6_validate',
  'T7_structural',
  'T8_finalize'
] as const;
export const StageIdSchema = z.enum(STAGE_IDS);
export type StageId = z.infer<typeof StageIdSchema>;

export const STAGE_STATUSES = ['queued', 'running', 'completed', 'failed', 'blocked', 'needs_review', 'stale'] as const;
export const StageStatusSchema = z.enum(STAGE_STATUSES);
export type StageStatus = z.infer<typeof StageStatusSchema>;

/** Status of a VALUE (not of a stage); always rendered as a badge. */
export const ProvenanceSchema = z.enum(['provisional', 'simulated', 'manually_measured', 'corrected', 'validated', 'not_available']);
export type ResultProvenance = z.infer<typeof ProvenanceSchema>;

/** Source of a structural or load input. */
export const InputSourceSchema = z.enum(['MEASURED', 'DOCUMENT', 'DEFAULT', 'ASSUMED', 'MISSING']);
export type InputSource = z.infer<typeof InputSourceSchema>;

export const DAMAGE_CLASSES = ['pothole', 'crack_longitudinal', 'crack_transverse', 'crack_alligator', 'unclassified', 'not_damage'] as const;
export const DamageClassSchema = z.enum(DAMAGE_CLASSES);
export type DamageClass = z.infer<typeof DamageClassSchema>;

export const VerdictSchema = z.enum(['PASS', 'REVIEW', 'FAIL', 'NOT_VALIDATED']);
export type ValidationVerdict = z.infer<typeof VerdictSchema>;

export const ScaleStatusSchema = z.enum(['valid', 'relative_only', 'missing']);
export type ScaleStatus = z.infer<typeof ScaleStatusSchema>;

export const MeasuredSchema = z
  .object({
    value: z.number().finite().nullable(),
    unit: z.string(),
    uncertainty: z.number().finite().nullable().optional(),
    provenance: ProvenanceSchema,
    source: z.object({
      stage: StageIdSchema,
      method: z.string(),
      modelVersion: z.string().optional(),
      runId: z.string().optional()
    }),
    reasonUnavailable: z.string().optional()
  })
  .refine((m) => m.value !== null || (m.reasonUnavailable ?? '').length > 0, {
    message: 'A null value needs reasonUnavailable'
  });
export type Measured = z.infer<typeof MeasuredSchema>;

export const GroundTruthPointSchema = z.object({
  pointId: z.string().min(1),
  objectId: z.string().min(1),
  xMm: z.number().finite(),
  yMm: z.number().finite(),
  referenceMm: z.number().finite().nullable(),
  systemMm: z.number().finite().nullable(),
  tool: z.string().min(1),
  measuredBy: z.string().min(1),
  measuredAt: z.string(),
  evidencePhotoId: z.string().optional(),
  note: z.string().optional(),
  /** What was measured; absent = depth (older records). */
  quantity: z.enum(['depth', 'width']).optional()
});
export type GroundTruthPoint = z.infer<typeof GroundTruthPointSchema>;

export const MEASUREMENT_KEYS = ['lengthMm', 'widthMeanMm', 'widthMaxMm', 'depthMaxMm', 'depthMeanMm', 'areaM2', 'volumeL'] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export const DamageObjectSchema = z.object({
  objectId: z.string().min(1),
  reportId: z.string().min(1),
  class: z.object({
    value: DamageClassSchema,
    confidence: z.number().min(0).max(1).nullable(),
    modelVersion: z.string().nullable(),
    correctedBy: z.string().optional()
  }),
  location: z.object({ lat: z.number(), lon: z.number(), chainage: z.string().optional(), lane: z.string().optional() }),
  geometryRefs: z.object({
    frameIds: z.array(z.string()),
    /** Bounding box in frame pixels, per frame id, when a detector or an F.E drew one. */
    boxes: z.record(z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])).optional(),
    /** Mask polygon in frame pixels, per frame id. */
    masks: z.record(z.string(), z.array(z.tuple([z.number(), z.number()]))).optional()
  }),
  measurements: z.object({
    lengthMm: MeasuredSchema,
    widthMeanMm: MeasuredSchema,
    widthMaxMm: MeasuredSchema,
    depthMaxMm: MeasuredSchema,
    depthMeanMm: MeasuredSchema,
    areaM2: MeasuredSchema,
    volumeL: MeasuredSchema
  }),
  quality: z.object({
    scaleStatus: ScaleStatusSchema,
    scaleUncertaintyMm: z.number().nullable().optional(),
    reprojErrorPx: z.number().nullable().optional(),
    gridCompletePct: z.number().nullable().optional(),
    planeRmsMm: z.number().nullable().optional(),
    coveragePct: z.number().nullable().optional()
  }),
  severity: z.object({
    rule: z.string(),
    value: z.enum(['low', 'medium', 'high']).nullable(),
    feOverride: z.object({ value: z.string(), reason: z.string() }).optional()
  }),
  /** Citizen's own estimate; shown only as "dilaporkan warga", never as a measurement. */
  reportedByCitizen: z.object({ severity: z.string().nullable(), note: z.string().nullable() }).optional()
});
export type DamageObject = z.infer<typeof DamageObjectSchema>;

export const StageRunSchema = z.object({
  runId: z.string(),
  reportId: z.string(),
  stage: StageIdSchema,
  status: StageStatusSchema,
  inputHash: z.string(),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  durationMs: z.number().optional(),
  modelVersion: z.string().optional(),
  errorCode: z.string().optional(),
  reason: z.string().optional(),
  checkpointUri: z.string().optional(),
  supersededBy: z.string().optional(),
  attempt: z.number().int().min(1)
});
export type StageRun = z.infer<typeof StageRunSchema>;

export const ReportVersionSchema = z.object({
  version: z.number().int().min(1),
  createdAt: z.string(),
  createdBy: z.string(),
  correctionIds: z.array(z.string()),
  changeSummaryPublic: z.string(),
  changeSummaryTechnical: z.string(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected']),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
  /** Public snapshot frozen at approval so older versions stay readable. */
  publicSnapshot: z.unknown().optional()
});
export type ReportVersion = z.infer<typeof ReportVersionSchema>;

export const CORRECTION_KINDS = [
  'frame_accept',
  'extra_photo',
  'scale_marker',
  'class',
  'mask',
  'merge',
  'split',
  'reference_plane',
  'contour',
  'ground_truth',
  'layers',
  'load',
  'criterion',
  'severity',
  'recommendation',
  'after_photo'
] as const;
export const CorrectionKindSchema = z.enum(CORRECTION_KINDS);
export type CorrectionKind = z.infer<typeof CorrectionKindSchema>;

export const CorrectionInputSchema = z.object({
  kind: CorrectionKindSchema,
  objectId: z.string().optional(),
  field: z.string().min(1),
  newValue: z.unknown(),
  reason: z.string().trim().min(5, 'A reason is required'),
  evidence: z.array(z.string()).default([])
});
export type CorrectionInput = z.infer<typeof CorrectionInputSchema>;

export const CorrectionSchema = CorrectionInputSchema.extend({
  correctionId: z.string(),
  reportId: z.string(),
  oldValue: z.unknown(),
  by: z.string(),
  at: z.string(),
  rerunStages: z.array(StageIdSchema),
  resultingRunIds: z.array(z.string()),
  version: z.number().int()
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const LayerSchema = z.object({
  name: z.enum(['AC', 'Base', 'Subbase', 'Subgrade']),
  thicknessMm: MeasuredSchema,
  modulusMPa: MeasuredSchema,
  poisson: MeasuredSchema,
  source: InputSourceSchema
});
export type Layer = z.infer<typeof LayerSchema>;

export const FieldGridSchema = z.object({
  variable: z.enum(['eps_xx', 'eps_zz', 'sigma_zz']),
  unit: z.string(),
  xMm: z.array(z.number()),
  zMm: z.array(z.number()),
  /** values[zi][xi]; null where the solver returned a non-finite value. */
  values: z.array(z.array(z.number().nullable())),
  wheelsXMm: z.array(z.number()).optional(),
  interfacesMm: z.array(z.number()).optional()
});
export type FieldGrid = z.infer<typeof FieldGridSchema>;

export const StructuralRunSchema = z.object({
  runId: z.string(),
  objectId: z.string().nullable(),
  engine: z.enum(['MLET-PyMastic', 'surrogate']),
  engineVersion: z.string(),
  createdAt: z.string(),
  status: z.enum(['completed', 'stale', 'failed']),
  inputHash: z.string(),
  layers: z.array(LayerSchema),
  load: z.object({ axleT: z.number(), config: z.string(), source: InputSourceSchema, esalSource: InputSourceSchema }),
  condition: z.enum(['dry', 'wet']),
  epsTUe: MeasuredSchema,
  epsVUe: MeasuredSchema,
  lifeIndexYr: z
    .object({ p10: z.number(), p50: z.number(), p90: z.number(), criterion: z.enum(['AI', 'AUS']), samples: z.number().int(), histogram: z.array(z.number()).optional(), binEdges: z.array(z.number()).optional() })
    .nullable(),
  fieldGrids: z.array(FieldGridSchema),
  assumptions: z.array(z.string()),
  scenarioLabel: z.enum(['simulated', 'validated']),
  supersededBy: z.string().optional()
});
export type StructuralRun = z.infer<typeof StructuralRunSchema>;

export const FrameSchema = z.object({
  frameId: z.string(),
  uri: z.string(),
  capturedAt: z.string().optional(),
  accepted: z.boolean().nullable(),
  rejectReason: z.string().optional(),
  sanitized: z.boolean(),
  /** Laplacian variance computed from the stored pixels; null until computed. */
  sharpness: z.number().nullable(),
  saturatedPct: z.number().nullable(),
  overlapPct: z.number().nullable(),
  /** Photo slot of the guided capture checklist (A–F, scale, context, nadir, orbit). */
  slot: z.string().optional()
});
export type Frame = z.infer<typeof FrameSchema>;

export const AuditEntrySchema = z.object({
  at: z.string(),
  by: z.string(),
  role: z.string(),
  action: z.string(),
  version: z.number().int().nullable(),
  reason: z.string().optional(),
  detail: z.string().optional()
});
export type WorkspaceAuditEntry = z.infer<typeof AuditEntrySchema>;

/** Surface grid behind the 3D tab: depth relative to the reference plane, per cell. */
export const SurfaceGridSchema = z.object({
  objectId: z.string(),
  /** 'mm' only with a valid metric scale; otherwise 'relative'. */
  unit: z.enum(['mm', 'relative']),
  cellSize: z.number().positive(),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  /** depth[r][c] below the reference plane (positive down); null = no data. */
  depth: z.array(z.array(z.number().nullable())),
  contour: z.array(z.tuple([z.number(), z.number()])),
  /** Crack objects only: binary crack map (1 = crack cell) from the Pan et al. pipeline. A
   *  bounding box is never stored here; this is the reconstructed-geometry map. */
  crackMap: z.array(z.array(z.number().int().min(0).max(1))).optional(),
  /** Crack skeleton points (x, y) in mm on the grid. */
  skeleton: z.array(z.tuple([z.number(), z.number()])).optional(),
  runId: z.string(),
  synthetic: z.boolean()
});
export type SurfaceGrid = z.infer<typeof SurfaceGridSchema>;

export const WorkspaceSchema = z.object({
  reportId: z.string(),
  trackingCode: z.string(),
  /** Breadcrumb parts. */
  project: z.string(),
  segment: z.string(),
  chainageRange: z.string().optional(),
  /** true = DATA CONTOH: shown with a badge and excluded from every KPI. */
  demo: z.boolean(),
  createdAt: z.string(),
  objects: z.array(DamageObjectSchema),
  frames: z.array(FrameSchema),
  stageRuns: z.array(StageRunSchema),
  corrections: z.array(CorrectionSchema),
  versions: z.array(ReportVersionSchema),
  groundTruth: z.array(GroundTruthPointSchema),
  layers: z.array(LayerSchema),
  structuralRuns: z.array(StructuralRunSchema),
  surfaces: z.array(SurfaceGridSchema),
  audit: z.array(AuditEntrySchema),
  /** Public-facing fields the citizen sees on /track/:code. */
  publicInfo: z.object({
    damageLabel: z.string(),
    action: z.string().nullable(),
    sanitizedPhotoUri: z.string().nullable(),
    afterPhotoUri: z.string().nullable(),
    citizenConfirmedRepaired: z.boolean().nullable()
  })
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WORKSPACE_TABS = ['overview', 'camera', '3d', 'structure', 'pinn', 'validation'] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

/** Which stage a tab primarily depends on (for "not ready" states and pipeline clicks). */
export const TAB_FOR_STAGE: Record<StageId, WorkspaceTab> = {
  T0_capture: 'camera',
  T1_reconstruct: '3d',
  T2_preprocess: '3d',
  T3_detect: 'camera',
  T4_surface: '3d',
  T5_quantify: '3d',
  T6_validate: 'validation',
  T7_structural: 'pinn',
  T8_finalize: 'overview'
};
