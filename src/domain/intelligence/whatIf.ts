/**
 * What-If simulation (spec §14, §21.6): baseline vs scenario on the same segment, with
 * deltas, risk change, physical-direction sanity checks and provenance. Every result is
 * labelled SIMULATION and never stored as a field observation.
 */
import type { RoadSegment } from '../../types';
import type { ReportCase } from '../workflow/model';
import { assessSegment, AssessmentInputs, EngineeringAssessment, RiskLevel } from './assessment';

export interface WhatIfResult {
  label: 'SIMULATION';
  segmentId: string;
  changed: Array<{ parameter: keyof AssessmentInputs; from: number; to: number }>;
  baseline: EngineeringAssessment;
  scenario: EngineeringAssessment;
  deltas: { conditionScore: number; tensileStrainMicro: number; compressiveStrainMicro: number; deflectionMicron: number };
  riskChange: { from: RiskLevel; to: RiskLevel };
  sanity: { checks: Array<{ rule: string; ok: boolean }>; flaggedForReview: boolean };
  explanation: string;
}

export function runWhatIf(segment: RoadSegment, scenario: Partial<AssessmentInputs>, options: { now: string; cases?: ReportCase[] }): WhatIfResult {
  const baseline = assessSegment(segment, { now: options.now, cases: options.cases });
  const merged = assessSegment(segment, { now: options.now, cases: options.cases, inputs: scenario });
  const changed = (Object.keys(scenario) as Array<keyof AssessmentInputs>)
    .filter((k) => typeof scenario[k] === 'number' && scenario[k] !== baseline.inputs[k])
    .map((k) => ({ parameter: k, from: baseline.inputs[k], to: scenario[k] as number }));

  const d = {
    conditionScore: merged.outputs.conditionScorePrototype - baseline.outputs.conditionScorePrototype,
    tensileStrainMicro: merged.outputs.tensileStrainMicro - baseline.outputs.tensileStrainMicro,
    compressiveStrainMicro: merged.outputs.compressiveStrainMicro - baseline.outputs.compressiveStrainMicro,
    deflectionMicron: merged.outputs.surfaceDeflectionMicron - baseline.outputs.surfaceDeflectionMicron
  };

  // Expected physical directions when only that parameter moves (spec §14 sanity checks).
  const checks: Array<{ rule: string; ok: boolean }> = [];
  for (const c of changed) {
    const up = c.to > c.from;
    if (c.parameter === 'asphaltThicknessCm') checks.push({ rule: `Thicker asphalt should not increase tensile strain (${up ? 'thicker' : 'thinner'})`, ok: up ? d.tensileStrainMicro <= 1e-9 : d.tensileStrainMicro >= -1e-9 });
    if (c.parameter === 'subgradeCbrPercent') checks.push({ rule: `Higher CBR should not increase subgrade strain (${up ? 'higher' : 'lower'})`, ok: up ? d.compressiveStrainMicro <= 1e-9 : d.compressiveStrainMicro >= -1e-9 });
    if (c.parameter === 'axleLoadTon') checks.push({ rule: `Heavier axle should not decrease tensile strain (${up ? 'heavier' : 'lighter'})`, ok: up ? d.tensileStrainMicro >= -1e-9 : d.tensileStrainMicro <= 1e-9 });
  }
  // Direction checks only hold when a single parameter changes.
  const applicable = changed.length === 1 ? checks : [];
  const flaggedForReview = applicable.some((c) => !c.ok);

  return {
    label: 'SIMULATION',
    segmentId: segment.id,
    changed,
    baseline,
    scenario: merged,
    deltas: d,
    riskChange: { from: baseline.risk, to: merged.risk },
    sanity: { checks: applicable, flaggedForReview },
    explanation:
      changed.length === 0
        ? 'No parameter changed; scenario equals baseline.'
        : `SIMULATION (rule-based engine): changing ${changed.map((c) => `${c.parameter} ${c.from}→${c.to}`).join(', ')} moves the prototype condition score by ${d.conditionScore >= 0 ? '+' : ''}${d.conditionScore} and risk ${baseline.risk}→${merged.risk}.${flaggedForReview ? ' A physical-direction check failed: model flagged for review.' : ''}`
  };
}
