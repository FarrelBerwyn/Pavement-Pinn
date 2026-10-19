import React from 'react';
import { AlertTriangle, BarChart2, Camera, MapPin, Truck } from 'lucide-react';
import { RoadSegment } from '../../types';
import { Language } from '../../i18n/translations';

export interface MapAnalyticsPanelProps {
  roadSegments: RoadSegment[];
  language?: Language;
  className?: string;
}

export const MapAnalyticsPanel: React.FC<MapAnalyticsPanelProps> = ({
  roadSegments = [],
  language = 'id',
  className = ''
}) => {
  // Calculate Map Summary Metrics
  const totalLengthKm = roadSegments.reduce((sum, s) => sum + (s.lengthKm || 0), 0) || 1;
  const damagedKm = roadSegments
    .filter((s) => s.conditionCategory === 'LIGHT_DAMAGE' || s.conditionCategory === 'HEAVY_DAMAGE')
    .reduce((sum, s) => sum + (s.lengthKm || 0), 0);
  const damagedPercent = ((damagedKm / totalLengthKm) * 100).toFixed(1);
  const activeRedAlertsCount = roadSegments.filter((s) => s.activeOdolAlert === 'RED').length;
  const avgPci = roadSegments.length
    ? Math.round(roadSegments.reduce((sum, s) => sum + (s.currentPci || 0), 0) / roadSegments.length)
    : 0;

  return (
    <div
      data-testid="default-map-analytics-panel"
      className={`absolute bottom-6 sm:bottom-7 left-2 sm:left-4 right-2 sm:right-4 z-10 pointer-events-none space-y-2 sm:space-y-3 ${className}`}
    >
      {/* BOTTOM STATS & LEGEND COLUMN */}
      <div className="pointer-events-auto max-w-7xl mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 sm:p-3.5 shadow-2xl grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-slate-200 text-xs">
        {/* Stat 1: Total Jaringan */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 sm:p-3 flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 rounded-lg bg-slate-700/60 text-slate-300 border border-slate-600/60 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {language === 'en' ? 'Total Network' : 'Total Jaringan'}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-white font-mono leading-tight">
              {totalLengthKm.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
              <span className="text-[11px] font-normal text-slate-400">km</span>
            </p>
          </div>
        </div>

        {/* Stat 2: Tidak Mantap (2025) */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 sm:p-3 flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {language === 'en' ? 'Deficient Road (2025)' : 'Tidak Mantap (2025)'}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-rose-400 font-mono leading-tight">
              {damagedPercent}%{' '}
              <span className="text-[11px] font-normal text-slate-400">
                ({Number(damagedKm).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km)
              </span>
            </p>
          </div>
        </div>

        {/* Stat 3: Peringatan ODOL */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 sm:p-3 flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/60 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {language === 'en' ? 'ODOL Warning' : 'Peringatan ODOL'}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-amber-300 font-mono leading-tight">
              {activeRedAlertsCount} {language === 'en' ? 'Segments' : 'Ruas'}
            </p>
          </div>
        </div>

        {/* Stat 4: Rata-rata PCI */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 sm:p-3 flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {language === 'en' ? 'Average PCI' : 'Rata-rata PCI'}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 font-mono leading-tight">
              {avgPci} / 100
            </p>
          </div>
        </div>

        {/* Map PCI Legend & WIM Overload Legend & Laporan Warga */}
        <div className="col-span-2 lg:col-span-4 bg-slate-800/80 border border-slate-700/80 rounded-lg p-2.5 sm:p-3 flex flex-col gap-2 text-[11px] sm:text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="font-semibold text-slate-300 border-r border-slate-700 pr-2">
                PCI:
              </span>
              <span className="flex items-center text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" /> Mantap (&gt;70)
              </span>
              <span className="flex items-center text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 shrink-0" /> Sedang (50-70)
              </span>
              <span className="flex items-center text-slate-300">
                <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5 shrink-0" /> Rusak Ringan
              </span>
              <span className="flex items-center text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 shrink-0" /> Rusak Berat (&lt;35)
              </span>
            </div>

            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>Animasi Radius Berbanding Terbalik Nilai PCI</span>
            </div>
          </div>

          {/* WIM & Radius Legends */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-slate-700/80 pt-2">
            <span className="font-semibold text-slate-300 font-mono flex items-center gap-1 border-r border-slate-700 pr-2">
              <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> WIM (PUPR):
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" /> Normal
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 shrink-0" /> Overload (5-20%)
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5 shrink-0" /> Overload (20-50%)
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5 shrink-0" /> Overload (&gt;50%)
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 shrink-0" /> Ekstrim (&gt;100%)
            </span>
          </div>

          {/* Laporan Warga Legends */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-slate-700/80 pt-2">
            <span className="font-semibold text-slate-300 font-mono flex items-center gap-1 border-r border-slate-700 pr-2">
              <Camera className="w-3.5 h-3.5 text-rose-400 shrink-0" /> LAPORAN WARGA:
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 shrink-0" /> CRITICAL
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5 shrink-0" /> SEVERE
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 shrink-0" /> MODERATE
            </span>
            <span className="flex items-center text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" /> MINOR
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapAnalyticsPanel;
