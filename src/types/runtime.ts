/** Inference-runtime / hardware-target types (OpenVINO device, precision, telemetry). */

export type HardwareDevice = 'CPU' | 'iGPU' | 'NPU' | 'AUTO' | 'MULTI';

export type PrecisionMode = 'FP32' | 'FP16' | 'INT8_NNCF';

export type PerformanceHint = 'LATENCY' | 'THROUGHPUT' | 'CUMULATIVE_THROUGHPUT';

export interface DeviceHardwareProfile {
  deviceType: HardwareDevice;
  vendorName: string;
  rendererName: string;
  logicalCores: number;
  systemMemoryGb: number;
  webGpuSupported: boolean;
  webGlSupported: boolean;
  webNnSupported: boolean;
  hasNpuAccelerator: boolean;
  recommendedTarget: HardwareDevice;
  recommendedPrecision: PrecisionMode;
  recommendedStreams: number;
}

export interface IntelTelemetry {
  deviceUsed: HardwareDevice;
  precisionUsed: PrecisionMode;
  /** NOT_MEASURED until a benchmark script writes measurements/*.json. */
  measurementStatus: 'NOT_MEASURED' | 'MEASURED';
  inferenceLatencyMs: number | null;
  powerConsumptionWatts: number | null;
  cpuUtilizationPercent: number | null;
  npuUtilizationPercent: number | null;
  throughputSps: number | null;
  physicsLossValue: number | null;
  dataLossValue: number | null;
}
