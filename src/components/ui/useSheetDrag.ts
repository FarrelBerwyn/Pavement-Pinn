/**
 * Drag gesture for every sheet that comes up from the bottom of the screen.
 *
 * The sheet follows the finger while dragging (written straight to the element's style,
 * no re-render per frame) and, on release, settles on the nearest snap point taking the
 * fling velocity into account, as in native map apps.
 *
 * - `mode: 'height'` (map sheets): the height tracks the finger between the snap points
 *   (for example PEEK / HALF / FULL); below the smallest one the sheet closes.
 * - `mode: 'translate'` (modal sheets): the sheet slides down with the finger and closes
 *   when released far enough or flung down; otherwise it springs back.
 *
 * Only elements inside `[data-sheet-grab]` start a drag (handle and header), plus the
 * scroll area when it is already at the top and the finger moves down. A press that
 * barely moves is left alone, so buttons in the header keep working.
 */
import { useRef } from 'react';
import type React from 'react';
import { DRAG_START_PX, pickSnap, shouldDismiss, type SnapPoint } from './sheetDrag';

interface HeightOptions<K extends string> {
  mode: 'height';
  snaps: () => SnapPoint<K>[];
  onSnap: (key: K) => void;
  onClose?: () => void;
  /** Only drag on phones (the sheet is a side panel on wider screens). */
  maxWidth?: number;
}

interface TranslateOptions {
  mode: 'translate';
  onClose: () => void;
  maxWidth?: number;
}

type Options<K extends string> = HeightOptions<K> | TranslateOptions;

interface DragState {
  pointerId: number;
  startY: number;
  startHeight: number;
  lastY: number;
  lastT: number;
  velocity: number;
  active: boolean;
  fromContent: boolean;
}

export function useSheetDrag<K extends string = string>(options: Options<K>) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const drag = useRef<DragState | null>(null);
  /** Set after a real drag so the click that follows pointerup does not also act. */
  const suppressClick = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = (el: HTMLElement) => {
    el.style.transition = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.maxHeight = '';
    el.style.transform = '';
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    const o = optionsRef.current;
    if (!el || e.button !== 0) return;
    if (o.maxWidth && window.innerWidth > o.maxWidth) return;
    const target = e.target as HTMLElement;
    const grab = target.closest('[data-sheet-grab]');
    const scroller = target.closest('[data-sheet-scroll]') as HTMLElement | null;
    // Inside the content, only start from the top of the scroll area (pull down to shrink),
    // and only for touch/pen: a mouse there selects text or scrolls with the wheel.
    if (!grab && (e.pointerType === 'mouse' || !(scroller && scroller.scrollTop <= 0))) return;
    if (!grab && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startHeight: el.getBoundingClientRect().height,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
      active: false,
      fromContent: !grab
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el || e.pointerId !== d.pointerId) return;
    // No button held: the release happened somewhere we did not hear it. Stop, so plain
    // hovering never moves the sheet (it used to follow the mouse and then close).
    if (e.buttons === 0) {
      drag.current = null;
      if (d.active) reset(el);
      return;
    }
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      // From the content, only a downward pull moves the sheet; upward is normal scrolling.
      if (d.fromContent && dy < 0) {
        drag.current = null;
        return;
      }
      d.active = true;
      el.style.transition = 'none';
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture keeps the drag alive outside the element; without it the drag still works
      }
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.velocity = 0.8 * ((e.clientY - d.lastY) / dt) + 0.2 * d.velocity;
    d.lastY = e.clientY;
    d.lastT = now;

    const o = optionsRef.current;
    if (o.mode === 'height') {
      const snaps = o.snaps();
      const max = Math.max(...snaps.map((s) => s.height));
      let h = d.startHeight - dy;
      if (h > max) h = max + (h - max) * 0.2; // rubber band above the top snap point
      el.style.minHeight = '0px';
      el.style.maxHeight = 'none';
      el.style.height = `${Math.max(48, h)}px`;
    } else {
      const offset = dy > 0 ? dy : dy * 0.15; // slight resistance upwards
      el.style.transform = `translateY(${offset}px)`;
    }
  };

  const finish = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el || !d.active) return;
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const o = optionsRef.current;
    const height = el.getBoundingClientRect().height;
    const dy = e.clientY - d.startY;
    const velocity = Math.abs(performance.now() - d.lastT) > 120 ? 0 : d.velocity;
    reset(el);
    if (cancelled) return;
    if (o.mode === 'height') {
      const next = pickSnap(o.snaps(), height, velocity, !!o.onClose);
      if (next === 'CLOSE') o.onClose?.();
      else o.onSnap(next);
    } else if (shouldDismiss(dy, velocity, d.startHeight)) {
      // Slide out from where the finger left it, then close.
      el.style.transform = `translateY(${Math.max(0, dy)}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 200ms ease-in';
        el.style.transform = 'translateY(100%)';
        window.setTimeout(() => {
          reset(el);
          o.onClose();
        }, 200);
      });
    }
  };

  return {
    sheetRef,
    /** Spread on the sheet element: it captures drags that start in the grab zone. */
    sheetProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => finish(e, false),
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => finish(e, true),
      onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
        if (suppressClick.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    }
  };
}
