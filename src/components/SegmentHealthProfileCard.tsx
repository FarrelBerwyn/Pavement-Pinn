import React from 'react';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Droplets,
  Truck,
  Activity,
  Layers,
  Sparkles,
  Target,
  X,
  MapPin,
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import {
  StrategicCorridor,
  StrategicRegion,
  getPciColor,
  getPciCategoryName
} from '../data/policyMapData';

interface SegmentHealthProfileCardProps {
  corridor: StrategicCorridor;
  region: StrategicRegion;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails: () => void;
  onOpenBudgetSimulation: () => void;
  selectedScenario: string;
}

export const SegmentHealthProfileCard: React.FC<SegmentHealthProfileCardProps> = ({
  corridor,
  region,
  isOpen,
  onClose,
  onOpenDetails,
  onOpenBudgetSimulation,
  selectedScenario
}) => {
  if (!isOpen) return null;

  const pciCurrentColor = getPciColor(corridor.currentPci);
  const pci2030Color = getPciColor(corridor.projection2030NoAction);

  return (
    <div className="absolute top-36 sm:top-40 right-14 sm:right-16 z-20 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs animate-fade-in max-h-[calc(100vh-210px)] overflow-y-auto custom-scrollbar">
      {/* 1. Header with Priority Tag */}
      <div className="flex items-start justify-between pb-2.5 border-b border-slate-800">
        <div className="min-w-0 pr-2">
          <div className="flex items-center space-x-1.5 mb-1">
            <span
              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                corridor.priorityLevel === 'P1'
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : corridor.priorityLevel === 'P2'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}
            >
              PRIORITAS {corridor.priorityLevel} ({corridor.priorityLabel})
            </span>
          </div>
          <h3 className="text-sm font-bold text-white leading-tight truncate">
            {corridor.name}
          </h3>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {corridor.corridor} &bull; {corridor.province}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title="Tutup Profil Ruas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Key Metrics Strip (PCI Saat Ini, Proyeksi 2030, Remaining Life) */}
      <div className="grid grid-cols-3 gap-1.5 my-2.5">
        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 text-center">
          <span className="text-[9px] text-slate-400 block font-semibold">PCI Saat Ini</span>
          <span className="text-lg font-bold" style={{ color: pciCurrentColor }}>
            {corridor.currentPci}
          </span>
          <span className="text-[8px] text-slate-400 block truncate">
            {corridor.pinnHealthProfile.roadConditionCategory}
          </span>
        </div>

        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 text-center">
          <span className="text-[9px] text-slate-400 block font-semibold">Proyeksi 2030</span>
          <span className="text-lg font-bold text-rose-400">
            {corridor.projection2030NoAction}
          </span>
          <span className="text-[8px] text-rose-400/90 block truncate">
            Tanpa Intervensi
          </span>
        </div>

        <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/80 text-center">
          <span className="text-[9px] text-slate-400 block font-semibold">Remaining Life</span>
          <span className="text-lg font-bold text-amber-400">
            {corridor.remainingLifeYears}
          </span>
          <span className="text-[8px] text-slate-400 block">Tahun</span>
        </div>
      </div>

      {/* 3. 4-Pillars Multi-Physics Health Indicators */}
      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/70 space-y-2">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Profil 4 Pilar Multi-Fisika</span>
          <span className="text-cyan-400 font-mono">PINN PDE Solver</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {/* Pilar 1: Kondisi Jalan */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-start space-x-2">
            <div className="p-1 rounded-md bg-amber-500/15 text-amber-400 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-400 text-[9px] block">Kondisi Eksisting</span>
              <span className="font-bold text-white block">PCI {corridor.currentPci}</span>
              <span className="text-[8px] text-amber-400">Alligator Crack</span>
            </div>
          </div>

          {/* Pilar 2: Beban WIM */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-start space-x-2">
            <div className="p-1 rounded-md bg-rose-500/15 text-rose-400 shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-400 text-[9px] block">Beban Gandar WIM</span>
              <span className="font-bold text-rose-400 block">{corridor.pinnHealthProfile.wimAxleLoadTon} Ton</span>
              <span className="text-[8px] text-rose-400">+{corridor.pinnHealthProfile.wimOverloadPercent}% Overload</span>
            </div>
          </div>

          {/* Pilar 3: Curah Hujan & Drainase */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-start space-x-2">
            <div className="p-1 rounded-md bg-cyan-500/15 text-cyan-400 shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-400 text-[9px] block">Curah Hujan &amp; Air</span>
              <span className="font-bold text-cyan-300 block">{corridor.pinnHealthProfile.rainIntensityMmHr} mm/jam</span>
              <span className="text-[8px] text-cyan-400">Subgrade Jenuh</span>
            </div>
          </div>

          {/* Pilar 4: Daya Dukung Tanah (CBR) */}
          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-start space-x-2">
            <div className="p-1 rounded-md bg-purple-500/15 text-purple-400 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-slate-400 text-[9px] block">Daya Dukung Tanah</span>
              <span className="font-bold text-purple-300 block">CBR {corridor.pinnHealthProfile.subgradeCbrPercent}%</span>
              <span className="text-[8px] text-purple-400">Lempung Ekspansif</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PINN Insight Breakdown Progress Bars */}
      <div className="mt-2.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/70 space-y-2">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span>PINN Degradation Factor Breakdown</span>
          <span className="text-amber-400">Tingkat Risiko</span>
        </div>

        <div className="space-y-1.5 text-[9px]">
          {/* Traffic Load */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-0.5">
              <span>Beban Lalu Lintas (WIM ODOL)</span>
              <span className="text-rose-400">{corridor.pinnFactors.trafficLoadLabel}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${corridor.pinnFactors.trafficLoadScore}%` }}
              />
            </div>
          </div>

          {/* Rainfall */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-0.5">
              <span>Curah Hujan &amp; Genangan Air</span>
              <span className="text-cyan-400">{corridor.pinnFactors.rainfallLabel}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${corridor.pinnFactors.rainfallScore}%` }}
              />
            </div>
          </div>

          {/* CBR Soil */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-0.5">
              <span>Kondisi Tanah Subgrade (CBR)</span>
              <span className="text-purple-400">{corridor.pinnFactors.subgradeCbrLabel}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${corridor.pinnFactors.subgradeCbrScore}%` }}
              />
            </div>
          </div>

          {/* Existing Degradation / Paris Law */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-0.5">
              <span>Laju Deteriorasi Fisika (Paris-Erdogan)</span>
              <span className="text-amber-400">{corridor.pinnFactors.existingDamageLabel}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${corridor.pinnFactors.existingDamageScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. 5-Year Projection Simulation Comparison (2025 -> 2030) */}
      <div className="mt-2.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/70">
        <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1.5 flex items-center justify-between">
          <span>Proyeksi 5 Tahun (2025 &rarr; 2030)</span>
          <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-800">
            {selectedScenario}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-center">
          <div className="bg-slate-900/90 p-2 rounded-lg border border-rose-900/40">
            <span className="text-[8px] text-slate-400 block font-semibold">Tanpa Intervensi</span>
            <div className="flex items-center justify-center space-x-1 mt-0.5">
              <span className="text-xs text-slate-400 line-through">{corridor.currentPci}</span>
              <span className="text-slate-500">&rarr;</span>
              <span className="text-base font-bold text-rose-400">{corridor.projection2030NoAction}</span>
            </div>
            <span className="text-[8px] text-rose-400 font-bold block mt-0.5">
              Rusak Total (-{corridor.currentPci - corridor.projection2030NoAction} Poin)
            </span>
          </div>

          <div className="bg-slate-900/90 p-2 rounded-lg border border-emerald-900/40">
            <span className="text-[8px] text-slate-400 block font-semibold">Dg Intervensi Preservasi</span>
            <div className="flex items-center justify-center space-x-1 mt-0.5">
              <span className="text-xs text-slate-400">{corridor.currentPci}</span>
              <span className="text-slate-500">&rarr;</span>
              <span className="text-base font-bold text-emerald-400">{corridor.projection2030WithAction}</span>
            </div>
            <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">
              Mantap Terjaga (+{corridor.projection2030WithAction - corridor.currentPci} Poin)
            </span>
          </div>
        </div>
      </div>

      {/* 6. Budget & Economic Impact Strip */}
      <div className="mt-2.5 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">Estimasi Kebutuhan Preservasi:</span>
          <span className="font-bold text-amber-400 text-xs">Rp {corridor.budgetNeededM} Miliar</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">Potensi Kerugian Ekonomi Logistik:</span>
          <span className="font-bold text-rose-400 text-xs">Rp {corridor.economicLossWithoutActionM} Miliar</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/80 text-[10px]">
          <span className="text-emerald-400 font-semibold">Benefit-Cost Ratio (BCR):</span>
          <span className="font-bold text-cyan-400 text-xs">{corridor.benefitCostRatio}x</span>
        </div>
      </div>

      {/* 7. Action CTA Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={onOpenBudgetSimulation}
          className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[10px] flex items-center justify-center space-x-1 border border-slate-700 transition-all cursor-pointer"
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulasi Pagu</span>
        </button>

        <button
          onClick={onOpenDetails}
          className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer"
        >
          <span>Dossier PINN</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
