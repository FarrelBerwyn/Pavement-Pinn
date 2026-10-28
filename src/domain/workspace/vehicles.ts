/**
 * Vehicle load configuration for the PINN tab (SI units inside: kg, m, kN, MPa).
 *
 * Statics only: total weight = Σ (mass × g) is split over axles by the configured axle
 * shares, and each axle load over its wheels. No dynamic load factor is applied: the
 * response solver (MLET, static, linear elastic) has no speed term, so speed is recorded
 * but does not change any number. Preset masses and shares are typical starting values
 * (ASSUMED), meant to be calibrated to the analysed vehicle.
 */
export const G = 9.80665;

export type VehicleType = 'motorcycle' | 'car' | 'truck';

export interface AxleConfig {
  /** Share of the total weight carried by this axle (0..1); shares sum to 1. */
  share: number;
  /** Wheels on the axle: 1 (motorcycle), 2 (single tyres) or 4 (dual tyres). */
  wheels: 1 | 2 | 4;
  /** Distance from the front axle, m. */
  positionM: number;
}

export interface VehicleConfig {
  type: VehicleType;
  label: string;
  emptyMassKg: number;
  payloadKg: number;
  speedKmh: number;
  tyrePressureMPa: number;
  /** Centre-to-centre spacing of dual tyres, mm (only for 4-wheel axles). */
  dualSpacingMm: number;
  axles: AxleConfig[];
}

export const VEHICLE_PRESETS: Record<VehicleType, VehicleConfig> = {
  motorcycle: {
    type: 'motorcycle', label: 'Motor — 2 roda', emptyMassKg: 120, payloadKg: 75, speedKmh: 30, tyrePressureMPa: 0.25, dualSpacingMm: 0,
    axles: [{ share: 0.4, wheels: 1, positionM: 0 }, { share: 0.6, wheels: 1, positionM: 1.3 }]
  },
  car: {
    type: 'car', label: 'Mobil — 4 roda', emptyMassKg: 1300, payloadKg: 200, speedKmh: 40, tyrePressureMPa: 0.23, dualSpacingMm: 0,
    axles: [{ share: 0.55, wheels: 2, positionM: 0 }, { share: 0.45, wheels: 2, positionM: 2.6 }]
  },
  truck: {
    // 3-axle rigid truck: single-tyre steer axle + two dual-tyre rear axles.
    type: 'truck', label: 'Truk — 3 sumbu', emptyMassKg: 9000, payloadKg: 15000, speedKmh: 40, tyrePressureMPa: 0.7, dualSpacingMm: 330,
    axles: [{ share: 0.25, wheels: 2, positionM: 0 }, { share: 0.375, wheels: 4, positionM: 4.2 }, { share: 0.375, wheels: 4, positionM: 5.55 }]
  }
};

export interface AxleLoad {
  index: number;
  positionM: number;
  wheels: number;
  axleKn: number;
  wheelKn: number;
  axleTonne: number;
  /** Contact radius from wheel load and tyre pressure (circular patch), mm. */
  contactRadiusMm: number;
}

export interface VehicleLoads {
  totalMassKg: number;
  totalKn: number;
  axles: AxleLoad[];
  governing: AxleLoad;
  /** Σ axle loads − total weight (must be ~0). */
  balanceKn: number;
  warnings: string[];
}

export function vehicleLoads(v: VehicleConfig): VehicleLoads {
  const warnings: string[] = [];
  const shareSum = v.axles.reduce((s, a) => s + a.share, 0);
  if (Math.abs(shareSum - 1) > 1e-6) warnings.push(`Pembagian sumbu berjumlah ${(shareSum * 100).toFixed(1)} %, dinormalisasi ke 100 %`);
  const totalMassKg = v.emptyMassKg + v.payloadKg;
  const totalKn = (totalMassKg * G) / 1000;
  const axles = v.axles.map((a, index) => {
    const axleKn = (totalKn * a.share) / shareSum;
    const wheelKn = axleKn / a.wheels;
    const contactRadiusMm = Math.sqrt((wheelKn * 1000) / (Math.PI * v.tyrePressureMPa));
    return { index, positionM: a.positionM, wheels: a.wheels, axleKn, wheelKn, axleTonne: (axleKn * 1000) / G / 1000, contactRadiusMm };
  });
  const governing = axles.reduce((m, a) => (a.wheelKn > m.wheelKn ? a : m), axles[0]);
  const balanceKn = axles.reduce((s, a) => s + a.axleKn, 0) - totalKn;
  if (v.axles.some((a) => a.wheels === 4) && !(v.dualSpacingMm >= 150 && v.dualSpacingMm <= 600)) warnings.push('Jarak roda ganda harus 150–600 mm');
  if (v.tyrePressureMPa < 0.1 || v.tyrePressureMPa > 1.5) warnings.push('Tekanan ban di luar 0,1–1,5 MPa');
  return { totalMassKg, totalKn, axles, governing, balanceKn, warnings };
}

/** Request body for one axle on the Python /v1/assess endpoint (MLET). */
export function assessLoadFor(axle: AxleLoad, v: VehicleConfig) {
  return {
    axle_t: axle.axleTonne,
    q_mpa: v.tyrePressureMPa,
    tyres_per_axle: axle.wheels,
    dual_spacing_mm: axle.wheels === 4 ? v.dualSpacingMm : null
  };
}
