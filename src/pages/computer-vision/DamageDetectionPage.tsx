import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';
import { ReportRoadIssueCard } from '../../features/community-reports/ReportRoadIssueCard';
import { SimulationNotice, cardClass, primaryLink, secondaryLink } from './components/SimulationNotice';

/** Route: /computer-vision/detection/ — launches the existing photo capture / analysis flow. */
export const DamageDetectionPage: React.FC = () => {
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
