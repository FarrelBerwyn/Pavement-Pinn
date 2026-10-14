import { HardwareDevice, PrecisionMode } from '../../types';

/**
 * SIMULATED OpenVINO benchmark.
 *
 * No OpenVINO runtime, model, or Intel device is invoked here. The reported latency is a
 * per-device lookup constant blended with the duration of a small JavaScript tanh loop;
 * memory footprint and INT8 accuracy are constants. Do not cite these numbers as measured
 * NPU / iGPU / CPU inference performance.
 *
 * Original description (kept for traceability): "Runs a 50-pass local hardware benchmark
 * to measure real inference latency on the user's browser/system".
 */
export async function runLocalOpenVINOBenchmark(
  targetDevice: HardwareDevice,
  precisionMode: PrecisionMode
): Promise<{
  avgLatencyMs: number;
  p95LatencyMs: number;
  throughputFps: number;
  executionProvider: string;
  memoryFootprintMb: number;
  quantizationAccuracyVsFp32: number;
}> {
  const passes = 50;
  const latencies: number[] = [];

  // Device-specific speed multiplier factor
  const baseLatency =
    targetDevice === 'NPU'
      ? 6.8
      : targetDevice === 'iGPU'
      ? 11.2
      : targetDevice === 'MULTI'
      ? 8.1
      : targetDevice === 'AUTO'
      ? 7.2
      : 22.5; // CPU

  const precisionFactor = precisionMode === 'INT8_NNCF' ? 0.7 : precisionMode === 'FP16' ? 0.85 : 1.0;

  for (let i = 0; i < passes; i++) {
    const start = performance.now();
    // Simulate real matrix multiplication & tensor operations
    let x = 0.5;
    for (let j = 0; j < 5000; j++) {
      x = Math.tanh(x * 1.0001 + 0.001);
    }
    const duration = performance.now() - start;
    // Blend real JS loop duration with device latency profile
    const simulatedLatency = Math.max(1.5, baseLatency * precisionFactor + (duration % 1.5) - 0.5);
    latencies.push(simulatedLatency);
    // Yield every 10 passes to avoid freezing UI
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  latencies.sort((a, b) => a - b);
  const avgLatencyMs = Number((latencies.reduce((a, b) => a + b, 0) / passes).toFixed(2));
  const p95LatencyMs = Number(latencies[Math.floor(passes * 0.95)].toFixed(2));
  const throughputFps = Math.round(1000 / avgLatencyMs);

  const executionProvider =
    targetDevice === 'NPU'
      ? 'Intel® OpenVINO™ NPU Plugin (NNCF INT8)'
      : targetDevice === 'iGPU'
      ? 'Intel® OpenVINO™ GPU Plugin (WebGPU/OpenCL)'
      : targetDevice === 'MULTI'
      ? 'Intel® OpenVINO™ Multi-Device (NPU + iGPU)'
      : targetDevice === 'AUTO'
      ? 'Intel® OpenVINO™ Auto-Device Plugin (Dynamic Load Balancing)'
      : 'Intel® OpenVINO™ CPU Plugin (AVX-512 / VNNI Vectorization)';

  const memoryFootprintMb = targetDevice === 'NPU' ? 42 : targetDevice === 'iGPU' ? 78 : 125;
  const quantizationAccuracyVsFp32 = precisionMode === 'INT8_NNCF' ? 99.4 : precisionMode === 'FP16' ? 99.8 : 100.0;

  return {
    avgLatencyMs,
    p95LatencyMs,
    throughputFps,
    executionProvider,
    memoryFootprintMb,
    quantizationAccuracyVsFp32
  };
}
