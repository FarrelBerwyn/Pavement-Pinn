/**
 * Vehicle asset registry. Meshes are VISUAL only: mass, axle shares, wheel counts and contact
 * geometry come from src/domain/workspace/vehicles.ts and are what the solver receives.
 *
 * Installed: Kenney Car Kit 3.1 (CC0) in public/models/vehicles/kenney/ (see SOURCE.md there).
 * The Kenney meshes are stylised (not to scale), so the body is rescaled to the configured
 * track/wheelbase/height and the wheel meshes are placed at the solver's contact positions.
 * No motorcycle exists in that kit: the motorcycle uses Kenney wheels with a simple body.
 */
import type { VehicleType } from '../../../domain/workspace/vehicles';

export interface VehicleAsset {
  id: string;
  type: VehicleType;
  label: string;
  /** Body mesh (wheel nodes inside it are removed and replaced), or null = simple body. */
  bodyFile: string | null;
  /** Wheel mesh, placed once per configured wheel. */
  wheelFile: string;
  source: string;
  license: string;
  /** Target real dimensions for the rescaled body, mm. */
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  wheelRadiusMm: number;
  wheelWidthMm: number;
  trackMm: number;
}

const KENNEY = { source: 'Kenney Car Kit 3.1 — https://kenney.nl/assets/car-kit', license: 'CC0 1.0' };

export const VEHICLE_ASSETS: Record<VehicleType, VehicleAsset> = {
  motorcycle: { id: 'kenney-wheel+simple-body', type: 'motorcycle', label: 'Motor (roda Kenney, bodi sederhana)', bodyFile: null, wheelFile: 'models/vehicles/kenney/wheel-default.glb', ...KENNEY, lengthMm: 2000, widthMm: 750, heightMm: 1100, wheelRadiusMm: 300, wheelWidthMm: 110, trackMm: 0 },
  car: { id: 'kenney-sedan', type: 'car', label: 'Sedan (Kenney)', bodyFile: 'models/vehicles/kenney/sedan.glb', wheelFile: 'models/vehicles/kenney/wheel-default.glb', ...KENNEY, lengthMm: 4500, widthMm: 1800, heightMm: 1450, wheelRadiusMm: 320, wheelWidthMm: 205, trackMm: 1500 },
  truck: { id: 'kenney-truck', type: 'truck', label: 'Truk (Kenney, sumbu dari konfigurasi)', bodyFile: 'models/vehicles/kenney/truck.glb', wheelFile: 'models/vehicles/kenney/wheel-truck.glb', ...KENNEY, lengthMm: 8000, widthMm: 2500, heightMm: 3300, wheelRadiusMm: 500, wheelWidthMm: 275, trackMm: 1850 }
};

export function assetUsable(a: VehicleAsset): boolean {
  return !!a.license && !!a.source && !!a.wheelFile;
}
