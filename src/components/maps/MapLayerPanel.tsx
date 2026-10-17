import React, { useEffect, useRef } from 'react';
import { Globe, Moon, Sun, X } from 'lucide-react';
import type { BaseMapStyle } from './basemap';
import type { Language } from '../../i18n/translations';
import type { DensitySelection } from '../../features/community-reports/reportDensity';
import { CONDITION_COLOR } from './mapGeoJson';

export const MAP_LAYER_PANEL_ID = 'map-layer-panel';

interface MapLayerPanelProps {
  open: boolean;
  onClose: () => void;
  /** The toggle button: clicks on it are not "outside" clicks. */
  anchorRef: React.RefObject<HTMLElement | null>;
  baseMapStyle: BaseMapStyle;
  onBaseMapStyleChange: (style: BaseMapStyle) => void;
  showDensity: boolean;
  onShowDensityChange: (on: boolean) => void;
  density: DensitySelection;
  language: Language;
}

const BASEMAPS: { style: BaseMapStyle; id: string; en: string; Icon: typeof Sun }[] = [
  { style: 'LIGHT', id: 'Terang', en: 'Light', Icon: Sun },
  { style: 'DARK', id: 'Gelap', en: 'Dark', Icon: Moon },
  { style: 'SATELLITE', id: 'Satelit', en: 'Satellite', Icon: Globe }
];

const CONDITIONS = [
  ['GOOD', 'Mantap', 'Good'],
  ['MODERATE', 'Sedang', 'Moderate'],
  ['LIGHT_DAMAGE', 'Rusak ringan', 'Light damage'],
  ['HEAVY_DAMAGE', 'Rusak berat', 'Heavy damage']
] as const;

/**
 * Compact layer settings that open next to the layer button and close again with the
 * close button, Escape, or a click elsewhere. Closing never changes a layer: the state
 * lives in the layout and is shown again when the panel reopens.
 */
export const MapLayerPanel: React.FC<MapLayerPanelProps> = ({
  open,
  onClose,
  anchorRef,
  baseMapStyle,
  onBaseMapStyleChange,
  showDensity,
  onShowDensityChange,
  density,
  language
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const en = language === 'en';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        anchorRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const sourceNote =
    density.provenance === 'NONE'
      ? en
        ? 'No user reports match the current filter.'
        : 'Tidak ada laporan pengguna yang cocok dengan filter.'
      : en
      ? `${density.reports.length} user reports (demo data: ${density.counts.demoSeed} sample, ${density.counts.session} from this session; not stored on a server).`
      : `${density.reports.length} laporan pengguna (data demo: ${density.counts.demoSeed} contoh, ${density.counts.session} dari sesi ini; tidak tersimpan di server).`;

  return (
    <div
      ref={panelRef}
      id={MAP_LAYER_PANEL_ID}
      role="dialog"
      aria-label={en ? 'Map layers' : 'Lapisan peta'}
      className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-slate-200 shadow-lg transition-[opacity,transform] duration-150 starting:opacity-0 starting:-translate-y-1"
    >
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-semibold text-white">{en ? 'Map layers' : 'Lapisan peta'}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={en ? 'Close layer settings' : 'Tutup pengaturan lapisan'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div role="radiogroup" aria-label={en ? 'Basemap' : 'Peta dasar'} className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/60 p-1">
        {BASEMAPS.map(({ style, id, en: label, Icon }) => {
          const active = baseMapStyle === style;
          return (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onBaseMapStyleChange(style)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold cursor-pointer ${
                active ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {en ? label : id}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{en ? 'Report density' : 'Kepadatan laporan'}</p>
          <p className="text-xs leading-snug text-slate-400">
            {en
              ? 'Where users reported damage. A count of reports, not damage level or risk.'
              : 'Lokasi laporan pengguna. Jumlah laporan, bukan tingkat kerusakan atau risiko.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showDensity}
          aria-label={en ? 'Report density' : 'Kepadatan laporan'}
          onClick={() => onShowDensityChange(!showDensity)}
          className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
            showDensity ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              showDensity ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {showDensity && (
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          <div
            className="h-2 rounded-full"
            style={{ background: 'linear-gradient(90deg,#8296b0,#57ae78,#e8b23a,#e2823d,#d9655d)' }}
          />
          <div className="flex justify-between text-slate-400">
            <span>{en ? 'Low' : 'Rendah'}</span>
            <span>{en ? 'Medium' : 'Sedang'}</span>
            <span>{en ? 'High' : 'Tinggi'}</span>
          </div>
          <p className="text-slate-400 leading-snug">
            <span className="font-bold text-amber-300">DEMO</span> · {sourceNote}
          </p>
        </div>
      )}

      <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300">
        <p className="mb-1 font-semibold text-slate-400">{en ? 'Segment condition (demo data)' : 'Kondisi ruas (data demo)'}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {CONDITIONS.map(([key, id, label]) => (
            <span key={key} className="flex items-center gap-2">
              <span className="h-1 w-4 rounded-full" style={{ backgroundColor: CONDITION_COLOR[key] }} />
              {en ? label : id}
            </span>
          ))}
        </div>
        <p className="mt-1 text-slate-500">
          {en ? 'Lines are illustrative geometry.' : 'Garis adalah geometri ilustratif.'}
        </p>
      </div>
    </div>
  );
};
