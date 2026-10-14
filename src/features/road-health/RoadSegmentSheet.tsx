import React from 'react';
import { DamageReport, RoadConditionCategory, RoadSegment } from '../../types';
import { Language } from '../../i18n/translations';
import { DEMO_DATA_LABEL } from '../../data/provenance';

const CONDITION: Record<RoadConditionCategory, { id: string; en: string; color: string }> = {
  GOOD: { id: 'Mantap', en: 'Good', color: '#10b981' },
  MODERATE: { id: 'Sedang', en: 'Moderate', color: '#f59e0b' },
  LIGHT_DAMAGE: { id: 'Rusak ringan', en: 'Light damage', color: '#f97316' },
  HEAVY_DAMAGE: { id: 'Rusak berat', en: 'Heavy damage', color: '#ef4444' }
};

const SEVERITY_COLOR: Record<DamageReport['severity'], string> = {
  CRITICAL: '#ef4444',
  SEVERE: '#f97316',
  MODERATE: '#f59e0b',
  LIGHT: '#10b981'
};

export const DemoTag: React.FC<{ language: Language }> = ({ language }) => (
  <span className="shrink-0 text-[9px] font-bold tracking-wide text-amber-300 border border-amber-400/40 rounded px-1.5 py-0.5">
    {DEMO_DATA_LABEL[language]}
  </span>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <dt className="text-[11px] text-slate-400 shrink-0">{label}</dt>
    <dd className="text-xs text-slate-100 text-right min-w-0">{children}</dd>
  </div>
);

/** Compact report rows, used for a segment's reports and for a cluster's members. */
export const ReportList: React.FC<{
  reports: DamageReport[];
  onSelectReport: (report: DamageReport) => void;
  emptyText: string;
}> = ({ reports, onSelectReport, emptyText }) => {
  if (reports.length === 0) return <p className="text-xs text-slate-400 py-2">{emptyText}</p>;
  return (
    <ul className="divide-y divide-white/10">
      {reports.map((report) => (
        <li key={report.id}>
          <button
            type="button"
            onClick={() => onSelectReport(report)}
            className="w-full py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-white/5 rounded-lg px-1"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLOR[report.severity] }} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-100 truncate">{report.damageTypeLabel}</span>
              <span className="block text-[10px] text-slate-400 truncate">
                {report.id} · {report.timestamp}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">{report.severity}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

interface RoadSegmentSheetProps {
  segment: RoadSegment;
  reports: DamageReport[];
  language: Language;
  onSelectReport: (report: DamageReport) => void;
  /** Opens the existing simulator for this segment. */
  onOpenSimulation?: (segment: RoadSegment) => void;
}

/**
 * Road-segment detail for the map sheet. It shows only what the dataset holds and says
 * where each figure comes from; it never presents a model prediction.
 */
export const RoadSegmentSheet: React.FC<RoadSegmentSheetProps> = ({
  segment,
  reports,
  language,
  onSelectReport,
  onOpenSimulation
}) => {
  const en = language === 'en';
  const condition = CONDITION[segment.conditionCategory];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: condition.color }} />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{en ? 'Pavement condition' : 'Kondisi perkerasan'}</p>
          <p className="text-base font-bold text-white leading-tight">
            {en ? condition.en : condition.id}
            <span className="ml-2 text-xs font-medium text-slate-300">PCI {segment.currentPci}</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {en ? 'Survey date in dataset' : 'Tanggal survei pada dataset'}: {segment.lastSurveyDate}
          </p>
        </div>
      </div>

      <dl className="divide-y divide-white/10 border-y border-white/10">
        <Row label={en ? 'Segment ID' : 'ID ruas'}>{segment.id}</Row>
        <Row label={en ? 'Corridor' : 'Koridor'}>{segment.corridor}</Row>
        <Row label={en ? 'Location' : 'Lokasi'}>
          {segment.kmPost} · {segment.province}
        </Row>
        <Row label={en ? 'Length' : 'Panjang'}>{segment.lengthKm} km</Row>
        <Row label={en ? 'Reports on this segment' : 'Laporan pada ruas ini'}>{reports.length}</Row>
      </dl>

      <section>
        <h3 className="text-[11px] font-semibold text-slate-300 mb-1">{en ? 'Related reports' : 'Laporan terkait'}</h3>
        <ReportList
          reports={reports}
          onSelectReport={onSelectReport}
          emptyText={en ? 'No reports are linked to this segment.' : 'Belum ada laporan yang terkait dengan ruas ini.'}
        />
      </section>

      <section className="text-[11px] leading-relaxed text-slate-400 space-y-1.5">
        <h3 className="font-semibold text-slate-300">{en ? 'Data status' : 'Status data'}</h3>
        <p>
          {en
            ? 'Segment attributes are synthetic demo data. The line on the map is illustrative geometry, not a surveyed alignment. No field inspection data is available.'
            : 'Atribut ruas adalah data demo sintetis. Garis pada peta adalah geometri ilustratif, bukan trase hasil survei. Data inspeksi lapangan belum tersedia.'}
        </p>
        <p>
          <span className="font-semibold text-slate-300">RULE-BASED</span>{' '}
          {en
            ? 'The simulator estimates strain and service life with a deterministic formula. A trained PINN model is not available, so no model prediction is shown here.'
            : 'Simulator memperkirakan regangan dan umur layan dengan rumus deterministik. Model PINN terlatih belum tersedia, sehingga tidak ada prediksi model di sini.'}
        </p>
        {onOpenSimulation && (
          <button
            type="button"
            onClick={() => onOpenSimulation(segment)}
            className="mt-1 text-xs font-semibold text-amber-300 underline underline-offset-2 cursor-pointer"
          >
            {en ? 'Open rule-based simulation for this segment' : 'Buka simulasi berbasis aturan untuk ruas ini'}
          </button>
        )}
      </section>
    </div>
  );
};
