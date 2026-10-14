/**
 * Captures the PINN engine golden snapshot used by tests/physics-validation.
 *
 *   npx tsx scripts/capture-pinn-baseline.ts
 *
 * The committed golden file was captured from the pre-restructure engine
 * (src/utils/pinnEngine.ts @ fffa344). Re-run this ONLY when an intentional,
 * reviewed change to the engine's numerical behaviour is being accepted.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { INDONESIAN_ROAD_SEGMENTS } from '../src/data/reference/indonesianRoads';
import { runPinnSimulation } from '../src/engines/pinn/core/pinnEngine';
import { buildScenarios, runScenario, encodeSnapshot } from '../tests/physics-validation/pinnScenarios';

const scenarios = buildScenarios(INDONESIAN_ROAD_SEGMENTS);
const golden = scenarios.map((scenario, index) => ({
  name: scenario.name,
  group: scenario.group,
  segmentId: scenario.segmentId,
  params: encodeSnapshot(scenario.params),
  snapshot: encodeSnapshot(runScenario(runPinnSimulation, scenario, index, INDONESIAN_ROAD_SEGMENTS).snapshot)
}));

const outDir = path.join(process.cwd(), 'tests', 'physics-validation', 'fixtures');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'pinn-golden.json');
writeFileSync(outFile, JSON.stringify({ scenarioCount: golden.length, scenarios: golden }, null, 1) + '\n');
console.log(`Wrote ${golden.length} scenarios to ${path.relative(process.cwd(), outFile)}`);
