import React, { useState } from 'react';
import { Camera, ScanSearch, History } from 'lucide-react';
import { PageOverlay, StatusBadge } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';
import { CV_DAMAGE_CLASSES } from '../../engines/computer-vision/classification/cvDamageClasses';
import { ReportRoadIssueCard } from '../../features/community-reports/ReportRoadIssueCard';

const cardClass = 'bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3';
const primaryLink = 'inline-block px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer';
const secondaryLink = 'inline-block px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-xs';

/** Shown on every Computer Vision page so the capability is never overstated. */
const SimulationNotice: React.FC = () => (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-3">
    <StatusBadge status="SIMULATED" />
    <p className="text-xs text-amber-100/90">
      Klasifikasi kerusakan saat ini adalah simulasi: kelas dipilih dari kata kunci pada nama berkas / URL foto (bawaan:
      pothole), dan nilai confidence serta kotak deteksi berasal dari tabel taksonomi. Tidak ada model visi yang dijalankan
      dan foto tidak dikirim ke server.
    </p>
  </div>
);

/** Route: /computer-vision/ — damage taxonomy and entry points. */
export const ComputerVisionHubPage: React.FC = () => {
  const { closePage } = usePageContext();
  const classes = Object.values(CV_DAMAGE_CLASSES);

  return (
    <PageOverlay icon={<ScanSearch className="w-6 h-6" />} title="Computer Vision" subtitle="Road-damage taxonomy, detection flow and history" onBack={closePage}>
      <SimulationNotice />

      <div className="flex flex-wrap gap-2">
        <Link to={buildPath('computerVisionDetection')} className={primaryLink}>
          Deteksi kerusakan
        </Link>
        <Link to={buildPath('computerVisionHistory')} className={secondaryLink}>
          Riwayat deteksi
        </Link>
      </div>

      <div className={cardClass}>
        <h3 className="text-sm font-extrabold text-white">Taksonomi kelas kerusakan ({classes.length} kelas)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2 pr-4 font-bold">Kelas</th>
                <th className="py-2 pr-4 font-bold">Tipe laporan</th>
                <th className="py-2 pr-4 font-bold">Severity bawaan</th>
                <th className="py-2 font-bold">Karakteristik</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.modelClass} className="border-t border-white/5 align-top">
                  <td className="py-2 pr-4 text-white font-bold whitespace-nowrap">
                    {item.icon} {item.label}
                  </td>
                  <td className="py-2 pr-4 font-mono text-cyan-300">{item.damageType}</td>
                  <td className="py-2 pr-4 text-slate-300">{item.severityLabel}</td>
                  <td className="py-2 text-slate-400">{item.characteristics.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageOverlay>
  );
};

/** Route: /computer-vision/detection/ — launches the existing photo capture / analysis flow. */
export const ComputerVisionDetectionPage: React.FC = () => {
  const { closePage, currentAccount, roadSegments, selectedSegment, onAddReport } = usePageContext();
  const [isCardOpen, setIsCardOpen] = useState<boolean>(false);

  return (
    <PageOverlay icon={<Camera className="w-6 h-6" />} title="Deteksi Kerusakan Jalan" subtitle="Ambil atau unggah foto, lalu kirim sebagai laporan" onBack={closePage}>
      <SimulationNotice />

      <div className={cardClass}>
        <p className="text-sm text-slate-300">
          Alur deteksi memakai kartu laporan yang sama dengan peta: kamera perangkat atau unggah foto, tahap analisis, lalu
          laporan tersimpan di daftar laporan warga untuk sesi ini. Izin kamera dan lokasi diminta oleh peramban.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsCardOpen(true)} className={primaryLink}>
            Mulai deteksi
          </button>
          <Link to={buildPath('computerVisionHistory')} className={secondaryLink}>
            Riwayat deteksi
          </Link>
          <Link to={buildPath('computerVision')} className={secondaryLink}>
            Taksonomi kelas
          </Link>
        </div>
      </div>

      <ReportRoadIssueCard
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        currentAccount={currentAccount}
        roadSegments={roadSegments}
        selectedSegment={selectedSegment}
        onAddReport={onAddReport}
      />
    </PageOverlay>
  );
};

/** Route: /computer-vision/history/ — reports that carry an analysis result. */
export const ComputerVisionHistoryPage: React.FC = () => {
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
                    <td className="py-2 pr-4 font-mono text-cyan-300">{report.aiAnalysis?.confidence}%</td>
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
