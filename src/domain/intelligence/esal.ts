/**
 * Equivalent Single Axle Load (spec v2.2 §10).
 *
 *   LEF  = (P_axle / P_standard)^4          (fourth-power law, AASHTO concept)
 *   ESAL = Σ (n_i × LEF_i)
 *
 * P_standard = 8.16 t (80 kN / 18-kip single axle, the Bina Marga standard axle).
 * This is an equivalency concept used as one load-translation input, not the structural
 * model: axle configuration, group axles, pavement structure and calibration all affect
 * the real relationship (spec §10 limitations).
 */
export const STANDARD_AXLE_TON = 8.16;

export interface AxleLoadGroup {
  /** Single-axle load in tonnes. */
  axleLoadTon: number;
  /** Number of axle passes with this load. */
  passes: number;
}

export interface EsalResult {
  esal: number;
  standardAxleTon: number;
  groups: Array<AxleLoadGroup & { lef: number; contribution: number }>;
  explanation: string;
}

export class EsalInputError extends Error {}

export function loadEquivalencyFactor(axleLoadTon: number, standardAxleTon = STANDARD_AXLE_TON): number {
  if (!Number.isFinite(axleLoadTon) || axleLoadTon < 0) throw new EsalInputError('Axle load must be a non-negative number of tonnes.');
  if (axleLoadTon > 60) throw new EsalInputError('Axle load above 60 t is outside any plausible single-axle range.');
  if (!Number.isFinite(standardAxleTon) || standardAxleTon <= 0) throw new EsalInputError('Standard axle must be positive.');
  return (axleLoadTon / standardAxleTon) ** 4;
}

export function computeEsal(groups: AxleLoadGroup[], standardAxleTon = STANDARD_AXLE_TON): EsalResult {
  if (!Array.isArray(groups)) throw new EsalInputError('Axle groups must be a list.');
  const rows = groups.map((g) => {
    if (!Number.isFinite(g.passes) || g.passes < 0) throw new EsalInputError('Passes must be a non-negative number.');
    const lef = loadEquivalencyFactor(g.axleLoadTon, standardAxleTon);
    return { ...g, lef, contribution: g.passes * lef };
  });
  const esal = rows.reduce((sum, r) => sum + r.contribution, 0);
  const top = [...rows].sort((a, b) => b.contribution - a.contribution)[0];
  const explanation =
    rows.length === 0
      ? 'No axle loads given; ESAL is 0.'
      : `ESAL = Σ n × (P/${standardAxleTon} t)^4 = ${esal.toFixed(1)}. Largest share from ${top.axleLoadTon} t axles (LEF ${top.lef.toFixed(2)} × ${top.passes} passes).`;
  return { esal, standardAxleTon, groups: rows, explanation };
}
