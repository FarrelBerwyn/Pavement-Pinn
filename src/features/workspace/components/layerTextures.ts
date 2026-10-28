/**
 * Procedural, scale-correct textures for the pavement layers (no downloaded assets).
 * One texture tile = TILE_MM millimetres of material, so aggregate sizes follow real
 * gradings: AC fine aggregate ~2–10 mm, base crushed stone ~10–40 mm, subbase mixed gravel
 * ~3–25 mm, subgrade fine soil with moisture mottling. Purely visual: nothing here changes a
 * thickness, modulus or any other engineering input.
 */
import * as THREE from 'three';

export const TILE_MM = 400;
const PX = 512;
const PX_PER_MM = PX / TILE_MM;

/** Deterministic PRNG (mulberry32) so a texture looks the same on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Recipe {
  base: [number, number, number];
  /** stone size range, mm */
  stoneMm: [number, number];
  stones: number;
  stoneTint: Array<[number, number, number]>;
  grain: number; // fine noise amplitude 0..1
  mottle?: number; // large-scale moisture/colour variation
  seed: number;
}

export const RECIPES: Record<string, Recipe> = {
  AC: { base: [38, 40, 44], stoneMm: [2, 10], stones: 2600, stoneTint: [[70, 72, 76], [55, 57, 60], [92, 92, 94]], grain: 0.18, seed: 11 },
  Base: { base: [118, 110, 98], stoneMm: [10, 38], stones: 260, stoneTint: [[150, 146, 138], [128, 120, 108], [168, 162, 150], [104, 98, 90]], grain: 0.14, seed: 23 },
  Subbase: { base: [146, 128, 100], stoneMm: [3, 25], stones: 700, stoneTint: [[170, 156, 132], [122, 108, 86], [186, 176, 158]], grain: 0.2, seed: 37 },
  Subgrade: { base: [104, 76, 52], stoneMm: [1, 4], stones: 900, stoneTint: [[86, 62, 42], [122, 92, 64]], grain: 0.25, mottle: 0.18, seed: 53 }
};

/** Visual moisture preset for the subgrade (darker when wetter). Not a geotechnical value. */
export type MoisturePreset = 'kering' | 'lembap' | 'basah';
const MOISTURE_SHADE: Record<MoisturePreset, number> = { kering: 1.08, lembap: 0.9, basah: 0.72 };

function paint(recipe: Recipe, shade = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const ctx = c.getContext('2d')!;
  const r = rng(recipe.seed);
  const [br, bg, bb] = recipe.base.map((v) => v * shade);
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.fillRect(0, 0, PX, PX);
  if (recipe.mottle) {
    for (let i = 0; i < 40; i++) {
      const x = r() * PX;
      const y = r() * PX;
      const rad = 30 + r() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const d = (r() - 0.5) * 2 * recipe.mottle * 255;
      g.addColorStop(0, `rgba(${d > 0 ? 255 : 0},${d > 0 ? 230 : 0},${d > 0 ? 200 : 0},${Math.abs(d) / 255})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  // Fine grain (sand/binder), drawn wrap-around so the tile repeats without seams.
  const img = ctx.getImageData(0, 0, PX, PX);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 2 * recipe.grain * 80;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < recipe.stones; i++) {
    const sizeMm = recipe.stoneMm[0] + Math.pow(r(), 2) * (recipe.stoneMm[1] - recipe.stoneMm[0]);
    const rad = (sizeMm / 2) * PX_PER_MM;
    const x = r() * PX;
    const y = r() * PX;
    const tint = recipe.stoneTint[Math.floor(r() * recipe.stoneTint.length)].map((v) => v * shade);
    for (const [ox, oy] of [[0, 0], [PX, 0], [-PX, 0], [0, PX], [0, -PX]]) {
      ctx.beginPath();
      const k = 5 + Math.floor(r() * 4);
      for (let j = 0; j < k; j++) {
        const ang = (j / k) * Math.PI * 2;
        const rr = rad * (0.7 + r() * 0.45);
        const px = x + ox + Math.cos(ang) * rr;
        const py = y + oy + Math.sin(ang) * rr * (0.75 + r() * 0.3);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Albedo + bump textures for a layer, repeated so one tile spans TILE_MM in world units. */
export function layerMaterial(layer: string, widthMm: number, heightMm: number, moisture: MoisturePreset = 'lembap', opacity = 1): THREE.MeshStandardMaterial {
  const recipe = RECIPES[layer] ?? RECIPES.Subgrade;
  const shade = layer === 'Subgrade' ? MOISTURE_SHADE[moisture] : 1;
  const key = `${layer}:${shade}`;
  if (!cache.has(key)) cache.set(key, paint(recipe, shade));
  const canvas = cache.get(key)!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(widthMm / TILE_MM, heightMm / TILE_MM);
  map.anisotropy = 4;
  const bump = map.clone();
  bump.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: layer === 'AC' ? 1.5 : 3,
    roughness: layer === 'AC' ? 0.86 : 0.95,
    metalness: 0,
    transparent: opacity < 1,
    opacity
  });
}
