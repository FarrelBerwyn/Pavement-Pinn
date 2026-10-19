import React from 'react';
import { DamageReport, RoadConditionCategory, RoadSegment } from '../../types';
import { Language } from '../../i18n/translations';
import { DEMO_DATA_LABEL } from '../../data/provenance';

const CONDITION: Record<RoadConditionCategory, { id: string; en: string; color: string }> = {
  GOOD: { id: 'Mantap', en: 'Good', color: '#57ae78' },
  MODERATE: { id: 'Sedang', en: 'Moderate', color: '#e8b23a' },
  LIGHT_DAMAGE: { id: 'Rusak ringan', en: 'Light damage', color: '#e2823d' },
  HEAVY_DAMAGE: { id: 'Rusak berat', en: 'Heavy damage', color: '#d9655d' }
};

const SEVERITY_COLOR: Record<DamageReport['severity'], string> = {
  CRITICAL: '#d9655d',
  SEVERE: '#e2823d',
  MODERATE: '#e8b23a',
  LIGHT: '#57ae78'
};

export const DemoTag: React.FC<{ language: Language }> = ({ language }) => (
  <span className="shrink-0 text-xs font-bold tracking-wide text-amber-300 border border-amber-400/40 rounded px-2 py-1">
    {DEMO_DATA_LABEL[language]}
  </span>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
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
              <span className="block text-xs text-slate-400 truncate">
                {report.id} · {report.timestamp}
              </span>
            </span>
            <span className="text-xs text-slate-400 shrink-0">{report.severity}</span>
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
  /** Opens the segment detail: estimated risk, Road Story and What-If. */
  onOpenDetail?: (segment: RoadSegment) => void;
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
  onOpenSimulation,
  onOpenDetail
}) => {
  const en = language === 'en';
  const condition = CONDITION[segment.conditionCategory];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-2 self-stretch rounded-full" style={{ backgroundColor: condition.color }} />
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{en ? 'Pavement condition' : 'Kondisi perkerasan'}</p>
          <p className="text-base font-bold text-white leading-tight">
            {en ? condition.en : condition.id}
            <span className="ml-2 text-xs font-medium text-slate-300">PCI {segment.currentPci}</span>
          </p>
          <p className="text-xs text-slate-400">
            {en ? 'Survey date in dataset' : 'Tanggal survei pada dataset'}: {segment.lastSurveyDate}
          </p>
        </div>
      </div>

      {onOpenDetail && (
        <button
          type="button"
          onClick={() => onOpenDetail(segment)}
          className="w-full rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-colors"
        >
          {en ? 'Risk, why, Road Story & What-If' : 'Risiko, alasan, Road Story & What-If'}
        </button>
      )}

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
        <h3 className="text-xs font-semibold text-slate-300 mb-1">{en ? 'Related reports' : 'Laporan terkait'}</h3>
        <ReportList
          reports={reports}
          onSelectReport={onSelectReport}
          emptyText={en ? 'No reports are linked to this segment.' : 'Belum ada laporan yang terkait dengan ruas ini.'}
        />
      </section>

      <section className="text-xs leading-relaxed text-slate-400 space-y-2">
        <h3 className="font-semibold text-slate-300">{en ? 'Data status' : 'Status data'}</h3>
        <p>
          {segment.geometryStatus === 'DIGITISED'
            ? en
              ? 'Segment attributes are synthetic demo data. Road geometry follows verified OpenStreetMap road centerline. Field inspection data is not available.'
              : 'Atribut ruas adalah data demo sintetis. Geometri jalan mengikuti trase centerline OpenStreetMap terverifikasi. Data inspeksi lapangan belum tersedia.'
            : en
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
