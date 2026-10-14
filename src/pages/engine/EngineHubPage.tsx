import React from 'react';
import { Cpu, Activity, Ruler, TrendingUp, BookOpen, Lock } from 'lucide-react';
import { PageOverlay, StatusBadge, ImplementationStatus } from '../../components/ui/PageOverlay';
import { usePageContext } from '../../app/pageContext';
import { Link } from '../../app/router';
import { allowedRolesFor, buildPath, getRoute, RouteId } from '../../app/routeConfig';
import { canOpenRoute, loginPathFor } from '../../app/guards/routeAccess';

interface EngineTool {
  routeId: RouteId;
  icon: React.ReactNode;
  summary: string;
  status: ImplementationStatus;
  statusNote: string;
}

const TOOLS: EngineTool[] = [
  {
    routeId: 'enginePinn',
    icon: <BookOpen className="w-5 h-5" />,
    summary: 'What the engine computes, its equations and constants, and what is simulated.',
    status: 'IMPLEMENTED',
    statusNote: 'Model card for the current engine.'
  },
  {
    routeId: 'engineSimulation',
    icon: <Activity className="w-5 h-5" />,
    summary: 'Interactive what-if simulation: axle load, rain, flood, temperature, CBR, thickness, modulus.',
    status: 'IMPLEMENTED',
    statusNote: 'Deterministic calculation; hardware telemetry is simulated.'
  },
  {
    routeId: 'engineFwd',
    icon: <Ruler className="w-5 h-5" />,
    summary: 'FWD deflection basin, strain tensors against limits, overlay design and SPK authorisation.',
    status: 'IMPLEMENTED',
    statusNote: 'Uses simulation output; no live FWD device feed.'
  },
  {
    routeId: 'enginePrediction',
    icon: <TrendingUp className="w-5 h-5" />,
    summary: 'PCI trend and treatment history per corridor.',
    status: 'SIMULATED',
    statusNote: 'Maintenance history entries are sample demonstration records.'
  }
];

/** Route: /engine/ — index of the engine tools (public; restricted tools are marked). */
export const EngineHubPage: React.FC = () => {
  const { currentAccount, closePage } = usePageContext();

  return (
    <PageOverlay icon={<Cpu className="w-6 h-6" />} title="PAVEMENT-PINN Engine" subtitle="Simulation, FWD analysis and PCI prediction tools" onBack={closePage}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => {
          const route = getRoute(tool.routeId);
          const allowed = canOpenRoute(tool.routeId, currentAccount);
          const path = buildPath(tool.routeId);
          return (
            <div key={tool.routeId} className="bg-[#121622] border border-white/10 rounded-3xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-cyan-300 border border-indigo-500/30 shrink-0">{tool.icon}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-white">{route.title}</h3>
                    <p className="text-[11px] font-mono text-slate-400">{path}</p>
                  </div>
                </div>
                <StatusBadge status={tool.status} />
              </div>
              <p className="text-xs text-slate-300">{tool.summary}</p>
              <p className="text-[11px] text-slate-400">{tool.statusNote}</p>
              {allowed ? (
                <Link to={path} className="inline-block px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                  Buka
                </Link>
              ) : (
                <Link
                  to={loginPathFor(path)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-300 font-bold text-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khusus {allowedRolesFor(route).join(' / ')}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </PageOverlay>
  );
};
