/**
 * Snap decision for draggable bottom sheets. Pure, so the gesture rules are unit-tested
 * without a DOM (tests/unit/sheet-drag.test.ts).
 */

export interface SnapPoint<K extends string> {
  key: K;
  /** Sheet height in px at this snap point. */
  height: number;
}

/** A pointer that moves less than this (px) is a tap, not a drag. */
export const DRAG_START_PX = 6;
/** How far (ms) a release velocity is projected forward to choose the snap point. */
const PROJECTION_MS = 180;

/**
 * Snap point for a sheet released at `height` px while moving at `velocity` px/ms
 * (positive = finger moving down, i.e. the sheet getting smaller). Returns 'CLOSE' when
 * the projected height falls below half of the smallest snap point and closing is allowed.
 */
export function pickSnap<K extends string>(
  snaps: SnapPoint<K>[],
  height: number,
  velocity: number,
  closable: boolean
): K | 'CLOSE' {
  const sorted = [...snaps].sort((a, b) => a.height - b.height);
  const projected = height - velocity * PROJECTION_MS;
  if (closable && projected < sorted[0].height * 0.5) return 'CLOSE';
  let best = sorted[0];
  for (const s of sorted) if (Math.abs(s.height - projected) < Math.abs(best.height - projected)) best = s;
  return best.key;
}

/** Dismiss decision for a sheet with one open position, dragged down by `offset` px. */
export function shouldDismiss(offset: number, velocity: number, sheetHeight: number): boolean {
  return offset + velocity * PROJECTION_MS > Math.min(160, sheetHeight * 0.35);
}
