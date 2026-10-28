/**
 * Build the initial workspace for a workflow report case.
 *
 * A citizen report has one or two photos and no 3D sequence, so the workspace starts with:
 * T0 from the stored photo, T3 from the screening result (class + confidence only when a
 * real model ran), and every geometry/structural stage `blocked` with the reason and the
 * action that unblocks it. No measurement is invented: the citizen's own estimate travels
 * as `reportedByCitizen`, never as a measurement.
 */
import type { ReportCase } from '../workflow/model';
import type { DamageClass, DamageObject, StageRun, Workspace } from './types';
import { emptyMeasurements, unavailable } from './measured';
import { inputHash } from './orchestrator';

const CLASS_BY_TYPE: Record<string, DamageClass> = {
  POTHOLE: 'pothole',
  ALLIGATOR_CRACK: 'crack_alligator',
  CRACK: 'crack_longitudinal'
};

export const NO_SEQUENCE_REASON = 'Belum ada sekuens foto 3D — tugaskan F.E mengambil sekuens';

export function trackingCodeFor(reportId: string): string {
  // Deterministic, non-guessable enough for a demo; real deployments issue codes at submit time.
  const h = inputHash({ reportId, salt: 'track' }).toUpperCase();
  return `${h.slice(0, 3)}-${h.slice(3, 7)}`;
}

export function workspaceFromCase(c: ReportCase): Workspace {
  return workspaceFromReport(c.report, {
    createdAt: c.createdAt,
    screening: c.screening,
    demo: c.dataStatus === 'DEMO' || c.history.some((h) => h.action === 'SEED_IMPORT')
  });
}

/** Same mapping from a bare report (the offline static build has reports, not server cases). */
export function workspaceFromReport(r: ReportCase['report'], meta: { createdAt: string; screening: ReportCase['screening']; demo: boolean }): Workspace {
  const at = meta.createdAt;
  const screening = meta.screening;
  const realModel = screening?.modelStatus === 'REAL';
  const detected = realModel && screening?.detectedClass ? (CLASS_BY_TYPE[screening.detectedClass] ?? 'unclassified') : 'unclassified';
  const objectId = `${r.id}-OBJ-1`;
  const frameId = `${r.id}-F1`;
  const demo = meta.demo;
  const run = (stage: StageRun['stage'], status: StageRun['status'], reason?: string, modelVersion?: string): StageRun => ({
    runId: `seed-${r.id}-${stage}`,
    reportId: r.id,
    stage,
    status,
    inputHash: inputHash({ reportId: r.id, stage }),
    createdAt: at,
    attempt: 1,
    reason,
    modelVersion
  });
  const object: DamageObject = {
    objectId,
    reportId: r.id,
    class: { value: detected, confidence: realModel ? screening?.confidence ?? null : null, modelVersion: realModel ? screening?.modelVersion ?? null : null },
    location: { lat: r.coordinates[0], lon: r.coordinates[1] },
    geometryRefs: { frameIds: [frameId] },
    measurements: emptyMeasurements('T5_quantify', NO_SEQUENCE_REASON),
    quality: { scaleStatus: 'missing', scaleUncertaintyMm: null, reprojErrorPx: null, gridCompletePct: null, planeRmsMm: null, coveragePct: null },
    severity: { rule: 'belum dihitung (butuh T5)', value: null },
    reportedByCitizen: { severity: r.severity ?? null, note: 'Perkiraan pelapor, bukan hasil ukur sistem' }
  };
  const isDatasetPhoto = r.photoProvenance === 'DATASET_REFERENCE' || r.photoProvenance === 'NO_DATASET_COVERAGE';
  return {
    reportId: r.id,
    trackingCode: trackingCodeFor(r.id),
    project: 'Koridor Pilot',
    segment: r.segmentName,
    demo,
    createdAt: at,
    objects: [object],
    frames: [
      {
        frameId,
        uri: r.photoUrl,
        accepted: null,
        sanitized: false,
        sharpness: null,
        saturatedPct: null,
        overlapPct: null,
        slot: isDatasetPhoto ? 'referensi dataset (bukan foto lokasi)' : 'foto pelapor'
      }
    ],
    stageRuns: [
      run('T0_capture', 'needs_review', 'Satu foto pelapor; gate kualitas belum dijalankan'),
      run('T1_reconstruct', 'blocked', NO_SEQUENCE_REASON),
      run('T2_preprocess', 'blocked', 'Menunggu T1'),
      run('T3_detect', realModel ? 'completed' : 'needs_review', realModel ? undefined : 'Model deteksi belum tersedia — belum diklasifikasi', realModel ? screening?.modelVersion ?? undefined : undefined),
      run('T4_surface', 'blocked', 'Menunggu T2'),
      run('T5_quantify', 'blocked', 'Menunggu T4'),
      run('T6_validate', 'blocked', 'Validasi belum tersedia'),
      run('T7_structural', 'blocked', 'Menunggu geometri T5/T6 dan data lapisan'),
      run('T8_finalize', 'queued')
    ],
    corrections: [],
    versions: [],
    groundTruth: [],
    layers: (['AC', 'Base', 'Subbase', 'Subgrade'] as const).map((name) => ({
      name,
      thicknessMm: unavailable('mm', 'T7_structural', 'Data lapisan belum diisi'),
      modulusMPa: unavailable('MPa', 'T7_structural', 'Data lapisan belum diisi'),
      poisson: unavailable('', 'T7_structural', 'Data lapisan belum diisi'),
      source: 'MISSING' as const
    })),
    structuralRuns: [],
    surfaces: [],
    audit: [{ at, by: 'system', role: 'SYSTEM', action: 'workspace_created', version: null, detail: `dari laporan ${r.id}` }],
    publicInfo: {
      damageLabel: r.damageTypeLabel,
      action: null,
      // Only a sanitised photo may reach the public page; citizen uploads are not sanitised yet.
      sanitizedPhotoUri: null,
      afterPhotoUri: null,
      citizenConfirmedRepaired: null
    }
  };
}
