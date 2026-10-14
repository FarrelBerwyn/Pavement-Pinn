/**
 * Snap states of the map bottom sheet and the transitions a drag or a tap produces.
 * Pure module so the gesture rules can be unit-tested without a DOM.
 */

export type MapSheetState = 'PEEK' | 'HALF' | 'FULL';

/** Result of a gesture: a new state, or CLOSED when the sheet is dismissed. */
export type MapSheetTransition = MapSheetState | 'CLOSED';

/** A drag shorter than this (in px) leaves the sheet where it is. */
export const SHEET_DRAG_THRESHOLD_PX = 40;

const ORDER: MapSheetState[] = ['PEEK', 'HALF', 'FULL'];

/** One step up or down; stepping down from PEEK dismisses the sheet. */
export function stepSheetState(state: MapSheetState, direction: 'UP' | 'DOWN'): MapSheetTransition {
  const index = ORDER.indexOf(state);
  if (direction === 'UP') return ORDER[Math.min(index + 1, ORDER.length - 1)];
  return index === 0 ? 'CLOSED' : ORDER[index - 1];
}

/** `deltaY` is the vertical drag distance: negative when the handle was pulled up. */
export function sheetStateAfterDrag(state: MapSheetState, deltaY: number): MapSheetTransition {
  if (Math.abs(deltaY) < SHEET_DRAG_THRESHOLD_PX) return state;
  return stepSheetState(state, deltaY < 0 ? 'UP' : 'DOWN');
}

/**
 * Part of the viewport height the sheet covers on a phone, used to keep the selected
 * object in the area of the map that is still visible. FULL is not listed: there the
 * sheet is the content and the map is not expected to show the object.
 */
export const SHEET_HEIGHT_FRACTION: Record<Exclude<MapSheetState, 'FULL'>, number> = {
  PEEK: 0.2,
  HALF: 0.46
};

export function sheetInsetPx(state: MapSheetState | null, viewportHeight: number): number {
  if (!state) return 0;
  return Math.round(viewportHeight * SHEET_HEIGHT_FRACTION[state === 'PEEK' ? 'PEEK' : 'HALF']);
}
