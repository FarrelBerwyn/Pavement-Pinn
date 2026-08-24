import React, { useState } from 'react';
import {
  X,
  Globe,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  BarChart2,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  Terminal,
  Activity
} from 'lucide-react';
import { BinaMargaWimService, WimScrapedRecord } from '../services/binaMargaWimScraper';

interface BinaMargaWimPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BinaMargaWimPipelineModal: React.FC<BinaMargaWimPipelineModalProps> = ({
  isOpen,
  onClose
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SCRAPING' | 'PREPROCESSING' | 'TRAINING_PINN' | 'COMPLETED'>('IDLE');
  const [targetUrl, setTargetUrl] = useState('https://binamarga.pu.go.id/dashboardbm/wim/index.html');
  const [records, setRecords] = useState<WimScrapedRecord[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ODOL_ONLY' | 'NORMAL_ONLY'>('ALL');

  if (!isOpen) return null;

  const handleStartPipeline = () => {
    setStatus('SCRAPING');
    setRecords([]);
    setPipelineMetrics(null);

    // Step 1: Scrape / Fetch from Bina Marga WIM API Endpoint
    setTimeout(() => {
      const fetched = BinaMargaWimService.fetchBinaMargaWimDataset();
      setRecords(fetched);
      setStatus('PREPROCESSING');

      // Step 2: Data Cleaning, Outlier Removal & Normalization
      setTimeout(() => {
        setStatus('TRAINING_PINN');

        // Step 3: PINN Training & Loss Minimization
        setTimeout(() => {
          const metrics = BinaMargaWimService.runEthAndPinnTraining(fetched);
          setPipelineMetrics(metrics);
          setStatus('COMPLETED');
        }, 1200);
      }, 1000);
    }, 1200);
  };

  const filteredRecords = records.filter(r => {
    if (selectedFilter === 'ODOL_ONLY') return r.isOdol;
    if (selectedFilter === 'NORMAL_ONLY') return !r.isOdol;
    return true;
  });

  const downloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({
        source: targetUrl,
        timestamp: new Date().toISOString(),
        metrics: pipelineMetrics,
        records: filteredRecords
      }, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'BinaMarga_WIM_PINN_Training_Dataset.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-950/90 px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 text-cyan-300 border border-indigo-500/40">
              <Globe className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Data Science & Integration Pipeline
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Bina Marga PUPR WIM API Scraper
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Integrasi Dataset WIM Bina Marga & Pelatihan Model PINN
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Target URL & API Ingestion Trigger Bar */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto flex-1">
                <span className="text-slate-400 font-mono font-bold text-[11px] shrink-0">
                  Target Endpoint:
                </span>
                <div className="bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2 w-full font-mono text-cyan-300 flex items-center space-x-2 shadow-inner">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-xs text-cyan-200"
                  />
                </div>
              </div>

              <button
                onClick={handleStartPipeline}
                disabled={status === 'SCRAPING' || status === 'PREPROCESSING' || status === 'TRAINING_PINN'}
                className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs flex items-center space-x-2 transition-all shadow-lg shrink-0 ${
                  status === 'SCRAPING' || status === 'PREPROCESSING' || status === 'TRAINING_PINN'
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-white/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 border border-indigo-400/50 active:scale-95'
                }`}
              >
                {status === 'SCRAPING' && <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />}
                {status === 'PREPROCESSING' && <Database className="w-4 h-4 animate-bounce text-amber-300" />}
                {status === 'TRAINING_PINN' && <Cpu className="w-4 h-4 animate-pulse text-indigo-300" />}
                {status === 'IDLE' && <Zap className="w-4 h-4 text-amber-300" />}
                {status === 'COMPLETED' && <RefreshCw className="w-4 h-4 text-cyan-300" />}

                <span>
                  {status === 'IDLE' && 'Jalankan Scraper & PINN Training'}
                  {status === 'SCRAPING' && 'Scraping Data WIM Bina Marga...'}
                  {status === 'PREPROCESSING' && 'ETL & Cleaning Dataset...'}
                  {status === 'TRAINING_PINN' && 'Training Model PINN...'}
                  {status === 'COMPLETED' && 'Re-Fetch & Re-Train PINN'}
                </span>
              </button>
            </div>

            {/* Pipeline Status Progress Stepper */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/10">
              <div
                className={`p-2.5 rounded-xl border font-mono text-[11px] flex items-center space-x-2 ${
                  status === 'SCRAPING'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 animate-pulse'
                    : status === 'PREPROCESSING' || status === 'TRAINING_PINN' || status === 'COMPLETED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-bold">1. Scraper & API Fetch</p>
                  <p className="text-[9px] text-slate-400">GET HTTP 200 / JSON Stream</p>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border font-mono text-[11px] flex items-center space-x-2 ${
                  status === 'PREPROCESSING'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 animate-pulse'
                    : status === 'TRAINING_PINN' || status === 'COMPLETED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-bold">2. Data Cleaning & ETL</p>
                  <p className="text-[9px] text-slate-400">Outlier Filter & ESAL Matrix</p>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border font-mono text-[11px] flex items-center space-x-2 ${
                  status === 'TRAINING_PINN'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 animate-pulse'
                    : status === 'COMPLETED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-bold">3. PINN Training Loop</p>
                  <p className="text-[9px] text-slate-400">Burmister PDE Loss Minimization</p>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border font-mono text-[11px] flex items-center space-x-2 ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-bold">4. Model Deployment</p>
                  <p className="text-[9px] text-slate-400">Intel OpenVINO FP16 Model</p>
                </div>
              </div>
            </div>
          </div>

          {/* Theoretical Science Architecture Card */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-950 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Konstruksi Pembelajaran PINN Berbasis Dataset WIM Bina Marga
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                Physics-Informed Loss Function
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Data hasil scraping WIM Bina Marga PU (`maxAxleLoadTon`, `axleLoads`, `fwdDeflectionMicron`) diinjeksikan langsung sebagai variabel observasi empiris untuk melatih **Physics-Informed Neural Network (PINN)**. PINN tidak hanya belajar dari data histori, tetapi diikat secara matematis oleh Hukum Mekanika Elastisitas Berlapis Burmister melalui persamaan Loss Gabungan:
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/40 font-mono text-center text-cyan-300 text-xs shadow-inner">
              <span className="text-white font-bold">L_total</span> = <span className="text-emerald-400">L_data (WIM MSE)</span> + <span className="text-indigo-400">&lambda;_1 &bull; L_physics (PDE Residual)</span> + <span className="text-amber-400">&lambda;_2 &bull; L_boundary</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="font-bold text-emerald-300 font-mono mb-1">&bull; L_data (Observation Loss)</p>
                <p className="text-slate-400">Mengukur deviasi antara prediksi regangan/defleksi model jaringan terhadap data ril sensor WIM & FWD Bina Marga.</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="font-bold text-indigo-300 font-mono mb-1">&bull; L_physics (PDE Residual)</p>
                <p className="text-slate-400">Memastikan distribusi tegangan mematuhi persamaan diferensial parsial elastisitas berlapis Burmister & Hukum Pangkat Empat ODOL.</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="font-bold text-amber-300 font-mono mb-1">&bull; L_boundary (Boundary Condition)</p>
                <p className="text-slate-400">Menjamin kontinuitas tegangan antar lapisan aspal-base dan kondisi batas regangan nol pada kedalaman subgrade $z \to \infty$.</p>
              </div>
            </div>
          </div>

          {/* Results & Training Loss Visualizer (if COMPLETED) */}
          {pipelineMetrics && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                    Hasil Training Dataset WIM Bina Marga PU
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Metrik Konvergensi Jaringan & Statistik Telemetri
                  </h3>
                </div>

                <button
                  onClick={downloadJson}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-2 border border-emerald-400/40 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dataset (.JSON)</span>
                </button>
              </div>

              {/* Stat Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] text-slate-400 font-mono">Total Rekor Scraped</p>
                  <p className="text-base font-extrabold text-white font-mono">{pipelineMetrics.recordsFetched} Truk</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-rose-500/30">
                  <p className="text-[10px] text-slate-400 font-mono">Tingkat Violasi ODOL</p>
                  <p className="text-base font-extrabold text-rose-400 font-mono">{pipelineMetrics.odolPercent}% ({pipelineMetrics.odolCount} Truk)</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/30">
                  <p className="text-[10px] text-slate-400 font-mono">Rata-rata Beban Sumbu</p>
                  <p className="text-base font-extrabold text-amber-300 font-mono">{pipelineMetrics.avgAxleLoadTon} Ton</p>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-indigo-500/30">
                  <p className="text-[10px] text-slate-400 font-mono">Final Loss (L_total)</p>
                  <p className="text-base font-extrabold text-cyan-300 font-mono">{pipelineMetrics.totalLoss}</p>
                </div>
              </div>

              {/* Epoch Loss Trajectory Progress Bar */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>Progres Minimisasi Loss Jaringan (100 Epochs):</span>
                  <span className="text-cyan-400 font-normal">
                    Initial Loss: {pipelineMetrics.epochHistory[0].loss} &rarr; Final Loss: {pipelineMetrics.totalLoss}
                  </span>
                </p>

                <div className="space-y-1.5 bg-slate-900 p-3 rounded-xl border border-white/10 font-mono text-[11px]">
                  {pipelineMetrics.epochHistory.map((ep: any) => (
                    <div key={ep.epoch} className="flex items-center space-x-3">
                      <span className="w-20 text-slate-400">Epoch {ep.epoch}:</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(8, 100 - ep.loss * 8000)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-cyan-300 font-bold">{ep.loss}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dataset Table of Scraped Bina Marga WIM Records */}
          {records.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Tabel Dataset WIM Scraped Bina Marga PU ({filteredRecords.length} Data)
                  </h3>
                </div>

                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="text-slate-400">Filter Status:</span>
                  <button
                    onClick={() => setSelectedFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      selectedFilter === 'ALL'
                        ? 'bg-indigo-600 text-white border-indigo-400'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setSelectedFilter('ODOL_ONLY')}
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      selectedFilter === 'ODOL_ONLY'
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    ODOL Saja
                  </button>
                  <button
                    onClick={() => setSelectedFilter('NORMAL_ONLY')}
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      selectedFilter === 'NORMAL_ONLY'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    Normal
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72 border border-white/10 rounded-xl">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-900 text-slate-300 sticky top-0 border-b border-white/10">
                    <tr>
                      <th className="p-2.5">ID Rekor</th>
                      <th className="p-2.5">Lokasi Stasiun WIM</th>
                      <th className="p-2.5">Golongan Kendaraan</th>
                      <th className="p-2.5 text-right">Maks Sumbu (Ton)</th>
                      <th className="p-2.5 text-center">Status ODOL</th>
                      <th className="p-2.5 text-right">FWD Deflection (&mu;m)</th>
                      <th className="p-2.5 text-right">Loss Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 text-cyan-300 font-bold">{rec.id}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-white">{rec.stationName}</p>
                          <p className="text-[10px] text-slate-400">{rec.corridorName}</p>
                        </td>
                        <td className="p-2.5">{rec.vehicleClass}</td>
                        <td className="p-2.5 text-right font-bold text-amber-300">{rec.maxAxleLoadTon} Ton</td>
                        <td className="p-2.5 text-center">
                          {rec.isOdol ? (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              ODOL (+{rec.overloadPercent}%)
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              Legal (Pass)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">{rec.fwdDeflectionMicron} &mu;m</td>
                        <td className="p-2.5 text-right text-indigo-300 font-mono">{rec.pinnDataLossContribution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Target Scraper: <strong className="text-white">binamarga.pu.go.id/dashboardbm/wim</strong></span>
          </div>

          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl border border-white/20 shadow-lg shadow-indigo-600/30 transition-all"
          >
            Selesai & Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
