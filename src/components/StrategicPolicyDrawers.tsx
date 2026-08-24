import React from 'react';
import {
  Sparkles,
  Flag,
  DollarSign,
  Filter,
  X,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Layers,
  Cpu,
  Droplets,
  Truck,
  CheckCircle2,
  Download,
  Activity,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  StrategicCorridor,
  StrategicRegion,
  STRATEGIC_CORRIDORS,
  STRATEGIC_REGIONS,
  getPciColor
} from '../data/policyMapData';

interface StrategicPolicyDrawersProps {
  activeDrawer: 'INSIGHT' | 'PRIORITAS' | 'INVESTASI' | 'FILTER' | null;
  onCloseDrawer: () => void;
  isDetailModalOpen: boolean;
  onCloseDetailModal: () => void;
  selectedCorridor: StrategicCorridor;
  selectedRegion: StrategicRegion;
  onSelectCorridor: (corridor: StrategicCorridor) => void;
  onSelectRegion: (region: StrategicRegion) => void;
  provinceFilter: string;
  onProvinceFilterChange: (val: string) => void;
  pciConditionFilter: string;
  onPciConditionFilterChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  onDownloadPdf: () => void;
  onOpenDetailedSimulation?: () => void;
}

export const StrategicPolicyDrawers: React.FC<StrategicPolicyDrawersProps> = ({
  activeDrawer,
  onCloseDrawer,
  isDetailModalOpen,
  onCloseDetailModal,
  selectedCorridor,
  selectedRegion,
  onSelectCorridor,
  onSelectRegion,
  provinceFilter,
  onProvinceFilterChange,
  pciConditionFilter,
  onPciConditionFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  onDownloadPdf,
  onOpenDetailedSimulation
}) => {
  return (
    <>
      {/* 1. INSIGHT DRAWER */}
      {activeDrawer === 'INSIGHT' && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0d1424] border-l border-slate-800 shadow-2xl z-40 p-5 flex flex-col justify-between animate-fade-in text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm text-white">AI Policy Insight PINN</h3>
                  <span className="text-[10px] text-slate-400">Rekomendasi Strategis Bappenas &amp; PUPR</span>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-1">
              {/* Insight 1: Window Intervensi */}
              <div className="p-3 bg-[#141d33] border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[10px] uppercase">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Window Intervensi Kritis (3-6 Bulan)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ruas <strong>{selectedCorridor.name}</strong> dan <strong>Kalimalang</strong> berada pada fase akselerasi fatigue cracking. Intervensi mikro-overlay saat ini senilai <strong>Rp {selectedCorridor.budgetNeededM} M</strong> mencegah kebutuhan rekonstruksi total senilai <strong>Rp {selectedCorridor.economicLossWithoutActionM} M</strong> di 2027.
                </p>
                <div className="text-[10px] text-amber-300/90 font-semibold pt-1 border-t border-slate-800">
                  Benefit-Cost Ratio: <strong>{selectedCorridor.benefitCostRatio}x</strong> penghematan.
                </div>
              </div>

              {/* Insight 2: Penegakan ODOL WIM */}
              <div className="p-3 bg-[#141d33] border border-blue-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 text-blue-400 font-bold text-[10px] uppercase">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Korelasi WIM &amp; PINN Damage Impact</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Stasiun WIM mendeteksi beban gandar rata-rata <strong>{selectedCorridor.pinnHealthProfile.wimAxleLoadTon} Ton</strong> (+{selectedCorridor.pinnHealthProfile.wimOverloadPercent}% dari batas legal). Penegakan sanksi digital menurunkan degradasi struktural hingga <strong>34%</strong>.
                </p>
              </div>

              {/* Insight 3: Drainase dan Subgrade */}
              <div className="p-3 bg-[#141d33] border border-cyan-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-[10px] uppercase">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Resiko Genangan &amp; Subgrade CBR</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Curah hujan <strong>{selectedCorridor.pinnHealthProfile.rainIntensityMmHr} mm/jam</strong> menyebabkan saturasi air pada subgrade lempung (CBR {selectedCorridor.pinnHealthProfile.subgradeCbrPercent}%). Diperlukan integrasi box culvert dan saluran samping.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                onCloseDrawer();
                if (onOpenDetailedSimulation) onOpenDetailedSimulation();
              }}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-400/20"
            >
              Simulasikan Skenario Kebijakan
            </button>
          </div>
        </div>
      )}

      {/* 2. PRIORITAS DRAWER */}
      {activeDrawer === 'PRIORITAS' && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0d1424] border-l border-slate-800 shadow-2xl z-40 p-5 flex flex-col justify-between animate-fade-in text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flag className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-black text-sm text-white">Daftar Koridor Prioritas</h3>
                  <span className="text-[10px] text-slate-400">Klasifikasi P1, P2, P3 Nasional</span>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Priority Filter Pills */}
            <div className="flex space-x-1.5 mt-3">
              {(['SEMUA', 'P1', 'P2', 'P3'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onPriorityFilterChange(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all ${
                    priorityFilter === lvl
                      ? 'bg-rose-500 text-white'
                      : 'bg-[#141d33] text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl === 'SEMUA' ? 'Semua' : `Prioritas ${lvl}`}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar pr-1">
              {STRATEGIC_CORRIDORS.filter(
                (c) => priorityFilter === 'SEMUA' || c.priorityLevel === priorityFilter
              ).map((corr) => {
                const isSelected = selectedCorridor.id === corr.id;
                const pciColor = getPciColor(corr.currentPci);
                return (
                  <div
                    key={corr.id}
                    onClick={() => {
                      onSelectCorridor(corr);
                      onCloseDrawer();
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400 shadow-lg'
                        : 'bg-[#141d33] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-white block truncate">{corr.name}</span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {corr.corridor}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                          corr.priorityLevel === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : corr.priorityLevel === 'P2'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {corr.priorityLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[8px]">PCI Sekarang</span>
                        <span className="font-black" style={{ color: pciColor }}>
                          {corr.currentPci}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px]">Proyeksi 2030</span>
                        <span className="font-black text-rose-400">{corr.projection2030NoAction}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px]">Kebutuhan Pagu</span>
                        <span className="font-black text-amber-400">Rp {corr.budgetNeededM} M</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. INVESTASI DRAWER */}
      {activeDrawer === 'INVESTASI' && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0d1424] border-l border-slate-800 shadow-2xl z-40 p-5 flex flex-col justify-between animate-fade-in text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-sm text-white">Alokasi Anggaran &amp; Investasi</h3>
                  <span className="text-[10px] text-slate-400">Perencanaan Pagu APBN / Inpres Jalan</span>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar pr-1">
              {/* Total Pagu */}
              <div className="p-3 bg-[#141d33] border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-400">Total Kebutuhan Preservasi Koridor Nasional</div>
                <div className="text-2xl font-black text-amber-400">Rp 84,2 Miliar</div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  Mencegah kerugian logistik Rp 18,4 Miliar per kuartal (BCR 2.4x)
                </div>
              </div>

              {/* Breakdown per Prioritas */}
              <div className="p-3 bg-[#141d33] border border-slate-800 rounded-xl space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Alokasi per Prioritas
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-0.5">
                      <span className="text-rose-400">Prioritas 1 (Kritis / Darurat)</span>
                      <span>Rp 45,2 M (54%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '54%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-0.5">
                      <span className="text-orange-400">Prioritas 2 (Rehabilitasi)</span>
                      <span>Rp 28,6 M (34%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: '34%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-300 mb-0.5">
                      <span className="text-amber-400">Prioritas 3 (Preservasi Rutin)</span>
                      <span>Rp 10,4 M (12%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '12%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagu vs Kebutuhan */}
              <div className="p-3 bg-[#141d33] border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pagu Reguler Disetujui:</span>
                  <span className="font-bold text-white">Rp 72,0 M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gap Pendanaan (Usulan Inpres):</span>
                  <span className="font-bold text-rose-400">Rp 12,2 M</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={onDownloadPdf}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Usulan Pagu APBN (PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. FILTER DRAWER */}
      {activeDrawer === 'FILTER' && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0d1424] border-l border-slate-800 shadow-2xl z-40 p-5 flex flex-col justify-between animate-fade-in text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-black text-sm text-white">Filter Multi-Fisika Spasial</h3>
                  <span className="text-[10px] text-slate-400">Saring Wilayah &amp; Ambang PCI</span>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Wilayah Provinsi
                </label>
                <select
                  value={provinceFilter}
                  onChange={(e) => onProvinceFilterChange(e.target.value)}
                  className="w-full bg-[#141d33] border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs focus:border-amber-400 outline-none"
                >
                  <option value="SEMUA">Semua Wilayah (DKI, Jabar, Banten)</option>
                  <option value="DKI Jakarta">DKI Jakarta</option>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Banten">Banten</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Ambang Batas Kondisi PCI
                </label>
                <select
                  value={pciConditionFilter}
                  onChange={(e) => onPciConditionFilterChange(e.target.value)}
                  className="w-full bg-[#141d33] border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs focus:border-amber-400 outline-none"
                >
                  <option value="SEMUA">Semua Rentang PCI</option>
                  <option value="KRITIS">🔴 Sangat Buruk (PCI &lt; 30)</option>
                  <option value="BURUK">🟠 Buruk (PCI 30 - 49)</option>
                  <option value="SEDANG">🟡 Sedang (PCI 50 - 69)</option>
                  <option value="BAIK">🟢 Baik (PCI &ge; 70)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Tingkat Prioritas Penanganan
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => onPriorityFilterChange(e.target.value)}
                  className="w-full bg-[#141d33] border border-slate-800 text-slate-200 p-2.5 rounded-xl text-xs focus:border-amber-400 outline-none"
                >
                  <option value="SEMUA">Semua Prioritas</option>
                  <option value="P1">🔴 Prioritas 1 (Critical / Darurat)</option>
                  <option value="P2">🟠 Prioritas 2 (High / Rehabilitasi)</option>
                  <option value="P3">🟡 Prioritas 3 (Moderate / Preservasi)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={onCloseDrawer}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              Terapkan Filter Spasial
            </button>
          </div>
        </div>
      )}

      {/* 5. DEEP REGIONAL PINN MULTI-PHYSICS ANALYSIS MODAL */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-2xl text-xs space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-amber-400 font-bold tracking-wider">
                  Physics-Informed Neural Network (PINN) Multi-Physics Dossier
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">
                  Analisis Multi-Fisika: {selectedCorridor.name}
                </h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {selectedCorridor.corridor} &bull; Prioritas {selectedCorridor.priorityLevel} ({selectedCorridor.priorityLabel})
                </p>
              </div>
              <button
                onClick={onCloseDetailModal}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Grid Multi-Physics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#141d33] p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1.5 text-rose-400 font-bold mb-1">
                  <Truck className="w-4 h-4" />
                  <span>Beban Gandar WIM</span>
                </div>
                <div className="text-xl font-black text-white">
                  {selectedCorridor.pinnHealthProfile.wimAxleLoadTon} Ton
                </div>
                <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                  +{selectedCorridor.pinnHealthProfile.wimOverloadPercent}% dari batas legal 10 Ton
                </div>
              </div>

              <div className="bg-[#141d33] p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold mb-1">
                  <Droplets className="w-4 h-4" />
                  <span>Curah Hujan &amp; Drainase</span>
                </div>
                <div className="text-xl font-black text-white">
                  {selectedCorridor.pinnHealthProfile.rainIntensityMmHr} mm/jam
                </div>
                <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                  Subgrade CBR {selectedCorridor.pinnHealthProfile.subgradeCbrPercent}% (Jenuh Air)
                </div>
              </div>

              <div className="bg-[#141d33] p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold mb-1">
                  <Cpu className="w-4 h-4" />
                  <span>Preservasi Dini</span>
                </div>
                <div className="text-xl font-black text-emerald-400">
                  Rp {selectedCorridor.budgetNeededM} M
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Cegah rekonstruksi Rp {selectedCorridor.economicLossWithoutActionM} M
                </div>
              </div>
            </div>

            {/* Paris Law PDE & Loss Formulation */}
            <div className="p-4 bg-[#141d33] border border-slate-800 rounded-2xl space-y-2 font-mono text-[11px] text-slate-300">
              <div className="text-amber-400 font-bold flex items-center justify-between">
                <span>Persamaan Diferensial Fisika &amp; Hukum Paris-Erdogan</span>
                <span className="text-[9px] bg-amber-400/20 px-2 py-0.5 rounded text-amber-300">
                  Residual Loss: 0.00034
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-sans leading-relaxed">
                Formula perambatan retak lelah <code>da/dN = C(&Delta;K)^m</code> memprediksi pertumbuhan retak buaya menembus lapisan base aspal dalam <strong>{selectedCorridor.remainingLifeYears} tahun</strong> akibat kombinasi beban gandar berlebih dan modulus elastisitas subgrade yang menurun.
              </p>
              <div className="text-cyan-300 text-[10px]">
                Rekomendasi Penanganan: <strong>{selectedCorridor.recommendedTreatment}</strong>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={onCloseDetailModal}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  onCloseDetailModal();
                  onDownloadPdf();
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/20 transition-all flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Dossier PDF Eksekutif</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
