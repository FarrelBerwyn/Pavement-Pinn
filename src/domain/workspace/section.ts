/**
 * Cross-section A–A' through a stored depth grid: the profile the 3D tab plots under the
 * viewer (reference plane at 0, deficit below it). Pure; reads only the stored grid.
 */
import type { SurfaceGrid } from './types';

export interface SectionProfile {
  axis: 'x' | 'y';
  /** Index of the row (axis x) or column (axis y) the section runs along. */
  index: number;
  positions: number[];
  depth: Array<number | null>;
  unit: SurfaceGrid['unit'];
}

/** Row/column through the deepest cell — the default section for an object. */
export function deepestIndex(g: SurfaceGrid): { row: number; col: number } | null {
  let best: { row: number; col: number; d: number } | null = null;
  g.depth.forEach((row, r) =>
    row.forEach((d, c) => {
      if (d !== null && (!best || d > best.d)) best = { row: r, col: c, d };
    })
  );
  return best ? { row: (best as { row: number }).row, col: (best as { col: number }).col } : null;
}

export function sectionProfile(g: SurfaceGrid, axis: 'x' | 'y', index?: number): SectionProfile | null {
  const deepest = deepestIndex(g);
  if (!deepest) return null;
  const i = Math.max(0, Math.min((axis === 'x' ? g.rows : g.cols) - 1, index ?? (axis === 'x' ? deepest.row : deepest.col)));
  const n = axis === 'x' ? g.cols : g.rows;
  const positions = Array.from({ length: n }, (_, k) => (k + 0.5) * g.cellSize);
  const depth = axis === 'x' ? g.depth[i].slice() : g.depth.map((row) => row[i]);
  return { axis, index: i, positions, depth, unit: g.unit };
}
