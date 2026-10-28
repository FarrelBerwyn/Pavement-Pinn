/**
 * Photo QC measured from the pixels in the browser: sharpness = variance of the Laplacian on a
 * 320-px-wide greyscale copy; exposure = % of saturated pixels (≥ 250 or ≤ 5). A frame whose
 * pixels cannot be read (cross-origin without CORS) gets null with that reason — never a guess.
 */
import { useEffect, useState } from 'react';
import type { Frame } from '../../domain/workspace/types';

/** Sharpness threshold. ASSUMED starting value (spec/01 T0), to be calibrated on project photos. */
export const SHARPNESS_THRESHOLD = 80;
export const QC_WIDTH = 320;

export interface FrameQc {
  sharpness: number | null;
  saturatedPct: number | null;
  reason?: string;
}

export function laplacianVariance(grey: Float32Array, w: number, h: number): number {
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = grey[i - w] + grey[i + w] + grey[i - 1] + grey[i + 1] - 4 * grey[i];
      sum += v;
      sum2 += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

async function measure(uri: string): Promise<FrameQc> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = uri;
  try {
    await img.decode();
  } catch {
    return { sharpness: null, saturatedPct: null, reason: 'foto tidak dapat dimuat' };
  }
  const w = QC_WIDTH;
  const h = Math.max(2, Math.round((img.naturalHeight / img.naturalWidth) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { sharpness: null, saturatedPct: null, reason: 'canvas tidak tersedia' };
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return { sharpness: null, saturatedPct: null, reason: 'piksel lintas domain tidak dapat dibaca' };
  }
  const grey = new Float32Array(w * h);
  let sat = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    grey[i] = g;
    if (g >= 250 || g <= 5) sat++;
  }
  return { sharpness: laplacianVariance(grey, w, h), saturatedPct: (sat / (w * h)) * 100 };
}

export function useFrameQc(frames: Frame[]): Record<string, FrameQc> {
  const [qc, setQc] = useState<Record<string, FrameQc>>({});
  useEffect(() => {
    let alive = true;
    for (const f of frames) {
      if (f.sharpness !== null) {
        setQc((p) => ({ ...p, [f.frameId]: { sharpness: f.sharpness, saturatedPct: f.saturatedPct } }));
        continue;
      }
      measure(f.uri).then((r) => alive && setQc((p) => ({ ...p, [f.frameId]: r })));
    }
    return () => {
      alive = false;
    };
  }, [frames.map((f) => f.frameId + f.uri).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return qc;
}
