/** Runtime validation of a vehicle configuration coming from the browser. */
import { z } from 'zod';
import type { VehicleConfig } from './vehicles';

const AxleSchema = z.object({ share: z.number().gt(0).lte(1), wheels: z.union([z.literal(1), z.literal(2), z.literal(4)]), positionM: z.number().min(0).max(30) });

export const VehicleSchema = z.object({
  type: z.enum(['motorcycle', 'car', 'truck']),
  label: z.string().max(80),
  emptyMassKg: z.number().positive().max(60000),
  payloadKg: z.number().min(0).max(60000),
  speedKmh: z.number().min(0).max(150),
  tyrePressureMPa: z.number().min(0.1).max(1.5),
  dualSpacingMm: z.number().min(0).max(600),
  axles: z.array(AxleSchema).min(1).max(6)
});

export function parseVehicle(raw: unknown): { ok: true; value: VehicleConfig } | { ok: false; message: string } {
  const r = VehicleSchema.safeParse(raw);
  if (!r.success) return { ok: false, message: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  const sum = r.data.axles.reduce((s, a) => s + a.share, 0);
  if (Math.abs(sum - 1) > 0.01) return { ok: false, message: `Pembagian beban sumbu harus berjumlah 100 % (sekarang ${(sum * 100).toFixed(1)} %)` };
  return { ok: true, value: r.data as VehicleConfig };
}
