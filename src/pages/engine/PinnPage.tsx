import React from 'react';
import { BookOpen } from 'lucide-react';
import { PageOverlay, StatusBadge, ImplementationStatus } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { buildPath } from '../../app/routeConfig';

/** Formulas exactly as implemented in src/engines/pinn/core/pinnEngine.ts. */
const EQUATIONS: Array<{ name: string; formula: string }> = [
  { name: 'Water decay factor', formula: 'max(0.4, 1 - 0.004 x rain[mm/h] - 0.015 x flood[h])' },
  { name: 'Subgrade modulus Es', formula: '10 x CBR x waterDecay   [MPa]' },
  { name: 'Asphalt modulus E1 (temperature softening)', formula: 'E1 x max(0.5, 1 - 0.012 x (T - 25))   [MPa]' },
  { name: 'ODOL load factor (Fourth Power Law)', formula: '(axleLoad / 10 t)^4' },
  { name: 'Tensile strain at asphalt bottom', formula: 'round(120 x P / (h^1.75 x (E1 / 2000)^0.4))   [microstrain]' },
  { name: 'Compressive strain at subgrade top', formula: 'round(210 x P / ((h + 15)^1.4 x (Es / 40)^0.75))   [microstrain]' },
  { name: 'Maximum surface deflection w0', formula: 'round(45 x P / ((Es / 40)^0.6 x (h / 10)^0.5))   [micron]' },
  { name: 'Deflection basin w(r)', formula: 'w0 x exp(-0.0018 x r[mm]),  r = 0, 200, 400, 600, 900, 1200, 1500' },
  { name: 'Annual PCI drop', formula: 'min(35, 2.5 x loadFactor / waterDecay)' },
  { name: 'Predicted PCI', formula: 'max(10, round(currentPCI - 0.8 x annualPciDrop))' }
];

const CAPABILITIES: Array<{ capability: string; status: ImplementationStatus; note: string }> = [
  {
    capability: 'Pavement response and PCI calculation',
    status: 'IMPLEMENTED',
    note: 'Deterministic closed-form formulas (table above), evaluated in the browser and by POST /api/simulate.'
  },
  {
    capability: 'Rule engine (alert status, WIM action, speed limit, overlay recommendation)',
    status: 'IMPLEMENTED',
    note: 'Threshold rules inside the same engine function; covered by the regression test suite.'
  },
  {
    capability: 'Trained neural network (weights, training loop, PDE-residual loss)',
    status: 'PLANNED',
    note: 'Not present in this repository. The physics-loss and data-loss figures shown in the UI are generated values.'
  },
  {
    capability: 'OpenVINO inference on Intel CPU / iGPU / NPU',
    status: 'SIMULATED',
    note: 'No OpenVINO runtime is executed. Latency, power and utilisation are per-device lookup constants with random jitter.'
  },
  {
    capability: 'Bina Marga WIM data pipeline and PINN training run',
    status: 'SIMULATED',
    note: 'Records are generated locally; nothing is fetched from binamarga.pu.go.id and no training occurs.'
  },
  {
    capability: 'OpenVINO IR / deployment-config export',
    status: 'SIMULATED',
    note: 'Illustrative XML descriptor and JSON template; not converted from a trained model and shipped without weights.'
  }
];

const buttonClass = 'px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-bold text-xs cursor-pointer';

/** Route: /engine/pinn/ — model card for the PINN engine with accurate capability labels. */
export const PinnPage: React.FC = () => {
  const { closePage, onOpenOpenvinoModal, onOpenWimPipeline, onOpenAuditModal } = usePageContext();

  return (
    <PageOverlay
      icon={<BookOpen className="w-6 h-6" />}
      title="PINN Engine Overview"
      subtitle="What the engine computes today, and what is simulated or planned"
      onBack={closePage}
    >
      <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white">Governing formulas</h3>
        <p className="text-xs text-slate-400">
          P = axle load [t], h = asphalt thickness [cm], T = surface temperature [°C]. Empirical coefficients are fixed constants
          in the source; they have not been calibrated against a ground-truth FWD dataset in this repository.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {EQUATIONS.map((eq) => (
                <tr key={eq.name} className="border-t border-white/5">
                  <td className="py-2 pr-4 text-slate-300 align-top whitespace-nowrap">{eq.name}</td>
                  <td className="py-2 font-mono text-cyan-300">{eq.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white">Capability status</h3>
        <div className="space-y-3">
          {CAPABILITIES.map((item) => (
            <div key={item.capability} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 border-t border-white/5 pt-3">
              <div className="sm:w-28 shrink-0">
                <StatusBadge status={item.status} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{item.capability}</p>
                <p className="text-xs text-slate-400">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to={buildPath('engineSimulation')} className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
          Buka Simulasi PINN
        </Link>
        <button onClick={onOpenOpenvinoModal} className={buttonClass}>
          Diagnostik OpenVINO (simulasi)
        </button>
        <button onClick={onOpenWimPipeline} className={buttonClass}>
          Pipeline WIM Bina Marga (simulasi)
        </button>
        <button onClick={onOpenAuditModal} className={buttonClass}>
          Jejak Audit
        </button>
      </div>
    </PageOverlay>
  );
};
