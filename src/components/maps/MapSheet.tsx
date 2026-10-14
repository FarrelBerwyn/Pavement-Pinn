import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MapSheetState, sheetStateAfterDrag, stepSheetState } from './sheetState';

interface MapSheetProps {
  isOpen: boolean;
  state: MapSheetState;
  onStateChange: (state: MapSheetState) => void;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Small status element next to the title (for example a provenance label). */
  badge?: React.ReactNode;
  closeLabel: string;
  children: React.ReactNode;
}

/**
 * Shared bottom sheet for map selections (road segment, report list).
 *
 * Phone: PEEK sits above the bottom navigation and leaves the map fully usable; HALF
 * keeps the upper half of the map live; FULL covers the map and dims what is left.
 * From 768 px it is a fixed side panel and the three states only change its height.
 */
export const MapSheet: React.FC<MapSheetProps> = ({
  isOpen,
  state,
  onStateChange,
  onClose,
  title,
  subtitle,
  badge,
  closeLabel,
  children
}) => {
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  if (!isOpen) return null;

  const apply = (next: MapSheetState | 'CLOSED') => {
    if (next === 'CLOSED') onClose();
    else if (next !== state) onStateChange(next);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation; without it the drag still ends on pointerup over the handle
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    setDragOffset(e.clientY - dragStartY.current);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    setDragOffset(0);
    // A press without movement on the handle steps the sheet up (or back to HALF from FULL)
    if (Math.abs(delta) < 6) apply(state === 'FULL' ? 'HALF' : stepSheetState(state, 'UP'));
    else apply(sheetStateAfterDrag(state, delta));
  };

  const mobileShape =
    state === 'PEEK'
      ? 'inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+88px)] h-[20vh] min-h-[132px] max-h-[176px] rounded-2xl'
      : state === 'HALF'
      ? 'inset-x-0 bottom-0 h-[46vh] rounded-t-2xl'
      : 'inset-x-0 bottom-0 h-[88vh] rounded-t-2xl';

  return (
    <>
      {state === 'FULL' && (
        <div
          aria-hidden="true"
          onClick={() => onStateChange('HALF')}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <section
        role="dialog"
        aria-label={title}
        data-testid="map-sheet"
        data-state={state}
        style={dragOffset !== 0 ? { transform: `translateY(${Math.max(-24, dragOffset)}px)` } : undefined}
        className={`fixed z-40 flex flex-col bg-[#0f1420] text-slate-100 border border-white/10 shadow-lg overflow-hidden ${
          dragOffset !== 0 ? '' : 'transition-[height,transform] duration-200 ease-out'
        } ${mobileShape} md:absolute md:inset-x-auto md:right-4 md:top-20 md:bottom-6 md:h-auto md:max-h-none md:min-h-0 md:w-[380px] md:rounded-2xl`}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragStartY.current = null;
            setDragOffset(0);
          }}
          className="shrink-0 pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none md:hidden"
        >
          <span className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        <header className="shrink-0 px-4 pt-1 md:pt-4 pb-3 flex items-start gap-3 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-snug text-white truncate">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-400 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          {children}
        </div>
      </section>
    </>
  );
};
