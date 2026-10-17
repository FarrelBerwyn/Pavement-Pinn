import React from 'react';
import { ScanSearch } from 'lucide-react';
import { PageOverlay } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';
import { CV_DAMAGE_CLASSES } from '../../engines/computer-vision/classification/cvDamageClasses';
import { SimulationNotice, cardClass, primaryLink, secondaryLink } from './components/SimulationNotice';

/** Route: /computer-vision/ — damage taxonomy and entry points. */
export const ComputerVisionPage: React.FC = () => {
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
        <h3 className="text-sm font-semibold text-white">Taksonomi kelas kerusakan ({classes.length} kelas)</h3>
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
