/**
 * ROAD-2026-002 — DATA CONTOH of a report that went the whole way: F.E correction, field
 * validation, structural rerun, M.O approval, repair and citizen confirmation.
 *
 * Every number comes from src/data/fixtures/workspace-demo.json ("completed"), written by
 * inference/geometry/make_demo_fixture.py running this repository's pipeline and MLET on a
 * synthetic surface. Boxes on the photos are the RDD2022 human annotations of those dataset
 * photos (not a model output). Core/DCP and caliper readings are SIMULATED. Excluded from KPIs.
 */
import fixture from '../../data/fixtures/workspace-demo.json';
import registry from '../../data/reference/datasetImageRegistry.json';
import type { Correction, DamageObject, GroundTruthPoint, Layer, Measured, ReportVersion, StageRun, StructuralRun, Workspace, WorkspaceAuditEntry } from './types';
import { buildDemoWorkspace } from './demo';
import { REASON, unavailable } from './measured';
import { inputHash } from './orchestrator';
import { trackingCodeFor } from './fromCase';
import { toPublicTrack } from './publicTrack';

export const COMPLETED_REPORT_ID = 'ROAD-2026-002';
const FE = 'USR-006';
const MO = 'USR-008';
const T = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 9, d, h - 7, m)).toISOString(); // WIB

const c = fixture.completed;
const cs = c.structural;

/** RDD2022 annotation box of a dataset photo, in the 600×600 viewer frame (crop applied). */
function datasetBox(storagePath: string): [number, number, number, number] | null {
  const a = (registry.assets as Array<any>).find((x) => x.storagePath === storagePath);
  if (!a?.annotationBox || !a.crop) return null;
  const k = 600 / a.crop.size;
  const b = a.annotationBox;
  return [(b.xmin - a.crop.x) * k, (b.ymin - a.crop.y) * k, (b.xmax - a.crop.x) * k, (b.ymax - a.crop.y) * k];
}

export function buildCompletedWorkspace(assetBase = '/'): Workspace {
  const base0 = buildDemoWorkspace(assetBase);
  const base = assetBase.endsWith('/') ? assetBase : `${assetBase}/`;
  const path = (p: string) => `dataset-reference/rdd2022/${p}`;
  const img = (p: string) => `${base}${path(p)}`;

  const GEO_OLD = 'c2-run-T5-v0';
  const GEO_NEW = 'c2-run-T5-v1';
  const MLET_OLD = 'c2-mlet-v0';
  const MLET_NEW = 'c2-mlet-v1';
  const m = c.metrics;
  const method = 'geometry.requantify (kontur F.E + bidang cincin)';
  const val = (value: number, unit: string, prov: Measured['provenance'], unc: number | null = null, meth = method): Measured => ({ value, unit, uncertainty: unc, provenance: prov, source: { stage: 'T5_quantify', method: meth, runId: GEO_NEW } });

  const frames = [
    { id: 'F01', p: 'D40/Czech_000108.jpg', slot: 'konteks', ok: true },
    { id: 'F02', p: 'D40/Czech_000293.jpg', slot: 'nadir', ok: true },
    { id: 'F03', p: 'D40/Czech_000768.jpg', slot: 'sekuens memutar', ok: true },
    { id: 'F04', p: 'D40/Czech_000937.jpg', slot: 'sekuens memutar', ok: true },
    { id: 'F05', p: 'D40/Czech_000791.jpg', slot: 'nadir', ok: false, why: 'bayangan pengambil foto menutup lubang' },
    { id: 'F06', p: 'D40/Czech_001053.jpg', slot: 'penanda skala', ok: true }
  ];
  const boxes: Record<string, [number, number, number, number]> = {};
  for (const f of frames) {
    const b = f.ok ? datasetBox(path(f.p)) : null;
    if (b) boxes[f.id] = b;
  }

  const pothole: DamageObject = {
    objectId: 'POTHOLE-031',
    reportId: COMPLETED_REPORT_ID,
    class: { value: 'pothole', confidence: null, modelVersion: null, correctedBy: FE },
    location: { lat: -6.3361, lon: 107.2802, chainage: 'km 12+640', lane: 'lajur kiri' },
    // F01 mask: outline traced from the photo inside its RDD2022 box (make_demo_fixture); the 3D surface uses the same outline.
    geometryRefs: { frameIds: frames.map((f) => f.id), boxes, masks: { F01: fixture.geometry.footprint.mask_px as Array<[number, number]> } },
    measurements: {
      lengthMm: val(m.length_mm, 'mm', 'corrected', base0.surfaces[0].cellSize),
      widthMeanMm: unavailable('mm', 'T5_quantify', 'Lebar rata-rata hanya untuk crack'),
      widthMaxMm: val(m.width_mm, 'mm', 'corrected', base0.surfaces[0].cellSize),
      depthMaxMm: val(m.depth_max_mm, 'mm', 'validated', m.depth_max_unc_mm),
      depthMeanMm: val(m.depth_mean_mm, 'mm', 'corrected', m.depth_mean_unc_mm),
      areaM2: val(m.area_m2, 'm2', 'corrected'),
      volumeL: val(m.volume_l as number, 'L', 'corrected', null, 'integrasi defisit dalam kontur F.E')
    },
    quality: { scaleStatus: 'valid', scaleUncertaintyMm: 0.8, reprojErrorPx: null, gridCompletePct: 100 - fixture.geometry.grid_empty_pct, planeRmsMm: c.plane_rms, coveragePct: c.coverage_pct },
    severity: { rule: 'aturan v1 (TARGET, belum dikalibrasi): kedalaman maks > 25 mm → tinggi', value: m.depth_max_mm > 25 ? 'high' : m.depth_max_mm > 10 ? 'medium' : 'low' }
  };
  const crack: DamageObject = {
    objectId: 'CRACK-032',
    reportId: COMPLETED_REPORT_ID,
    class: { value: 'crack_longitudinal', confidence: null, modelVersion: null, correctedBy: FE },
    location: { lat: -6.3358, lon: 107.2797, chainage: 'km 12+610' },
    geometryRefs: { frameIds: ['F07'], boxes: (() => { const b = datasetBox(path('D00/Czech_000054.jpg')); return b ? { F07: b } : {}; })() },
    // Synthetic V-groove surface (DATA CONTOH) run through geometry.crack_from_grid (Pan et al.).
    measurements: (() => {
      const k = c.crack.metrics as Record<string, number>;
      const cm = (v: number, unit: string, unc: number | null): Measured => ({ value: v, unit, uncertainty: unc, provenance: 'simulated', source: { stage: 'T5_quantify', method: 'geometry.crack_from_grid (Pan et al. 2023, permukaan sintetis)', runId: GEO_NEW } });
      return {
        lengthMm: cm(k.length_mm, 'mm', c.crack.step),
        widthMeanMm: cm(k.width_mean_mm, 'mm', k.width_unc_mm),
        widthMaxMm: cm(k.width_max_mm, 'mm', k.width_unc_mm),
        depthMaxMm: cm(k.depth_max_mm, 'mm', k.depth_unc_mm),
        depthMeanMm: cm(k.depth_mean_mm, 'mm', k.depth_unc_mm),
        areaM2: cm(k.area_m2, 'm2', null),
        volumeL: unavailable('L', 'T5_quantify', 'Volume tidak dihitung untuk crack')
      };
    })(),
    quality: { scaleStatus: 'valid', scaleUncertaintyMm: 0.8, reprojErrorPx: null, gridCompletePct: 100, planeRmsMm: 0, coveragePct: c.crack.coverage_pct },
    severity: { rule: 'belum ada aturan keparahan crack tervalidasi', value: null }
  };

  const run = (id: string, stage: StageRun['stage'], at: string, extra: Partial<StageRun> = {}): StageRun => ({
    runId: id, reportId: COMPLETED_REPORT_ID, stage, status: 'completed', inputHash: inputHash({ id, stage }), createdAt: at, finishedAt: at, attempt: 1, ...extra
  });
  const stageRuns: StageRun[] = [
    run('c2-T0', 'T0_capture', T(20, 10, 40), { modelVersion: 'gate-T0', reason: '6 frame diterima, 1 ditolak' }),
    run('c2-T1', 'T1_reconstruct', T(20, 11, 5), { modelVersion: 'synthetic', reason: 'Permukaan sintetis (DATA CONTOH), bukan hasil SfM' }),
    run('c2-T2', 'T2_preprocess', T(20, 11, 6), { modelVersion: 'geometry.grid' }),
    run('c2-T3-v0', 'T3_detect', T(20, 11, 7), { status: 'stale', supersededBy: 'c2-T3', reason: 'Belum diklasifikasi (tanpa model)' }),
    run('c2-T3', 'T3_detect', T(20, 13, 20), { modelVersion: 'koreksi F.E', reason: 'Kelas dikonfirmasi F.E; kotak = anotasi dataset RDD2022' }),
    run('c2-T4-v0', 'T4_surface', T(20, 11, 8), { status: 'stale', supersededBy: 'c2-T4' }),
    run(GEO_OLD, 'T5_quantify', T(20, 11, 9), { status: 'stale', supersededBy: GEO_NEW }),
    run('c2-T6-v0', 'T6_validate', T(20, 11, 10), { status: 'stale', supersededBy: 'c2-T6', reason: REASON.noValidation }),
    run('c2-T4', 'T4_surface', T(20, 13, 21), { modelVersion: 'geometry.surface (bidang cincin)' }),
    run(GEO_NEW, 'T5_quantify', T(20, 13, 21), { modelVersion: 'geometry.quantify' }),
    run('c2-T6', 'T6_validate', T(21, 8, 10), { modelVersion: 'validasi pasangan lapangan', reason: `${c.points.length} titik ukur` }),
    run('c2-T7-v0', 'T7_structural', T(20, 15, 2), { status: 'stale', supersededBy: 'c2-T7', reason: 'Input AC 100 mm asumsi' }),
    run('c2-T7', 'T7_structural', T(21, 8, 31), { modelVersion: cs.method, reason: 'Simulasi skenario: AC core + DCP (simulasi), base/subbase ASSUMED' }),
    run('c2-T8', 'T8_finalize', T(21, 9, 0), { modelVersion: 'finalisasi' })
  ];

  const gt: GroundTruthPoint[] = c.points.map((p, i) => ({
    pointId: p.label,
    objectId: 'POTHOLE-031',
    xMm: p.x_mm,
    yMm: p.y_mm,
    referenceMm: p.reference_mm,
    systemMm: p.system_mm,
    tool: 'jangka sorong + mistar lurus (simulasi: kedalaman analitik permukaan sintetis, dibulatkan 0,5 mm)',
    measuredBy: FE,
    measuredAt: T(21, 8, i + 1),
    evidencePhotoId: 'F02',
    note: i === 2 ? 'Titik di lereng lubang: selisih terbesar karena grid 8 mm memotong lereng curam.' : undefined
  }));

  // Crack reference: the analytic groove (width 10 mm, depth 6 mm) "measured" with a crack gauge
  // (SIMULATED); system values are the pipeline outputs at the same rows.
  gt.push(
    ...[60, 200, 340].flatMap((yMm, i) => [
      { pointId: `C${i + 1}-w`, objectId: 'CRACK-032', xMm: 40, yMm, referenceMm: c.crack.analytic.width_mm, systemMm: (c.crack.metrics as any).width_mean_mm, tool: 'crack gauge (simulasi: lebar analitik)', measuredBy: FE, measuredAt: T(21, 8, 6 + i), quantity: 'width' as const },
      { pointId: `C${i + 1}-d`, objectId: 'CRACK-032', xMm: 40, yMm, referenceMm: c.crack.analytic.depth_mm, systemMm: (c.crack.metrics as any).depth_max_mm, tool: 'jarum ukur (simulasi: kedalaman analitik)', measuredBy: FE, measuredAt: T(21, 8, 6 + i), quantity: 'depth' as const }
    ])
  );

  const sim = (v: number, unit: string, meth: string, prov: Measured['provenance'] = 'simulated'): Measured => ({ value: v, unit, uncertainty: null, provenance: prov, source: { stage: 'T7_structural', method: meth } });
  const layers: Layer[] = [
    { name: 'AC', thicknessMm: sim(cs.layers.h[0], 'mm', 'core #C-07 (SIMULASI, DATA CONTOH)', 'manually_measured'), modulusMPa: sim(cs.layers.E[0], 'MPa', 'ASSUMED (tipikal AC)'), poisson: sim(cs.layers.nu[0], '', 'ASSUMED'), source: 'MEASURED' },
    { name: 'Base', thicknessMm: sim(cs.layers.h[1], 'mm', 'ASSUMED'), modulusMPa: sim(cs.layers.E[1], 'MPa', 'ASSUMED'), poisson: sim(cs.layers.nu[1], '', 'ASSUMED'), source: 'ASSUMED' },
    { name: 'Subbase', thicknessMm: sim(cs.layers.h[2], 'mm', 'ASSUMED'), modulusMPa: sim(cs.layers.E[2], 'MPa', 'ASSUMED'), poisson: sim(cs.layers.nu[2], '', 'ASSUMED'), source: 'ASSUMED' },
    { name: 'Subgrade', thicknessMm: unavailable('mm', 'T7_structural', 'Setengah ruang tak hingga'), modulusMPa: sim(cs.subgrade.E_mpa, 'MPa', 'DCP CBR 5 → E = 10 × CBR (SIMULASI)', 'manually_measured'), poisson: sim(cs.subgrade.nu, '', 'ASSUMED'), source: 'MEASURED' }
  ];

  const f = cs.field;
  const oldRun = { ...base0.structuralRuns[0], runId: MLET_OLD, objectId: 'POTHOLE-031', createdAt: T(20, 15, 2), status: 'stale' as const, supersededBy: MLET_NEW };
  const mu = (v: number): Measured => ({ value: v, unit: 'µε', uncertainty: null, provenance: 'simulated', source: { stage: 'T7_structural', method: cs.method, runId: MLET_NEW } });
  const newRun: StructuralRun = {
    runId: MLET_NEW,
    objectId: 'POTHOLE-031',
    engine: 'MLET-PyMastic',
    engineVersion: cs.method,
    createdAt: T(21, 8, 31),
    status: 'completed',
    inputHash: inputHash({ layers: cs.layers, sub: cs.subgrade }),
    layers,
    load: { axleT: 8.16, config: 'sumbu standar, roda ganda 330 mm', source: 'DEFAULT', esalSource: 'ASSUMED' },
    condition: 'dry',
    epsTUe: mu(cs.strains.et_ue),
    epsVUe: mu(cs.strains.ev_ue),
    lifeIndexYr: { p10: cs.life.p10, p50: cs.life.p50, p90: cs.life.p90, criterion: 'AI', samples: cs.traffic.samples, histogram: cs.life.histogram, binEdges: cs.life.bin_edges },
    fieldGrids: (['eps_xx', 'eps_zz', 'sigma_zz'] as const).map((variable) => ({ variable, unit: f[variable].unit, xMm: f.x_mm, zMm: f.z_mm, values: f[variable].values, wheelsXMm: f.wheels_x_mm, interfacesMm: f.interfaces_mm })),
    assumptions: [
      'AC 120 mm dari core #C-07 (SIMULASI, DATA CONTOH)',
      'Subgrade E = 10 × CBR 5 dari DCP (SIMULASI)',
      'Base 250 mm / Subbase 200 mm ASSUMED',
      `Lalu lintas ASSUMED: median ${cs.traffic.esal_day_median} ESAL/hari, lognormal σ=${cs.traffic.lognormal_sigma}, tumbuh ${cs.traffic.growth * 100} %/th, faktor arah ${cs.traffic.direction_factor}`,
      `Kriteria AI; yang menentukan: ${cs.allowable.governing === 'rutting' ? 'alur (εv subgrade)' : 'retak lelah (εt)'}`,
      'Indeks umur indikatif (Miner, MLET deterministik); bukan desain'
    ],
    scenarioLabel: 'simulated'
  };

  const corr = (id: string, kind: Correction['kind'], field: string, oldValue: unknown, newValue: unknown, reason: string, at: string, rerun: Correction['rerunStages'], runs: string[], objectId?: string, evidence: string[] = []): Correction => ({
    correctionId: id, reportId: COMPLETED_REPORT_ID, kind, objectId, field, oldValue, newValue, reason, evidence, by: FE, at, rerunStages: rerun, resultingRunIds: runs, version: 1
  });
  const corrections: Correction[] = [
    corr('c2-cor-1', 'class', 'class.value', 'unclassified', 'pothole', 'Dicek di lokasi: lubang, bukan tambalan lama', T(20, 13, 15), ['T3_detect', 'T4_surface', 'T5_quantify', 'T6_validate', 'T8_finalize'], ['c2-T3', 'c2-T4', GEO_NEW, 'c2-T6', 'c2-T8'], 'POTHOLE-031', ['F02']),
    corr('c2-cor-2', 'contour', 'contour', `[${fixture.geometry.contour.length} titik otomatis]`, c.contour, 'Batas otomatis memotong tepi yang sudah retak; kontur digambar ulang mengikuti tepi lubang', T(20, 13, 18), ['T4_surface', 'T5_quantify', 'T6_validate'], ['c2-T4', GEO_NEW, 'c2-T6'], 'POTHOLE-031', ['F02', 'F03']),
    corr('c2-cor-3', 'reference_plane', 'quality.referencePlane', null, { method: 'ring', ringMarginCells: 3 }, 'Bidang referensi dihitung ulang dari cincin aspal utuh di sekitar lubang', T(20, 13, 19), ['T4_surface', 'T5_quantify', 'T6_validate'], ['c2-T4', GEO_NEW, 'c2-T6'], 'POTHOLE-031'),
    corr('c2-cor-4', 'layers', 'layers.0.thicknessMm.value', 100, cs.layers.h[0], 'Core #C-07 menunjukkan AC 120 mm (SIMULASI)', T(21, 8, 25), ['T7_structural'], ['c2-T7'], undefined, ['core-C07.jpg']),
    corr('c2-cor-5', 'layers', 'layers.3.modulusMPa.value', 60, cs.subgrade.E_mpa, 'DCP: CBR 5 → E 50 MPa (SIMULASI)', T(21, 8, 28), ['T7_structural'], ['c2-T7'], undefined, ['dcp-01.csv'])
  ];

  const version: ReportVersion = {
    version: 1,
    createdAt: T(20, 13, 15),
    createdBy: FE,
    correctionIds: corrections.map((x) => x.correctionId),
    changeSummaryPublic: `Petugas lapangan memeriksa langsung dan memperbaiki batas lubang. Kedalaman terukur sekitar ${Math.round(m.depth_max_mm / 10)} cm dan sudah dicocokkan dengan ukuran manual di ${gt.length} titik.`,
    changeSummaryTechnical: `kontur F.E + bidang cincin → kedalaman maks ${m.depth_max_mm.toFixed(1)} mm, volume ${(m.volume_l as number).toFixed(2)} L; AC 100→120 mm, E subgrade 60→50 MPa → εt ${cs.strains.et_ue.toFixed(0)} µε`,
    status: 'approved',
    approvedBy: MO,
    approvedAt: T(21, 9, 0)
  };

  const audit: WorkspaceAuditEntry[] = [
    { at: T(20, 9, 12), by: 'system', role: 'SYSTEM', action: 'workspace_created', version: null, detail: 'Laporan warga diterima (2 foto, GPS ok) — DATA CONTOH' },
    { at: T(20, 9, 40), by: MO, role: 'OPERATIONS_MANAGER', action: 'photo_requested', version: null, reason: 'Butuh sekuens 3D untuk mengukur lubang', detail: 'POTHOLE-031 slot: konteks, nadir, sekuens memutar, penanda skala' },
    { at: T(20, 10, 40), by: FE, role: 'FIELD_ENGINEER', action: 'extra_photo', version: null, detail: 'F.E mengunggah sekuens + penanda kartu 85,6 mm' },
    ...corrections.map((x) => ({ at: x.at, by: FE, role: 'FIELD_ENGINEER', action: `correction:${x.kind}`, version: 1, reason: x.reason, detail: x.field })),
    ...gt.map((p) => ({ at: p.measuredAt, by: FE, role: 'FIELD_ENGINEER', action: 'ground_truth', version: null, detail: `${p.objectId} ${p.pointId}` })),
    { at: T(21, 8, 45), by: FE, role: 'FIELD_ENGINEER', action: 'version_submitted', version: 1 },
    { at: T(21, 9, 0), by: MO, role: 'OPERATIONS_MANAGER', action: 'version_approved', version: 1, reason: 'Kontur & validasi lapangan sesuai; T4–T7 selesai' },
    { at: T(23, 14, 0), by: FE, role: 'FIELD_ENGINEER', action: 'after_photo', version: 1, detail: 'Foto sesudah tambal diunggah' },
    { at: T(24, 8, 30), by: 'public', role: 'PUBLIC', action: 'citizen_confirmation', version: null, detail: 'ya' }
  ];

  const ws: Workspace = {
    reportId: COMPLETED_REPORT_ID,
    trackingCode: trackingCodeFor(COMPLETED_REPORT_ID),
    project: 'Koridor Pilot',
    segment: 'Ruas contoh',
    chainageRange: 'km 12+300–12+800',
    demo: true,
    createdAt: T(20, 9, 12),
    objects: [pothole, crack],
    frames: [
      ...frames.map((x) => ({ frameId: x.id, uri: img(x.p), accepted: x.ok, rejectReason: x.why, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: x.slot })),
      { frameId: 'F07', uri: img('D00/Czech_000054.jpg'), accepted: true, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: 'Foto A (seluruh crack)' }
    ],
    stageRuns,
    corrections,
    versions: [version],
    groundTruth: gt,
    layers,
    structuralRuns: [oldRun, newRun],
    surfaces: [
      { ...base0.surfaces[0], objectId: 'POTHOLE-031', contour: c.contour as Array<[number, number]>, runId: GEO_NEW },
      {
        objectId: 'CRACK-032',
        unit: 'mm',
        cellSize: c.crack.step,
        rows: c.crack.depth_grid.length,
        cols: c.crack.depth_grid[0].length,
        depth: c.crack.depth_grid,
        contour: [],
        crackMap: c.crack.crack_map,
        skeleton: c.crack.skeleton as Array<[number, number]>,
        runId: GEO_NEW,
        synthetic: true
      }
    ],
    audit,
    publicInfo: {
      damageLabel: 'Lubang jalan',
      action: 'Ditambal (patching lapis AC)',
      sanitizedPhotoUri: img('D40/Czech_000293.jpg'),
      afterPhotoUri: `${base}test-fixtures/test-after.jpg`,
      citizenConfirmedRepaired: true
    }
  };
  return { ...ws, versions: [{ ...version, publicSnapshot: toPublicTrack(ws) }] };
}
