import React, { useState, useEffect } from 'react';
import { IntelTelemetry, HardwareDevice, PrecisionMode, DeviceHardwareProfile } from '../types';
import { detectLocalDeviceProfile, runLocalOpenVINOBenchmark } from '../utils/deviceDetector';
import { Cpu, X, Download, Play, Gauge, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';

interface OpenVINOModelDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry?: IntelTelemetry;
}

export const OpenVINOModelDiagnosticsModal: React.FC<OpenVINOModelDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  telemetry
}) => {
  const [deviceProfile, setDeviceProfile] = useState<DeviceHardwareProfile | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice>('AUTO');
  const [selectedPrecision, setSelectedPrecision] = useState<PrecisionMode>('INT8_NNCF');
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    avgLatencyMs: number;
    p95LatencyMs: number;
    throughputFps: number;
    executionProvider: string;
    memoryFootprintMb: number;
    quantizationAccuracyVsFp32: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const profile = detectLocalDeviceProfile();
      setDeviceProfile(profile);
      if (telemetry?.deviceUsed) {
        setSelectedDevice(telemetry.deviceUsed);
      } else {
        setSelectedDevice(profile.recommendedTarget);
      }
      if (telemetry?.precisionUsed) {
        setSelectedPrecision(telemetry.precisionUsed);
      } else {
        setSelectedPrecision(profile.recommendedPrecision);
      }
    }
  }, [isOpen, telemetry]);

  if (!isOpen) return null;

  const currentDevice = selectedDevice || (telemetry ? telemetry.deviceUsed : 'AUTO');

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await runLocalOpenVINOBenchmark(selectedDevice, selectedPrecision);
      setBenchmarkResult(res);
    } finally {
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl border border-cyan-500/30">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Intel® OpenVINO™ Edge AI & PINN Diagnostics
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Adaptive Hardware Engine
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Arsitektur Edge AI Heterogen (NPU + iGPU + CPU) & Auto-Device Load Balancer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Detected Hardware Profile Card */}
        {deviceProfile && (
          <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-950/60 p-4 rounded-2xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase font-mono flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Spesifikasi Perangkat Terdeteksi (Browser Real-Time Hardware Detection):
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-200 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                Auto-Detected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Target Direkomendasikan</p>
                <p className="text-xs font-bold text-cyan-300 flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Intel {deviceProfile.recommendedTarget}
                </p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Logical CPU Cores / RAM</p>
                <p className="text-xs font-bold text-white pt-0.5">
                  {deviceProfile.logicalCores} Cores | {deviceProfile.systemMemoryGb} GB
                </p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">WebGPU / WebNN Accelerator</p>
                <p className="text-xs font-bold text-emerald-400 pt-0.5">
                  {deviceProfile.webGpuSupported ? '✅ WebGPU Active' : '✅ WebGL Enabled'}
                </p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Hardware Renderer</p>
                <p className="text-[11px] font-semibold text-slate-300 truncate pt-0.5" title={deviceProfile.rendererName}>
                  {deviceProfile.rendererName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Target Device & Precision Switcher Controls */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Pilih Konfigurasi Perangkat Execution Provider Intel® OpenVINO™:
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setSelectedDevice('AUTO')}
              className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                selectedDevice === 'AUTO'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <p className="text-[10px] opacity-80">Dynamic Balancer</p>
              <p className="text-xs">AUTO (Recommended)</p>
            </button>

            <button
              onClick={() => setSelectedDevice('NPU')}
              className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                selectedDevice === 'NPU'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <p className="text-[10px] opacity-80">Intel Neural Engine</p>
              <p className="text-xs">NPU Target (&lt;7ms)</p>
            </button>

            <button
              onClick={() => setSelectedDevice('iGPU')}
              className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                selectedDevice === 'iGPU'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <p className="text-[10px] opacity-80">Iris Xe / Arc Graphics</p>
              <p className="text-xs">iGPU Target (~12ms)</p>
            </button>

            <button
              onClick={() => setSelectedDevice('CPU')}
              className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                selectedDevice === 'CPU'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <p className="text-[10px] opacity-80">Core Ultra / Xeon</p>
              <p className="text-xs">CPU Vector (~24ms)</p>
            </button>

            <button
              onClick={() => setSelectedDevice('MULTI')}
              className={`p-2.5 rounded-xl text-xs font-mono font-bold transition-all text-left ${
                selectedDevice === 'MULTI'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border border-white/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <p className="text-[10px] opacity-80">Parallel Engine</p>
              <p className="text-xs">MULTI (NPU+iGPU)</p>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">Presisi Quantization:</span>
              <button
                onClick={() => setSelectedPrecision('INT8_NNCF')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedPrecision === 'INT8_NNCF'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                INT8 (NNCF Ultra-Fast)
              </button>
              <button
                onClick={() => setSelectedPrecision('FP16')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedPrecision === 'FP16'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                FP16 (Half Precision)
              </button>
              <button
                onClick={() => setSelectedPrecision('FP32')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedPrecision === 'FP32'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                FP32 (Full Baseline)
              </button>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isBenchmarking ? 'Menjalankan Benchmark...' : 'Uji Benchmark Pada Perangkat Ini'}</span>
            </button>
          </div>
        </div>

        {/* Live Benchmark Results Panel */}
        {benchmarkResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-2 animate-fadeIn">
            <h4 className="text-xs font-bold text-emerald-300 font-mono uppercase flex items-center justify-between">
              <span>Hasil Benchmark 50-Pass Inference Pada Perangkat Ini:</span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                {benchmarkResult.executionProvider}
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Rata-rata Latensi</p>
                <p className="text-sm font-bold text-emerald-300">{benchmarkResult.avgLatencyMs} ms</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Throughput Inferensi</p>
                <p className="text-sm font-bold text-cyan-300">{benchmarkResult.throughputFps} FPS / SPS</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Akurasi Quantization NNCF</p>
                <p className="text-sm font-bold text-amber-300">{benchmarkResult.quantizationAccuracyVsFp32}% vs FP32</p>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-400">Penggunaan Memori</p>
                <p className="text-sm font-bold text-indigo-300">{benchmarkResult.memoryFootprintMb} MB RAM</p>
              </div>
            </div>
          </div>
        )}

        {/* Export OpenVINO Model & Config Deployment Section */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2">
          <h3 className="text-xs font-bold text-cyan-300 uppercase font-mono flex items-center justify-between">
            <span>Unduh Model OpenVINO IR & Kode Deployment Intel AI PC:</span>
            <span className="text-[10px] text-slate-400">Ready for Python / C++ OpenVINO Runtime</span>
          </h3>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`/api/openvino/export-ir?device=${selectedDevice}&precision=${selectedPrecision}`}
              download
              className="bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-mono font-bold px-3.5 py-2 rounded-xl border border-cyan-500/30 flex items-center space-x-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh OpenVINO Model IR (.xml)</span>
            </a>

            <a
              href={`/api/openvino/export-config?device=${selectedDevice}&precision=${selectedPrecision}`}
              download
              className="bg-white/5 hover:bg-white/10 text-indigo-300 text-xs font-mono font-bold px-3.5 py-2 rounded-xl border border-indigo-500/30 flex items-center space-x-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Konfigurasi Deployment (.json)</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-[11px] text-slate-400 font-mono">
            Model PINN siap dieksekusi di Intel Core Ultra, Iris Xe, dan NPU Edge Nodes.
          </span>
          <button
            onClick={onClose}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

