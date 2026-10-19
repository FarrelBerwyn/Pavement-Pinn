import React, { useState, useEffect } from 'react';
import {
  RoadSegment,
  SimulationParams,
  SimulationResult,
  UserRole,
  HardwareDevice,
  PrecisionMode
} from '../../types';
import { runPinnSimulation } from '../../engines/pinn/core/pinnEngine';
import { generateOfficialReportPdf } from '../../services/reporting/pdfGenerator';
import confetti from 'canvas-confetti';
import { detectLocalDeviceProfile } from '../../runtime/intel-hardware/deviceDetector';
import { isStaticHost } from '../../services/api/client';
import { requestAiNarrative } from '../../services/api/endpoints';
import {
  Sliders,
  Play,
  Cpu,
  Zap,
  Layers,
  CloudRain,
  ShieldAlert,
  FileDown,
  Sparkles,
  RefreshCw,
  Truck,
  Gauge
} from 'lucide-react';

interface SimulationPanelProps {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment;
  onSelectSegment: (segment: RoadSegment) => void;
  activeRole: UserRole;
  currentResult: SimulationResult | null;
  onSimulationComplete: (result: SimulationResult) => void;
  onOpenOpenvinoModal: () => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  roadSegments,
  selectedSegment,
  onSelectSegment,
  activeRole,
  currentResult,
  onSimulationComplete,
  onOpenOpenvinoModal
}) => {
  // Input Form State
  const [axleLoadTon, setAxleLoadTon] = useState<number>(selectedSegment.defaultAxleLoadTon || 18.5);
  const [rainIntensityMmHr, setRainIntensityMmHr] = useState<number>(45);
  const [floodDurationHours, setFloodDurationHours] = useState<number>(6);
  const [surfaceTemperatureC] = useState<number>(42);
  const [subgradeCbrPercent, setSubgradeCbrPercent] = useState<number>(selectedSegment.defaultCbrPercent || 4.5);
  const [asphaltThicknessCm, setAsphaltThicknessCm] = useState<number>(selectedSegment.defaultAsphaltThicknessCm || 12);
  const [asphaltModulusMpa] = useState<number>(2400);
  const [targetDevice, setTargetDevice] = useState<HardwareDevice>('NPU');
  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>('INT8_NNCF');

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [aiNarrativeText, setAiNarrativeText] = useState<string>('');
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState<boolean>(false);

  // Update inputs when segment changes
  useEffect(() => {
    setAxleLoadTon(selectedSegment.defaultAxleLoadTon);
    setSubgradeCbrPercent(selectedSegment.defaultCbrPercent);
    setAsphaltThicknessCm(selectedSegment.defaultAsphaltThicknessCm);
  }, [selectedSegment]);

  // Fourth Power Law ODOL multiplier
  const odolMultiplier = Math.pow(axleLoadTon / 10.0, 4.0).toFixed(1);

  // Run Simulation Trigger
  const handleExecuteSimulation = async () => {
    setIsSimulating(true);

    const params: SimulationParams = {
      segmentId: selectedSegment.id,
      axleLoadTon,
      rainIntensityMmHr,
      floodDurationHours,
      surfaceTemperatureC,
      subgradeCbrPercent,
      asphaltThicknessCm,
      asphaltModulusMpa,
      targetDevice,
      precisionMode
    };

    setTimeout(() => {
      const result = runPinnSimulation(params, selectedSegment);
      onSimulationComplete(result);
      setIsSimulating(false);

      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 }
      });

      fetchAiNarrative(result, activeRole);
    }, 450);
  };

  const fetchAiNarrative = async (result: SimulationResult, role: UserRole) => {
    setIsGeneratingNarrative(true);

    // GitHub Pages is static - no backend, use offline narrative directly
    if (isStaticHost()) {
      const offlineNarrative =
        role === 'FIELD_ENGINEER'
          ? result.aiNarrative.fieldEngineerNarrative
          : role === 'OPERATIONS_MANAGER'
          ? result.aiNarrative.operationsNarrative
          : result.aiNarrative.policyMakerNarrative;
      setAiNarrativeText(offlineNarrative);
      setIsGeneratingNarrative(false);
      return;
    }

    try {
      const data = await requestAiNarrative(role, result);
      if (data.success) {
        setAiNarrativeText(data.narrative);
      }
    } catch {
      const offlineNarrative =
        role === 'FIELD_ENGINEER'
          ? result.aiNarrative.fieldEngineerNarrative
          : role === 'OPERATIONS_MANAGER'
          ? result.aiNarrative.operationsNarrative
          : result.aiNarrative.policyMakerNarrative;
      setAiNarrativeText(offlineNarrative);
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  useEffect(() => {
    if (currentResult) {
      fetchAiNarrative(currentResult, activeRole);
    }
  }, [activeRole]);

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-5 rounded-2xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 rounded-md text-xs font-medium text-slate-300 border border-line" title="Rumus deterministik lama; mesin MLET + PI-surrogate ada di panel Penilaian struktural (halaman ruas).">
              Mesin aturan (RULE_BASED)
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white mt-1">
            Simulasi Mekanika Perkerasan & Predictor Degradasi Jalan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Integrasi Hukum Fisika Teori Elastisitas Berlapis Burmister + Data Observasi FWD
          </p>
        </div>

        {/* Segment Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Pilih Ruas:</span>
          <select
            value={selectedSegment.id}
            onChange={(e) => {
              const seg = roadSegments.find((r) => r.id === e.target.value);
              if (seg) onSelectSegment(seg);
            }}
            className="bg-slate-900/60 border border-white/10 text-slate-100 text-xs font-semibold rounded-2xl px-4 py-2 focus:outline-none focus:border-amber-400 min-w-0 w-full sm:w-auto max-w-xs"
          >
            {roadSegments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.name} ({seg.kmPost})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Input Sliders (5 cols) */}
        <div className="lg:col-span-5 space-y-5 bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl">
          {/* Role Focus Lens Badge */}
          <div className="bg-slate-900/80 border border-white/10 p-3 rounded-2xl flex items-center space-x-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-slate-400">Lensa Input Parameter:</span>
            <span className={`font-bold px-2 py-1 rounded-full border ${
              activeRole === 'FIELD_ENGINEER'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : activeRole === 'OPERATIONS_MANAGER'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}>
              {(activeRole || 'FIELD_ENGINEER').replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Sliders className="w-4 h-4 text-cyan-400 mr-2" />
              Parameter Input Fisika & Lingkungan
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {selectedSegment.province}
            </span>
          </div>

          {/* Slider 1: Axle Load (ODOL) */}
          <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-200 flex items-center">
                <Truck className="w-4 h-4 text-rose-400 mr-2" />
                Beban Sumbu Kendaraan (Axle Load)
              </label>
              <span className="font-mono font-bold text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
                {axleLoadTon} Ton
              </span>
            </div>
            <input
              type="range"
              min="8.0"
              max="25.0"
              step="0.5"
              value={axleLoadTon}
              onChange={(e) => setAxleLoadTon(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>8 Ton (Light)</span>
              <span className="text-amber-400 font-bold">10 Ton (Limit)</span>
              <span className="text-rose-400 font-bold">25 Ton (Severe ODOL)</span>
            </div>
            <p className="text-xs text-slate-400 pt-1 flex items-center">
              <ShieldAlert className="w-3 h-3 text-amber-400 mr-1 shrink-0" />
              Hukum Pangkat 4: Kerusakan ={' '}
              <strong className="text-rose-400 font-mono ml-1">{odolMultiplier}x Lipat</strong>
            </p>
          </div>

          {/* Slider 2: Rain Intensity & Flood Duration */}
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-200 flex items-center">
                <CloudRain className="w-4 h-4 text-cyan-400 mr-2" />
                Curah Hujan & Genangan Air
              </label>
              <span className="font-mono font-bold text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30">
                {rainIntensityMmHr} mm/jam | {floodDurationHours} jam
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Intensitas Hujan (mm/jam):</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={rainIntensityMmHr}
                onChange={(e) => setRainIntensityMmHr(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Durasi Genangan (Jam):</span>
              <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={floodDurationHours}
                onChange={(e) => setFloodDurationHours(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Slider 3: Subgrade CBR % & Asphalt Thickness */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-bold text-slate-300">CBR Tanah</label>
                <span className="font-mono font-bold text-amber-400">{subgradeCbrPercent}%</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="10.0"
                step="0.5"
                value={subgradeCbrPercent}
                onChange={(e) => setSubgradeCbrPercent(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-xs text-slate-400">Es: {subgradeCbrPercent * 10} MPa</p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs">
                <label className="font-bold text-slate-300">Tebal Aspal</label>
                <span className="font-mono font-bold text-emerald-400">{asphaltThicknessCm} cm</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="25.0"
                step="1.0"
                value={asphaltThicknessCm}
                onChange={(e) => setAsphaltThicknessCm(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-xs text-slate-400">AC-WC / AC-BC</p>
            </div>
          </div>

          {/* Intel Hardware Execution Selector */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center">
                <Cpu className="w-4 h-4 mr-1 text-cyan-400" />
                Target Intel AI Edge PC Device
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const profile = detectLocalDeviceProfile();
                    setTargetDevice(profile.recommendedTarget);
                    setPrecisionMode(profile.recommendedPrecision);
                  }}
                  className="text-xs bg-cyan-500/20 text-cyan-300 font-mono font-bold px-2 py-1 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center gap-1 transition-all"
                  title="Deteksi otomatis kemampuan hardware perangkat ini"
                >
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  Auto-Detect Hardware
                </button>
                <button
                  type="button"
                  onClick={onOpenOpenvinoModal}
                  className="text-xs text-slate-400 underline hover:text-white"
                >
                  Detail Arsitektur
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center">
              <button
                type="button"
                onClick={() => setTargetDevice('AUTO')}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetDevice === 'AUTO'
                    ? 'bg-indigo-500 text-white shadow-lg  border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                AUTO
              </button>

              <button
                type="button"
                onClick={() => setTargetDevice('NPU')}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetDevice === 'NPU'
                    ? 'bg-indigo-500 text-white shadow-lg  border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                NPU
              </button>

              <button
                type="button"
                onClick={() => setTargetDevice('iGPU')}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetDevice === 'iGPU'
                    ? 'bg-indigo-500 text-white shadow-lg  border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                iGPU
              </button>

              <button
                type="button"
                onClick={() => setTargetDevice('CPU')}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetDevice === 'CPU'
                    ? 'bg-indigo-500 text-white shadow-lg  border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                CPU
              </button>

              <button
                type="button"
                onClick={() => setTargetDevice('MULTI')}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetDevice === 'MULTI'
                    ? 'bg-indigo-500 text-white shadow-lg  border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                MULTI
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Presisi Model:</span>
              <div className="flex space-x-1 font-mono">
                {(['INT8_NNCF', 'FP16', 'FP32'] as PrecisionMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPrecisionMode(mode)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      precisionMode === mode
                        ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleExecuteSimulation}
            disabled={isSimulating}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm py-4 px-4 rounded-2xl shadow-lg border border-white/20 flex items-center justify-center space-x-2 transition-all active:scale-98 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                <span>Menjalankan OpenVINO Inference...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-200 fill-current" />
                <span>Jalankan Simulasi PINN (OpenVINO)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Simulation Output & Visual Cross-section (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 2D Multilayer Cross-Section Diagram */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Layers className="w-4 h-4 text-indigo-400 mr-2" />
                Visualisasi Penampang Struktur Perkerasan Berlapis (2D Cross-Section)
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Total Tebal: {asphaltThicknessCm + 25} cm
              </span>
            </div>

            {/* Visual Layers Stack */}
            <div className="space-y-2 rounded-2xl overflow-hidden border border-white/10 p-3 bg-slate-950/80">
              {/* Layer 1: Asphalt Wearing Course */}
              <div
                style={{ height: `${Math.max(32, asphaltThicknessCm * 3)}px` }}
                className=" bg-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-100 font-mono border-b border-amber-500/40 relative overflow-hidden"
              >
                <div className="flex items-center space-x-2 z-10">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold">Lapisan Aspal (AC-WC / AC-BC)</span>
                </div>
                <span className="font-bold text-amber-300 z-10">
                  {asphaltThicknessCm} cm | E₁ = {asphaltModulusMpa} MPa
                </span>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-rose-500 shadow-sm " />
              </div>

              {/* Layer 2: Granular Base Course */}
              <div className="h-12 bg-stone-800 rounded-xl p-3 flex items-center justify-between text-xs text-stone-300 font-mono border-b border-stone-600/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-stone-400" />
                  <span>Lapisan Pondasi Atas (Katalog Kelas A)</span>
                </div>
                <span className="font-bold text-stone-400">15 cm | E₂ = 300 MPa</span>
              </div>

              {/* Layer 3: Subgrade Soil */}
              <div className="h-16 bg-amber-950/80 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200 font-mono relative">
                <div className="flex items-center space-x-2 z-10">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span>Tanah Dasar (Subgrade Soil)</span>
                </div>
                <span className="font-bold text-amber-300 z-10">
                  CBR = {subgradeCbrPercent}% | Es = {subgradeCbrPercent * 10} MPa
                </span>
                <div
                  style={{ opacity: rainIntensityMmHr / 120 }}
                  className="absolute inset-0 bg-blue-900/40 backdrop-blur-[1px] pointer-events-none rounded-xl"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-between font-mono pt-1">
              <span>Garis Merah: Titik Kritis Regangan Tarik dasar aspal (εt)</span>
              <span className="text-cyan-400">Model Elastis Berlapis Burmister</span>
            </p>
          </div>

          {/* Output Results Cards - Customized Per Role */}
          {currentResult ? (
            <div className="space-y-4">
              {/* Role-Specific Metric Header Banner */}
              <div className="bg-slate-900/90 border border-white/10 p-3 rounded-2xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-slate-300 font-bold">Ringkasan Output Spesifik Role:</span>
                  <span className="text-cyan-300 font-bold">{(activeRole || 'FIELD_ENGINEER').replace('_', ' ')}</span>
                </div>
                <span className="text-xs text-slate-400">Model PINN + Rule Engine</span>
              </div>

              {/* Primary Key Metrics Cards Customized by Active Role */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* FIELD ENGINEER METRICS */}
                {activeRole === 'FIELD_ENGINEER' && (
                  <>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Prediksi PCI
                      </p>
                      <p className="text-xl font-semibold text-white mt-1 font-mono">
                        {currentResult.predictedPci}{' '}
                        <span className="text-xs font-normal text-rose-400">
                          (-{currentResult.pciDropPoints})
                        </span>
                      </p>
                      <span className="text-xs font-bold text-amber-400">
                        {currentResult.predictedPci > 70
                          ? 'Mantap'
                          : currentResult.predictedPci > 50
                          ? 'Sedang'
                          : 'Rusak Berat'}
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Regangan Tarik (εt)
                      </p>
                      <p
                        className={`text-xl font-semibold mt-1 font-mono ${
                          currentResult.tensors.tensileStrainEt > 200
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {currentResult.tensors.tensileStrainEt} <span className="text-xs">µε</span>
                      </p>
                      <span className="text-xs text-slate-400">
                        {currentResult.tensors.tensileStrainEt > 200 ? 'Melebihi Ijin' : 'Aman'}
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Pothole Horizon
                      </p>
                      <p className="text-xl font-semibold text-cyan-400 mt-1 font-mono">
                        {currentResult.roleOutputs.fieldEngineer.potholeHorizonDays}{' '}
                        <span className="text-xs font-normal text-slate-300">Hari</span>
                      </p>
                      <span className="text-xs text-slate-400">Estimasi Lubang</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Rekomendasi Overlay
                      </p>
                      <p className="text-xl font-semibold text-emerald-400 mt-1 font-mono">
                        {currentResult.roleOutputs.fieldEngineer.recommendedOverlayThicknessCm}{' '}
                        <span className="text-xs font-normal text-slate-300">cm</span>
                      </p>
                      <span className="text-xs text-slate-400 truncate block">AC-WC Overlay</span>
                    </div>
                  </>
                )}

                {/* OPERATIONS MANAGER METRICS */}
                {activeRole === 'OPERATIONS_MANAGER' && (
                  <>
                    <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-rose-300 font-bold">
                        Status Sinyal WIM
                      </p>
                      <p className="text-lg font-semibold text-rose-400 mt-1 font-mono flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        {currentResult.roleOutputs.operationsManager.alertStatus}
                      </p>
                      <span className="text-xs text-rose-200 font-bold">Truk ODOL &gt; 20 Ton</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Beban Sumbu Truk
                      </p>
                      <p className="text-xl font-semibold text-rose-400 mt-1 font-mono">
                        {axleLoadTon}{' '}
                        <span className="text-xs font-normal text-slate-300">Ton</span>
                      </p>
                      <span className="text-xs text-rose-300 font-bold">
                        +{ Math.max(0, axleLoadTon - 10).toFixed(1) } Ton Kelebihan
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Kerusakan (Pangkat 4)
                      </p>
                      <p className="text-xl font-semibold text-amber-400 mt-1 font-mono">
                        {odolMultiplier}x
                      </p>
                      <span className="text-xs text-slate-400">Accelerated Wear</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Aksi Penindakan
                      </p>
                      <p className="text-xs font-semibold text-cyan-300 mt-1 truncate">
                        {currentResult.roleOutputs.operationsManager.wimActionRequired}
                      </p>
                      <span className="text-xs text-emerald-400 font-bold">Tilang ANPR Active</span>
                    </div>
                  </>
                )}

                {/* POLICY MAKER METRICS */}
                {activeRole === 'POLICY_MAKER' && (
                  <>
                    <div className="bg-indigo-950/30 border border-indigo-500/40 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-indigo-300 font-bold">
                        Proyeksi PCI 5-Thn
                      </p>
                      <p className="text-xl font-semibold text-indigo-300 mt-1 font-mono">
                        {currentResult.roleOutputs.policyMaker.pci5YearProjection?.[5]?.pciPreventiveAction ?? currentResult.predictedPci} / 100
                      </p>
                      <span className="text-xs text-slate-300">Analisis Long-Term</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Dampak Biaya 5-Thn
                      </p>
                      <p className="text-lg font-semibold text-emerald-400 mt-1 font-mono">
                        Belum dihitung
                      </p>
                      <span className="text-xs text-emerald-300 font-bold">Preventive Cost</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Rasio Cost-Benefit
                      </p>
                      <p className="text-xl font-semibold text-cyan-400 mt-1 font-mono">
                        3.8x <span className="text-xs font-normal text-slate-300">ROI</span>
                      </p>
                      <span className="text-xs text-slate-400">Zero ODOL Impact</span>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
                      <p className="text-xs text-slate-400 font-bold">
                        Target Zero ODOL
                      </p>
                      <p className="text-xl font-semibold text-amber-300 mt-1 font-mono">
                        2027
                      </p>
                      <span className="text-xs text-emerald-400 font-bold">Priority High</span>
                    </div>
                  </>
                )}
              </div>

              {/* AI Multi-Stakeholder Narrative Box */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">
                      Analisis Kecerdasan Buatan (Lensa: {(activeRole || 'FIELD_ENGINEER').replace('_', ' ')})
                    </span>
                  </div>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                    Gemini 2.5 + PINN Rule Engine
                  </span>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed font-sans min-h-[60px] whitespace-pre-line bg-slate-950/80 p-4 rounded-2xl border border-white/10">
                  {isGeneratingNarrative ? (
                    <div className="flex items-center space-x-2 text-indigo-400 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyusun narasi rekomendasi spesifik peran...</span>
                    </div>
                  ) : (
                    aiNarrativeText || currentResult.aiNarrative.fieldEngineerNarrative
                  )}
                </div>

                {/* Download PDF CTA */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => generateOfficialReportPdf(currentResult, activeRole)}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white border border-white/20 text-xs font-semibold px-4 py-2 rounded-2xl shadow-lg flex items-center space-x-2 transition-all"
                  >
                    <FileDown className="w-4 h-4 text-cyan-200" />
                    <span>Cetak Laporan PDF Resmi</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center text-slate-400 space-y-2 shadow-2xl">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-slate-200">
                Klik tombol "Jalankan Simulasi PINN" untuk memulai komputasi
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Sistem akan memproses tensor tegangan-regangan dan menyusun narasi khusus sesuai peran pengguna.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
