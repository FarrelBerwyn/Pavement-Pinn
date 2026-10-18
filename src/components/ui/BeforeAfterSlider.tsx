import React, { useState } from 'react';

/**
 * Before/After comparison with a drag slider (the legacy interaction), on the current theme.
 * "After" is only ever a real photo passed in by the caller (the F.E repair evidence); when
 * there is none, the "before" photo is shown alone with a plain note — never a stand-in image.
 */
export interface BeforeAfterSliderProps {
  before: string | null | undefined;
  after: string | null | undefined;
  beforeAlt: string;
  afterAlt: string;
  /** Shown on the after side, e.g. "Menunggu verifikasi M.O" or "Terverifikasi M.O". */
  afterBadge?: string | null;
  /** Shown when there is no after photo. */
  emptyAfterText?: string;
  onZoom?: (src: string, alt: string) => void;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ before, after, beforeAlt, afterAlt, afterBadge, emptyAfterText = 'Foto sesudah belum tersedia.', onZoom, className = '' }) => {
  const [pos, setPos] = useState(50);

  if (!before) {
    return <div className={`grid aspect-video place-items-center rounded-xl border border-line bg-canvas text-xs text-fg-muted ${className}`}>Foto belum tersedia.</div>;
  }
  if (!after) {
    return (
      <figure className={`relative overflow-hidden rounded-xl border border-line bg-canvas ${className}`}>
        <img src={before} alt={beforeAlt} className="aspect-video w-full object-cover" />
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-bold text-rose-200">SEBELUM</span>
        <figcaption className="border-t border-line px-3 py-2 text-center text-xs text-fg-muted">{emptyAfterText}</figcaption>
      </figure>
    );
  }
  return (
    <figure className={`overflow-hidden rounded-xl border border-line bg-canvas ${className}`}>
      <div className="relative aspect-video w-full select-none">
        <img src={after} alt={afterAlt} className="absolute inset-0 h-full w-full object-cover" />
        <img src={before} alt={beforeAlt} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }} aria-hidden="true">
          <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">‹ ›</span>
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-bold text-rose-200">SEBELUM</span>
        <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-bold text-emerald-200">SESUDAH</span>
        {afterBadge && <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-fg">{afterBadge}</span>}
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Geser untuk membandingkan foto sebelum dan sesudah"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      {onZoom && (
        <figcaption className="flex justify-end gap-3 border-t border-line px-3 py-1.5 text-xs">
          <button type="button" className="text-fg-muted underline hover:text-fg" onClick={() => onZoom(before, beforeAlt)}>Perbesar sebelum</button>
          <button type="button" className="text-fg-muted underline hover:text-fg" onClick={() => onZoom(after, afterAlt)}>Perbesar sesudah</button>
        </figcaption>
      )}
    </figure>
  );
};
