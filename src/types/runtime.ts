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
  inferenceLatencyMs: number; // e.g. 8.4 ms
  powerConsumptionWatts: number;
  cpuUtilizationPercent: number;
  npuUtilizationPercent: number;
  throughputSps: number; // simulations per second
  physicsLossValue: number; // residual PDE loss
  dataLossValue: number; // FWD reference loss
}
