/**
 * v3 Phase 0 gate (AGENTS.md §5 Fase 0, rules 1, 5 and 6).
 *
 * 1. No Math.random anywhere in shipped runtime code (src/, server/).
 * 2. Prohibited claims (v3 §1.5) never appear in shipped runtime code.
 * 3. Identical engine input → identical payload (id/timestamp excluded).
 * 4. Removed fake endpoints and modules stay removed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { runPinnSimulation } from '../../src/engines/pinn/core/pinnEngine';
import { INDONESIAN_ROAD_SEGMENTS, ALL_BINA_MARGA_WIM_STATIONS } from '../../src/data/reference/indonesianRoads';
import { detectLocalDeviceProfile } from '../../src/runtime/intel-hardware/deviceDetector';
import { PDF_DISCLAIMER } from '../../src/services/reporting/pdfGenerator';
import type { SimulationParams } from '../../src/types';

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const RUNTIME_FILES = [...sourceFiles(path.join(ROOT, 'src')), ...sourceFiles(path.join(ROOT, 'server'))];

function offenders(pattern: RegExp): string[] {
  return RUNTIME_FILES.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => [line, i + 1] as const)
      .filter(([line]) => pattern.test(line))
      .map(([, n]) => `${path.relative(ROOT, file)}:${n}`)
  );
}

test('no Math.random in shipped runtime code (F-02, F-20, F-21)', () => {
  assert.deepEqual(offenders(/Math\.random\s*\(/), []);
});

test('prohibited claims are absent from shipped runtime code (v3 §1.5, AGENTS rule 5)', () => {
  const prohibited: Array<[string, RegExp]> = [
    ['FWD Validated badge', /FWD Validated/i],
    ['fabricated latency claim', /(<\s*10\s*ms|8[.,]4\s*ms|6[.,]8\s*ms)/i],
    ['"melebihi batas ijin" verdict', /melebihi batas ijin/i],
    ['PINN solves Burmister', /menyelesaikan\s+(persamaan\s+)?Burmister/i],
    ['"setara FEM"', /setara FEM/i],
    ['APBN savings', /(penghematan|menghemat|efisiensi anggaran)[^\n]{0,60}Rp/i],
    ['"korupsi"', /korupsi/i],
    ['"kontraktor nakal"', /kontraktor nakal/i]
  ];
  for (const [label, pattern] of prohibited) {
    assert.deepEqual(offenders(pattern), [], label);
  }
});

test('fake WIM training modal, WIM scraper, simulated benchmark and IR export are removed (F-04, F-13)', () => {
  for (const file of [
    'src/features/wim/BinaMargaWimPipelineModal.tsx',
    'src/services/wim/binaMargaWimScraper.ts',
    'src/runtime/openvino/simulatedBenchmark.ts',
    'server/services/openvinoExportService.ts',
    'server/controllers/openvinoController.ts',
    'server/routes/openvino.routes.ts'
  ]) {
    assert.equal(existsSync(path.join(ROOT, file)), false, file);
  }
  assert.equal(ALL_BINA_MARGA_WIM_STATIONS.length, 0);
  assert.ok(INDONESIAN_ROAD_SEGMENTS.every((s) => !s.hasWimStation && !s.wimDetails && !s.activeWimStatus));
});

test('browser never claims an NPU or an Intel device (F-12)', () => {
  const profile = detectLocalDeviceProfile();
  assert.equal(profile.hasNpuAccelerator, false);
  assert.equal(profile.vendorName, 'tidak diketahui');
  assert.notEqual(profile.recommendedTarget, 'NPU');
});

test('PDF disclaimer states "bukan dokumen resmi" and names no agency (F-19)', () => {
  assert.match(PDF_DISCLAIMER, /BUKAN DOKUMEN RESMI/);
  assert.doesNotMatch(PDF_DISCLAIMER, /PUPR|Kemenhub|BMKG|Bina Marga|Intel/);
});

test('identical input gives an identical payload (AGENTS rule 6)', () => {
  const segment = INDONESIAN_ROAD_SEGMENTS[0];
  const params: SimulationParams = {
    segmentId: segment.id,
    axleLoadTon: 14,
    rainIntensityMmHr: 30,
    floodDurationHours: 4,
    subgradeCbrPercent: 6,
    asphaltThicknessCm: 10,
    asphaltModulusMpa: 2500,
    surfaceTemperatureC: 32,
    targetDevice: 'NPU',
    precisionMode: 'INT8_NNCF'
  };
  const strip = ({ id: _id, timestamp: _t, ...rest }: ReturnType<typeof runPinnSimulation>) => rest;
  const a = strip(runPinnSimulation(params, segment));
  const b = strip(runPinnSimulation(params, segment));
  assert.deepEqual(a, b);
  assert.equal(a.telemetry.measurementStatus, 'NOT_MEASURED');
  assert.equal(a.telemetry.inferenceLatencyMs, null);
});
