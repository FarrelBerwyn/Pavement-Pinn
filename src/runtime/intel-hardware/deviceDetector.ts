import { DeviceHardwareProfile, HardwareDevice, PrecisionMode } from '../../types';

/**
 * Intel® OpenVINO™ Browser & System Hardware Detector
 * Analyzes local device capabilities (CPU cores, RAM, WebGL/WebGPU/WebNN renderer)
 * and maps them to optimal Intel OpenVINO Execution Provider targets (NPU, iGPU, CPU, AUTO, MULTI).
 */
export function detectLocalDeviceProfile(): DeviceHardwareProfile {
  const logicalCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
  // @ts-ignore - deviceMemory is experimental on Chrome/Edge
  const systemMemoryGb = typeof navigator !== 'undefined' && (navigator as any).deviceMemory ? (navigator as any).deviceMemory : 8;

  let webGlSupported = false;
  let vendorName = 'Intel Corporation';
  let rendererName = 'Intel® Core™ Ultra Processor with NPU & Intel® Graphics';

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        webGlSupported = true;
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const v = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const r = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (v) vendorName = String(v);
          if (r) rendererName = String(r);
        }
      }
    } catch {
      webGlSupported = false;
    }
  }

  // WebGPU support check
  const webGpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  // WebNN (Neural Network API) check
  // @ts-ignore
  const webNnSupported = typeof navigator !== 'undefined' && 'ml' in navigator;

  // Check if renderer mentions NPU, Iris, Arc, or Intel
  const rendererLower = rendererName.toLowerCase();
  const isIntel = rendererLower.includes('intel') || vendorName.toLowerCase().includes('intel');
  const hasNpuAccelerator = webNnSupported || rendererLower.includes('npu') || rendererLower.includes('neural') || (isIntel && logicalCores >= 12);

  // Recommend optimal target device
  let recommendedTarget: HardwareDevice = 'AUTO';
  let recommendedPrecision: PrecisionMode = 'INT8_NNCF';
  let recommendedStreams = 2;

  if (hasNpuAccelerator) {
    recommendedTarget = 'NPU';
    recommendedPrecision = 'INT8_NNCF';
    recommendedStreams = 2;
  } else if (webGpuSupported || rendererLower.includes('graphics') || rendererLower.includes('gpu')) {
    recommendedTarget = 'iGPU';
    recommendedPrecision = 'FP16';
    recommendedStreams = 4;
  } else {
    recommendedTarget = 'CPU';
    recommendedPrecision = 'FP32';
    recommendedStreams = logicalCores >= 8 ? 4 : 2;
  }

  return {
    deviceType: recommendedTarget,
    vendorName: isIntel ? 'Intel® Corporation (OpenVINO Target)' : vendorName,
    rendererName,
    logicalCores,
    systemMemoryGb,
    webGpuSupported,
    webGlSupported,
    webNnSupported,
    hasNpuAccelerator,
    recommendedTarget,
    recommendedPrecision,
    recommendedStreams
  };
}
