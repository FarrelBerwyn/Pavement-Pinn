import { DeviceHardwareProfile } from '../../types';

const UNKNOWN = 'tidak diketahui';

/**
 * Browser-side hardware profile. A browser cannot see OpenVINO devices, so this never
 * claims an NPU or an Intel processor (F-12). Device availability may only come from
 * core.available_devices in the Python inference service. Only directly observable
 * browser facts are reported; everything else is "tidak diketahui".
 */
export function detectLocalDeviceProfile(): DeviceHardwareProfile {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const logicalCores = nav?.hardwareConcurrency ?? 0;
  const systemMemoryGb = (nav as unknown as { deviceMemory?: number } | undefined)?.deviceMemory ?? 0;

  let webGlSupported = false;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      webGlSupported = Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      webGlSupported = false;
    }
  }

  return {
    deviceType: 'AUTO',
    vendorName: UNKNOWN,
    rendererName: UNKNOWN,
    logicalCores,
    systemMemoryGb,
    webGpuSupported: Boolean(nav && 'gpu' in nav),
    webGlSupported,
    webNnSupported: Boolean(nav && 'ml' in nav),
    hasNpuAccelerator: false,
    recommendedTarget: 'AUTO',
    recommendedPrecision: 'FP32',
    recommendedStreams: 1
  };
}
