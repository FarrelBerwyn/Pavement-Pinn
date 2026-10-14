import React from 'react';
import { Route as RouteIcon } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';
import { RoadConditionCategory } from '../../types';

const CONDITION_LABEL: Record<RoadConditionCategory, string> = {
  GOOD: 'Baik',
  MODERATE: 'Sedang',
  LIGHT_DAMAGE: 'Rusak Ringan',
  HEAVY_DAMAGE: 'Rusak Berat'
};

const cardClass = 'bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3';
const primaryButton = 'px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer';
const secondaryLink = 'inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-xs';

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-[#181f33] p-3 rounded-2xl border border-white/10">
    <p className="text-[10px] font-mono font-bold uppercase text-slate-400">{label}</p>
    <p className="text-sm font-extrabold text-white">{value}</p>
  </div>
);

/**
 * Route: /roads/:roadId/ — public-safe road segment detail.
 *
 * Deliberately limited to information that is already public on the map: identity,
 * condition index, survey date and community reports. WIM vehicle records (licence
 * plates, per-truck weights) and engineering diagnostics are NOT shown here.
 */
export const RoadDetailPage: React.FC<{ params: Record<string, string> }> = ({ params }) => {
  const { closePage, roadSegments, communityReports, onSelectSegment, onLaunchSimulation, setActiveNav } = usePageContext();
  const segment = roadSegments.find((item) => item.id === params.roadId);

  if (!segment) {
    return (
      <PageOverlay icon={<RouteIcon className="w-6 h-6" />} title="Ruas jalan tidak ditemukan" subtitle={`ID: ${params.roadId}`} onBack={closePage}>
        <div className={cardClass}>
          <p className="text-sm text-slate-300">Tidak ada ruas jalan dengan ID tersebut. Pilih salah satu ruas yang tersedia:</p>
          <div className="flex flex-wrap gap-2">
            {roadSegments.map((item) => (
              <Link key={item.id} to={buildPath('roadDetail', { roadId: item.id })} className={secondaryLink}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </PageOverlay>
    );
  }

  const reports = communityReports.filter((report) => report.segmentId === segment.id);

  return (
    <PageOverlay icon={<RouteIcon className="w-6 h-6" />} title={segment.name} subtitle={`${segment.corridor} — ${segment.province}`} onBack={closePage}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Fact label="PCI saat ini" value={`${segment.currentPci} / 100`} />
        <Fact label="Kondisi" value={CONDITION_LABEL[segment.conditionCategory]} />
        <Fact label="KM Post" value={segment.kmPost} />
        <Fact label="Panjang ruas" value={`${segment.lengthKm} km`} />
        <Fact label="Survei terakhir" value={segment.lastSurveyDate} />
        <Fact label="LHR" value={segment.dailyTrafficVolumeLhr.toLocaleString('id-ID')} />
        <Fact label="Stasiun WIM" value={segment.hasWimStation ? segment.wimStationName || 'Ada' : 'Tidak ada'} />
        <Fact label="Laporan warga" value={reports.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            onSelectSegment(segment);
            setActiveNav('MAP');
          }}
          className={primaryButton}
        >
          Lihat di peta
        </button>
        <button onClick={() => onLaunchSimulation(segment)} className={`${secondaryLink} cursor-pointer`}>
          Simulasi PINN untuk ruas ini
        </button>
        <Link to={buildPath('reports')} className={secondaryLink}>
          Semua laporan
        </Link>
      </div>

      <div className={cardClass}>
        <h3 className="text-sm font-extrabold text-white">Laporan warga pada ruas ini</h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada laporan untuk ruas ini.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-white/5 pt-2">
                <div>
                  <p className="text-xs font-bold text-white">{report.damageTypeLabel}</p>
                  <p className="text-[11px] text-slate-400">{report.timestamp}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{report.severity}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300">{report.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageOverlay>
  );
};
