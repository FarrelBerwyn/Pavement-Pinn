import React from 'react';
import { X } from 'lucide-react';
import { MapSheetState, stepSheetState } from './sheetState';
import { useSheetDrag } from '../ui/useSheetDrag';

/** Heights (px) of the phone snap points; they match the classes in `mobileShape`. */
function mapSheetSnaps() {
  const vh = window.innerHeight;
  return [
    { key: 'PEEK' as const, height: Math.min(176, Math.max(132, vh * 0.2)) },
    { key: 'HALF' as const, height: vh * 0.46 },
    { key: 'FULL' as const, height: vh * 0.88 }
  ];
}

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
  const { sheetRef, sheetProps } = useSheetDrag<MapSheetState>({
    mode: 'height',
    snaps: mapSheetSnaps,
    onSnap: (next) => next !== state && onStateChange(next),
    onClose,
    maxWidth: 767
  });

  if (!isOpen) return null;

  const apply = (next: MapSheetState | 'CLOSED') => {
    if (next === 'CLOSED') onClose();
    else if (next !== state) onStateChange(next);
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
        ref={sheetRef as React.RefObject<HTMLElement>}
        {...sheetProps}
        className={`fixed z-40 flex flex-col bg-[#0f1420] text-slate-100 border border-white/10 shadow-lg overflow-hidden transition-[height,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${mobileShape} md:absolute md:inset-x-auto md:right-4 md:top-20 md:bottom-6 md:h-auto md:max-h-none md:min-h-0 md:w-[380px] md:rounded-2xl`}
      >
        <div
          data-sheet-grab
          onClick={() => apply(state === 'FULL' ? 'HALF' : stepSheetState(state, 'UP'))}
          className="shrink-0 pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none md:hidden"
        >
          <span className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        <header data-sheet-grab className="touch-none md:touch-auto shrink-0 px-4 pt-1 md:pt-4 pb-3 flex items-start gap-3 border-b border-white/10">
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

        <div data-sheet-scroll className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          {children}
        </div>
      </section>
    </>
  );
};
