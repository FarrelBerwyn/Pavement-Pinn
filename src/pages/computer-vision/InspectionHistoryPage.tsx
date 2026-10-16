import React from 'react';
import { History } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';
import { SimulationNotice, cardClass, primaryLink } from './components/SimulationNotice';

/** Route: /computer-vision/history/ — reports that carry an analysis result. */
export const InspectionHistoryPage: React.FC = () => {
  const { closePage, communityReports } = usePageContext();
  const analysed = communityReports.filter((report) => report.aiAnalysis);

  return (
    <PageOverlay icon={<History className="w-6 h-6" />} title="Riwayat Deteksi" subtitle="Laporan yang memiliki hasil analisis foto" onBack={closePage}>
      <SimulationNotice />

      <div className={cardClass}>
        <h3 className="text-sm font-extrabold text-white">
          {analysed.length} dari {communityReports.length} laporan memiliki hasil analisis
        </h3>
        {analysed.length === 0 ? (
          <p className="text-xs text-slate-400">
            Belum ada laporan dengan hasil analisis pada sesi ini. Riwayat disimpan di memori peramban dan kosong kembali saat
            halaman dimuat ulang.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="py-2 pr-4 font-bold">Laporan</th>
                  <th className="py-2 pr-4 font-bold">Kelas terdeteksi</th>
                  <th className="py-2 pr-4 font-bold">Confidence</th>
                  <th className="py-2 pr-4 font-bold">Ruas</th>
                  <th className="py-2 font-bold">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {analysed.map((report) => (
                  <tr key={report.id} className="border-t border-white/5 align-top">
                    <td className="py-2 pr-4 font-mono text-slate-300 whitespace-nowrap">{report.id}</td>
                    <td className="py-2 pr-4 text-white font-bold">
                      {report.aiAnalysis?.icon} {report.aiAnalysis?.label}
                    </td>
                    <td className="py-2 pr-4 font-mono text-cyan-300">{report.aiAnalysis?.modelStatus === 'REAL' && report.aiAnalysis.modelVersion && report.aiAnalysis.confidence != null ? `${report.aiAnalysis.confidence}% (${report.aiAnalysis.modelVersion})` : 'belum diklasifikasi'}</td>
                    <td className="py-2 pr-4">
                      <Link to={buildPath('roadDetail', { roadId: report.segmentId })} className="text-amber-300 underline">
                        {report.segmentName}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-400 whitespace-nowrap">{report.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to={buildPath('computerVisionDetection')} className={primaryLink}>
          Deteksi baru
        </Link>
      </div>
    </PageOverlay>
  );
};
