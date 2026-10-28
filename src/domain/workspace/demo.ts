/**
 * The DATA CONTOH workspace ROAD-2026-001. `demo: true` puts the badge on every screen and
 * keeps it out of every KPI. Its numbers come from server/fixtures/workspace-demo.json, which
 * inference/geometry/make_demo_fixture.py writes by running the real geometry pipeline on a
 * synthetic surface and PyMastic with assumed layers — nothing is typed in by hand here.
 * Isomorphic: the server seeds it; the static (offline) build shows it read-only.
 */
import fixture from "../../data/fixtures/workspace-demo.json";
import type { DamageObject, Layer, Measured, StageRun, StructuralRun, Workspace } from "./types";
import { emptyMeasurements, REASON, unavailable } from "./measured";
import { inputHash } from "./orchestrator";
import { trackingCodeFor } from "./fromCase";

export const DEMO_REPORT_ID = "ROAD-2026-001";
const AT = "2026-10-20T09:12:00.000Z";
const GEO_RUN = "demo-run-T5";
const MLET_RUN = "demo-run-T7";

const sim = (value: number | null, unit: string, stage: Measured["source"]["stage"], method: string, runId: string, uncertainty: number | null = null): Measured =>
  value === null
    ? unavailable(unit, stage, REASON.notMeasured, method)
    : { value, unit, uncertainty, provenance: "simulated", source: { stage, method, runId } };

/** `assetBase`: deployment base path for the dataset photos ("/" locally). */
export function buildDemoWorkspace(assetBase = "/"): Workspace {
  const g = fixture.geometry;
  const m = g.metrics;
  const method = "geometry.run_pothole (permukaan sintetis)";
  const pothole: DamageObject = {
    objectId: "POTHOLE-024",
    reportId: DEMO_REPORT_ID,
    class: { value: "pothole", confidence: null, modelVersion: null },
    location: { lat: -6.3352, lon: 107.2785, chainage: "km 12+415", lane: "lajur kiri" },
    // No detector has run: no boxes or masks until an F.E draws one.
    geometryRefs: { frameIds: ["F01", "F02", "F03"] },
    measurements: {
      lengthMm: sim(m.length_mm, "mm", "T5_quantify", method, GEO_RUN, g.step),
      widthMeanMm: unavailable("mm", "T5_quantify", "Lebar rata-rata hanya untuk crack"),
      widthMaxMm: sim(m.width_mm, "mm", "T5_quantify", method, GEO_RUN, g.step),
      depthMaxMm: sim(m.depth_max_mm, "mm", "T5_quantify", method, GEO_RUN, m.depth_max_unc_mm),
      depthMeanMm: sim(m.depth_mean_mm, "mm", "T5_quantify", method, GEO_RUN, m.depth_mean_unc_mm),
      areaM2: sim(m.area_m2, "m2", "T5_quantify", method, GEO_RUN),
      volumeL: sim(m.volume_l, "L", "T5_quantify", "integrasi defisit dalam kontur", GEO_RUN)
    },
    quality: { scaleStatus: "valid", scaleUncertaintyMm: 0.8, reprojErrorPx: null, gridCompletePct: 100 - g.grid_empty_pct, planeRmsMm: g.plane_rms, coveragePct: g.coverage_pct },
    severity: { rule: "belum ada aturan keparahan tervalidasi", value: null }
  };
  const crack: DamageObject = {
    objectId: "CRACK-021",
    reportId: DEMO_REPORT_ID,
    class: { value: "crack_longitudinal", confidence: null, modelVersion: null },
    location: { lat: -6.3349, lon: 107.2781, chainage: "km 12+380" },
    geometryRefs: { frameIds: ["F04"] },
    measurements: emptyMeasurements("T5_quantify", REASON.relativeGeometry),
    quality: { scaleStatus: "relative_only", scaleUncertaintyMm: null, reprojErrorPx: null, gridCompletePct: null, planeRmsMm: null, coveragePct: null },
    severity: { rule: "belum dihitung", value: null }
  };
  const retake: DamageObject = {
    objectId: "POTHOLE-025",
    reportId: DEMO_REPORT_ID,
    class: { value: "unclassified", confidence: null, modelVersion: null },
    location: { lat: -6.3356, lon: 107.279, chainage: "km 12+460" },
    geometryRefs: { frameIds: ["F05"] },
    measurements: emptyMeasurements("T5_quantify", "Foto ulang diperlukan"),
    quality: { scaleStatus: "missing", scaleUncertaintyMm: null, reprojErrorPx: null, gridCompletePct: null, planeRmsMm: null, coveragePct: null },
    severity: { rule: "belum dihitung", value: null }
  };

  const base = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  const img = (p: string) => `${base}dataset-reference/rdd2022/${p}`;
  const run = (stage: StageRun["stage"], status: StageRun["status"], extra: Partial<StageRun> = {}): StageRun => ({
    runId: extra.runId ?? `demo-run-${stage.slice(0, 2)}`,
    reportId: DEMO_REPORT_ID,
    stage,
    status,
    inputHash: inputHash({ demo: DEMO_REPORT_ID, stage }),
    createdAt: AT,
    attempt: 1,
    ...extra
  });

  const s = fixture.structural;
  const layerNames = ["AC", "Base", "Subbase"] as const;
  const assumed = (v: number, unit: string, why: string): Measured => ({ value: v, unit, uncertainty: null, provenance: "simulated", source: { stage: "T7_structural", method: why } });
  const layers: Layer[] = [
    ...layerNames.map((name, i) => ({
      name,
      thicknessMm: assumed(s.layers.h[i], "mm", "ASSUMED (tipikal, belum ada core)"),
      modulusMPa: assumed(s.layers.E[i], "MPa", "ASSUMED (tipikal)"),
      poisson: assumed(s.layers.nu[i], "", "ASSUMED (tipikal)"),
      source: "ASSUMED" as const
    })),
    {
      name: "Subgrade",
      thicknessMm: unavailable("mm", "T7_structural", "Setengah ruang tak hingga"),
      modulusMPa: assumed(s.subgrade.E_mpa, "MPa", "E = 10 × CBR 6, ASSUMED"),
      poisson: assumed(s.subgrade.nu, "", "ASSUMED"),
      source: "ASSUMED"
    }
  ];
  const f = s.field;
  const structural: StructuralRun = {
    runId: MLET_RUN,
    objectId: "POTHOLE-024",
    engine: "MLET-PyMastic",
    engineVersion: s.method,
    createdAt: AT,
    status: "completed",
    inputHash: inputHash({ layers: s.layers, axle: s.axle_t }),
    layers,
    load: { axleT: s.axle_t, config: "sumbu standar, roda ganda 330 mm", source: "DEFAULT", esalSource: "ASSUMED" },
    condition: "dry",
    epsTUe: { value: s.strains.et_ue, unit: "µε", uncertainty: null, provenance: "simulated", source: { stage: "T7_structural", method: s.method, runId: MLET_RUN } },
    epsVUe: { value: s.strains.ev_ue, unit: "µε", uncertainty: null, provenance: "simulated", source: { stage: "T7_structural", method: s.method, runId: MLET_RUN } },
    lifeIndexYr: null,
    fieldGrids: (["eps_xx", "eps_zz", "sigma_zz"] as const).map((variable) => ({ variable, unit: f[variable].unit, xMm: f.x_mm, zMm: f.z_mm, values: f[variable].values, wheelsXMm: f.wheels_x_mm, interfacesMm: f.interfaces_mm })),
    assumptions: ["Semua lapisan ASSUMED (tidak ada core/DCP)", "Subgrade E = 10 × CBR, CBR 6 ASSUMED", "Lalu lintas belum diisi: Indeks Umur tidak dihitung"],
    scenarioLabel: "simulated"
  };

  return {
    reportId: DEMO_REPORT_ID,
    trackingCode: trackingCodeFor(DEMO_REPORT_ID),
    project: "Koridor Pilot",
    segment: "Ruas contoh",
    chainageRange: "km 12+300–12+800",
    demo: true,
    createdAt: AT,
    objects: [pothole, crack, retake],
    frames: [
      { frameId: "F01", uri: img("D40/Czech_000108.jpg"), accepted: true, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: "konteks" },
      { frameId: "F02", uri: img("D40/Czech_000293.jpg"), accepted: true, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: "nadir" },
      { frameId: "F03", uri: img("D40/Czech_000768.jpg"), accepted: true, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: "sekuens memutar" },
      { frameId: "F04", uri: img("D00/Czech_000054.jpg"), accepted: true, sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: "Foto A (seluruh crack)" },
      { frameId: "F05", uri: img("D40/Czech_000791.jpg"), accepted: false, rejectReason: "lubang tertutup bayangan; minta foto ulang", sanitized: true, sharpness: null, saturatedPct: null, overlapPct: null, slot: "nadir" }
    ],
    stageRuns: [
      run("T0_capture", "completed"),
      run("T1_reconstruct", "completed", { reason: "Permukaan sintetis (DATA CONTOH), bukan hasil SfM", modelVersion: "synthetic" }),
      run("T2_preprocess", "completed", { modelVersion: "geometry.grid" }),
      run("T3_detect", "needs_review", { reason: "Model deteksi belum tersedia — kelas diisi petugas" }),
      run("T4_surface", "completed", { modelVersion: "geometry.surface" }),
      run("T5_quantify", "completed", { runId: GEO_RUN, modelVersion: "geometry.quantify" }),
      run("T6_validate", "blocked", { reason: REASON.noValidation }),
      run("T7_structural", "completed", { runId: MLET_RUN, modelVersion: s.method, reason: "Simulasi skenario dengan input ASSUMED" }),
      run("T8_finalize", "queued")
    ],
    corrections: [],
    versions: [],
    groundTruth: [],
    layers,
    structuralRuns: [structural],
    surfaces: [
      {
        objectId: "POTHOLE-024",
        unit: g.unit === "mm" ? "mm" : "relative",
        cellSize: g.step,
        rows: g.depth_grid.length,
        cols: g.depth_grid[0].length,
        depth: g.depth_grid,
        contour: g.contour as Array<[number, number]>,
        runId: GEO_RUN,
        synthetic: true
      }
    ],
    audit: [{ at: AT, by: "system", role: "SYSTEM", action: "workspace_created", version: null, detail: "DATA CONTOH" }],
    publicInfo: { damageLabel: "Lubang jalan", action: null, sanitizedPhotoUri: img("D40/Czech_000293.jpg"), afterPhotoUri: null, citizenConfirmedRepaired: null }
  };
}
