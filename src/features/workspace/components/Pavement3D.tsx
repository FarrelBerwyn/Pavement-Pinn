/**
 * 3D pavement block for the Structure and PINN tabs (lazy-loaded with three.js).
 *
 * - Layers are stacked to their recorded thickness; a layer without a thickness gets a fixed
 *   visual height and a dashed outline in the legend (the height carries no meaning).
 * - The active pothole is cut into the AC top from the stored depth grid (vertical ×2).
 * - PINN mode puts the MLET field slice (x–z plane through the wheel centres, y = 0 of the run)
 *   on the front cut face as a texture, and rolls dual tyres up to that face. The field is the
 *   static response with the wheels ON the cut plane; the rolling is an illustration of the
 *   load position, not a time-dependent simulation.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FieldGrid, Layer, SurfaceGrid } from '../../../domain/workspace/types';
import { rdylbu, turbo } from './shared';
import { layerMaterial, type MoisturePreset } from './layerTextures';
import type { VehicleType } from '../../../domain/workspace/vehicles';
import { VEHICLE_ASSETS } from './vehicleAssets';
import { useVehicleMeshes } from './useVehicleMeshes';

const FILL: Record<string, string> = { AC: '#2A2E35', Base: '#7A6650', Subbase: '#9C8A6C', Subgrade: '#6A4E36' };
const X0 = -800;
const X1 = 800;
const ZLEN = 1200; // along the road, mm
const PATCH_Z = -600; // pothole centre along the road
const EXAG = 2;

export interface Pavement3DProps {
  layers: Layer[];
  surface?: SurfaceGrid | null;
  field?: FieldGrid | null;
  fieldRange?: number;
  wheelsXMm?: number[];
  mode: 'structure' | 'pinn';
  hidden?: Record<string, boolean>;
  /** Vehicle drawn on the road (PINN). Governing axle sits on the cut plane. */
  vehicle?: VehicleView | null;
  moisture?: MoisturePreset;
  /** Opacity per layer for isolation (0..1). */
  opacity?: Record<string, number>;
}

export interface VehicleView {
  type: VehicleType;
  /** Axle positions from the front axle, m. */
  axlePositionsM: number[];
  wheelsPerAxle: number[];
  governingIndex: number;
  dualSpacingMm: number;
}

interface Band {
  name: string;
  top: number; // mm below surface (positive down)
  h: number;
  known: boolean;
}

export function layerBands(layers: Layer[], minTotal = 0): Band[] {
  let top = 0;
  const bands = layers.map((l) => {
    const known = l.thicknessMm.value !== null;
    const h = l.thicknessMm.value ?? (l.name === 'Subgrade' ? 250 : 150);
    const b = { name: l.name, top, h, known };
    top += h;
    return b;
  });
  const last = bands[bands.length - 1];
  if (last && top < minTotal) last.h += minTotal - top;
  return bands;
}

const Controls: React.FC<{ resetKey: number; mode: 'structure' | 'pinn'; zoom?: number }> = ({ resetKey, mode, zoom = 1 }) => {
  const { camera, gl } = useThree();
  const ref = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.target.set(0, -300, -500);
    ref.current = c;
    let raf = 0;
    const loop = () => {
      c.update();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      c.dispose();
    };
  }, [camera, gl]);
  useEffect(() => {
    // PINN looks at the front cut face (the field slice); Structure looks at the block from above.
    // Bigger vehicles need a farther camera, or it ends up inside the body.
    if (mode === 'pinn') camera.position.set(1700 * zoom, 1100 * zoom, 2600 * zoom);
    else camera.position.set(2000, 1500, 1900);
    ref.current?.target.set(0, mode === 'pinn' && zoom > 1 ? 400 : -200, -500 * zoom);
  }, [resetKey, camera, mode, zoom]);
  return null;
};

function Box({ x0, x1, y0, y1, z0, z1, layer, opacity = 1, moisture = 'lembap' }: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; layer: string; color?: string; opacity?: number; moisture?: MoisturePreset }) {
  const material = useMemo(() => layerMaterial(layer, Math.max(x1 - x0, z1 - z0), y1 - y0, moisture, opacity), [layer, x0, x1, y0, y1, z0, z1, moisture, opacity]);
  if (x1 <= x0 || y1 <= y0 || z1 <= z0) return null;
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={material}>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
    </mesh>
  );
}

/** AC top with the pothole: a displaced grid over the patch footprint. */
function PotholePatch({ g, acTop }: { g: SurfaceGrid; acTop: number }) {
  const geo = useMemo(() => {
    const w = g.cols * g.cellSize;
    const d = g.rows * g.cellSize;
    let max = 0;
    for (const row of g.depth) for (const v of row) if (v !== null && v > max) max = v;
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const asphalt = new THREE.Color(FILL.AC);
    for (let r = 0; r < g.rows; r++)
      for (let k = 0; k < g.cols; k++) {
        const v = Math.max(0, g.depth[r][k] ?? 0);
        pos.push((k + 0.5) * g.cellSize - w / 2, acTop - v * EXAG, PATCH_Z + (r + 0.5) * g.cellSize - d / 2);
        if (v < 1) c.copy(asphalt);
        else c.setStyle(turbo(0.15 + 0.85 * (v / (max || 1))));
        col.push(c.r, c.g, c.b);
      }
    const idx: number[] = [];
    for (let r = 0; r < g.rows - 1; r++)
      for (let k = 0; k < g.cols - 1; k++) {
        const a = r * g.cols + k;
        idx.push(a, a + g.cols, a + 1, a + 1, a + g.cols, a + g.cols + 1);
      }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geom.setIndex(idx);
    geom.computeVertexNormals();
    return geom;
  }, [g, acTop]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} />
    </mesh>
  );
}

function fieldTexture(grid: FieldGrid, range: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = grid.xMm.length;
  canvas.height = grid.zMm.length;
  const ctx = canvas.getContext('2d')!;
  grid.values.forEach((row, zi) =>
    row.forEach((v, xi) => {
      ctx.fillStyle = v === null ? '#333' : rdylbu(v / range);
      ctx.fillRect(xi, zi, 1, 1);
    })
  );
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Dual tyres rolling along the road to the cut plane (z = 0), then holding there. */
function Tyres({ xs, onArrive }: { xs: number[]; onArrive: (f: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const R = 480;
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const cycle = 7;
    const t = (clock.elapsedTime - t0.current) % cycle;
    const f = Math.min(1, t / 4); // 4 s rolling in, 3 s holding on the cut plane
    const z = -ZLEN + 150 + (ZLEN - 150) * (1 - Math.pow(1 - f, 2));
    if (group.current) {
      group.current.position.z = z;
      group.current.children.forEach((c) => (c.rotation.x = -z / R));
    }
    onArrive(f);
  });
  return (
    <group ref={group}>
      {xs.map((x) => (
        <mesh key={x} position={[x, R, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[R, R, 230, 40, 1]} />
          <meshStandardMaterial color="#34373C" roughness={0.92} />
        </mesh>
      ))}
      {xs.map((x) => (
        <mesh key={`rim-${x}`} position={[x + (x < 0 ? -116 : 116), R, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[R * 0.55, R * 0.55, 4, 32]} />
          <meshStandardMaterial color="#9AA4B2" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Simple procedural vehicles at real scale (mm). The governing axle's near-side wheel(s) sit on
 * the cut plane at the x positions the solver used (one side of the axle: x = 0 single wheel,
 * ±d/2 dual), so the field slice is the response under those wheels. Rolls in, then holds.
 */
const SPEC: Record<VehicleType, { R: number; tyreW: number; track: number; body: string; cab: string }> = {
  motorcycle: { R: 300, tyreW: 110, track: 0, body: '#B91C1C', cab: '#1F2937' },
  car: { R: 320, tyreW: 205, track: 1500, body: '#2563EB', cab: '#93C5FD' },
  truck: { R: 500, tyreW: 275, track: 1850, body: '#E5E7EB', cab: '#F59E0B' }
};

function VehicleModel({ v, wheelsXMm, onArrive, onMeshStatus }: { v: VehicleView; wheelsXMm: number[]; onArrive: (f: number) => void; onMeshStatus?: (s: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);
  const t0 = useRef<number | null>(null);
  wheels.current = [];
  const sp = SPEC[v.type];
  const gov = v.axlePositionsM[v.governingIndex] ?? 0;
  // near-side wheel centre(s) of the governing axle on the cut plane
  const nearX = wheelsXMm.length ? wheelsXMm.reduce((a, b) => a + b, 0) / wheelsXMm.length : 0;
  const farX = nearX + sp.track;
  const zOf = (posM: number) => (posM - gov) * 1000; // front axle has the smallest position -> negative z offset ahead
  const zs = v.axlePositionsM.map((p) => -zOf(p));
  const zMin = Math.min(...zs) - 600;
  const zMax = Math.max(...zs) + 600;
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = (clock.elapsedTime - t0.current) % 8;
    const f = Math.min(1, t / 4.5);
    const z = -3000 * (1 - (1 - Math.pow(1 - f, 2)));
    if (group.current) group.current.position.z = z;
    wheels.current.forEach((w) => w && (w.rotation.x = -z / sp.R));
    onArrive(f);
  });
  const asset = VEHICLE_ASSETS[v.type];
  const bodyLengthMm = Math.max(zMax - zMin + 500, v.type === 'car' ? 4300 : 2000);
  const meshes = useVehicleMeshes(asset, bodyLengthMm);
  useEffect(() => onMeshStatus?.(meshes.loading ? 'loading' : meshes.error ? `error:${meshes.error}` : 'glb'), [meshes.loading, meshes.error]); // eslint-disable-line react-hooks/exhaustive-deps
  // Kenney wheel mesh (CC0) when loaded; otherwise the procedural tyre below.
  // One wheel object per placement, created once per mesh load (a new object on every render
  // makes react-three-fiber swap instances, which breaks on callback refs).
  const glbWheelObjs = useRef(new Map<string, THREE.Object3D>());
  useEffect(() => glbWheelObjs.current.clear(), [meshes.makeWheel]);
  const glbWheel = (x: number, z: number, key: string) => {
    let obj = glbWheelObjs.current.get(key);
    if (!obj) {
      obj = meshes.makeWheel!();
      glbWheelObjs.current.set(key, obj);
    }
    wheels.current.push(obj as unknown as THREE.Mesh);
    return (
      <group key={key} position={[x, sp.R, z]}>
        <primitive object={obj} />
      </group>
    );
  };
  // Tyre = rubber cylinder + tread band + metal rim and hub on both faces (procedural).
  const procWheel = (x: number, z: number, key: string) => (
    <group key={key} position={[x, sp.R, z]}>
      <mesh ref={(m) => { if (m) wheels.current.push(m as unknown as THREE.Mesh); }} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[sp.R, sp.R, sp.tyreW, 48]} />
        <meshStandardMaterial color="#34373C" roughness={0.92} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[sp.R - 8, 10, 8, 48]} />
        <meshStandardMaterial color="#22252A" roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[(side * sp.tyreW) / 2 + side * 1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[sp.R * 0.62, sp.R * 0.62, 4, 32]} />
            <meshStandardMaterial color="#B8C0CC" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[(side * sp.tyreW) / 2 + side * 6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[sp.R * 0.18, sp.R * 0.18, 10, 16]} />
            <meshStandardMaterial color="#6B7280" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
  const wheel = meshes.makeWheel ? glbWheel : procWheel;
  const glbBody = meshes.body && v.type !== 'motorcycle';
  const sides = v.type === 'motorcycle' ? [nearX] : [nearX, farX];
  return (
    <group ref={group}>
      {v.axlePositionsM.map((_, i) =>
        sides.flatMap((cx, si) => {
          const dual = v.wheelsPerAxle[i] === 4;
          const off = dual ? [-v.dualSpacingMm / 2, v.dualSpacingMm / 2] : [0];
          return off.map((o) => wheel(cx + (si === 0 && dual ? o : si === 1 && dual ? o : 0), zs[i], `${i}-${si}-${o}`));
        })
      )}
      {v.type === 'motorcycle' && (
        <>
          <mesh position={[nearX, sp.R + 260, (zs[0] + zs[1]) / 2]}>
            <boxGeometry args={[220, 260, Math.abs(zs[1] - zs[0]) * 0.8]} />
            <meshStandardMaterial color={sp.body} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[nearX, sp.R + 520, (zs[0] + zs[1]) / 2 + 150]}>
            <boxGeometry args={[260, 120, 520]} />
            <meshStandardMaterial color={sp.cab} roughness={0.6} />
          </mesh>
        </>
      )}
      {glbBody && <primitive object={meshes.body!} position={[(nearX + farX) / 2, 0, (zMin + zMax) / 2]} />}
      {v.type === 'car' && !glbBody && (
        <>
          <mesh position={[(nearX + farX) / 2, sp.R + 250, (zMin + zMax) / 2]}>
            <boxGeometry args={[sp.track + 250, 420, zMax - zMin + 300]} />
            <meshStandardMaterial color={sp.body} metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[(nearX + farX) / 2, sp.R + 640, (zMin + zMax) / 2 + 150]}>
            <boxGeometry args={[sp.track + 100, 380, (zMax - zMin) * 0.55]} />
            <meshStandardMaterial color={sp.cab} metalness={0.1} roughness={0.1} transparent opacity={0.7} />
          </mesh>
        </>
      )}
      {v.type === 'truck' && !glbBody && (
        <>
          <mesh position={[(nearX + farX) / 2, sp.R + 1300, Math.max(...zs) - 200]}>
            <boxGeometry args={[sp.track + 500, 2200, 2000]} />
            <meshStandardMaterial color={sp.cab} roughness={0.5} />
          </mesh>
          <mesh position={[(nearX + farX) / 2, sp.R + 1500, (Math.min(...zs) + Math.max(...zs) - 2200) / 2 - 300]}>
            <boxGeometry args={[sp.track + 600, 2500, Math.max(...zs) - Math.min(...zs) - 1000 + 2400]} />
            <meshStandardMaterial color={sp.body} roughness={0.7} />
          </mesh>
          <mesh position={[(nearX + farX) / 2, sp.R + 250, (zMin + zMax) / 2]}>
            <boxGeometry args={[sp.track - 300, 220, zMax - zMin]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </>
      )}
    </group>
  );
}

const Scene: React.FC<Pavement3DProps & { resetKey: number; onMeshStatus?: (s: string) => void }> = ({ onMeshStatus, layers, surface, field, fieldRange = 1, wheelsXMm = [], mode, hidden = {}, resetKey, vehicle, moisture = 'lembap', opacity = {} }) => {
  const bands = useMemo(() => layerBands(layers, mode === 'pinn' ? 800 : 0), [layers, mode]);
  const tex = useMemo(() => (field ? fieldTexture(field, fieldRange) : null), [field, fieldRange]);
  const [arrive, setArrive] = useState(mode === 'pinn' ? 0 : 1);
  const ac = bands[0];
  const maxDepth = surface ? Math.max(0, ...surface.depth.flat().filter((v): v is number => v !== null)) : 0;
  const patch = surface && surface.unit === 'mm' ? { w: surface.cols * surface.cellSize, d: surface.rows * surface.cellSize } : null;
  const showField = mode === 'pinn' && tex && field;

  return (
    <>
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#cfe3ff', '#2a2218', 0.6]} />
      <directionalLight position={[900, 1600, 900]} intensity={0.9} />
      {bands.map((b) => {
        if (hidden[b.name]) return null;
        const y1 = -b.top;
        const y0 = -(b.top + b.h);
        const color = FILL[b.name] ?? '#666';
        const op = Math.min(b.known ? 1 : 0.55, opacity[b.name] ?? 1);
        // AC with a pothole cut-out: frame around the patch + a slab under it.
        if (b.name === 'AC' && patch) {
          const px0 = -patch.w / 2;
          const px1 = patch.w / 2;
          const pz0 = PATCH_Z - patch.d / 2;
          const pz1 = PATCH_Z + patch.d / 2;
          const under = -(maxDepth * EXAG + 2);
          return (
            <group key={b.name}>
              <Box x0={X0} x1={px0} y0={y0} y1={y1} z0={-ZLEN} z1={0} layer={b.name} opacity={op} moisture={moisture} />
              <Box x0={px1} x1={X1} y0={y0} y1={y1} z0={-ZLEN} z1={0} layer={b.name} opacity={op} moisture={moisture} />
              <Box x0={px0} x1={px1} y0={y0} y1={y1} z0={pz1} z1={0} layer={b.name} opacity={op} moisture={moisture} />
              <Box x0={px0} x1={px1} y0={y0} y1={y1} z0={-ZLEN} z1={pz0} layer={b.name} opacity={op} moisture={moisture} />
              <Box x0={px0} x1={px1} y0={y0} y1={Math.max(y0 + 1, under)} z0={pz0} z1={pz1} layer={b.name} opacity={op} moisture={moisture} />
            </group>
          );
        }
        return <Box key={b.name} x0={X0} x1={X1} y0={y0} y1={y1} z0={-ZLEN} z1={0} layer={b.name} opacity={op} moisture={moisture} />;
      })}
      {surface && patch && !hidden.AC && <PotholePatch g={surface} acTop={0} />}
      {/* interface lines on the front face */}
      {bands.slice(1).map((b) => (
        <mesh key={`i-${b.name}`} position={[0, -b.top, 1.5]}>
          <planeGeometry args={[X1 - X0, 4]} />
          <meshBasicMaterial color="#E6EDF3" transparent opacity={0.8} />
        </mesh>
      ))}
      {showField && (
        <mesh position={[0, -400, 1]}>
          <planeGeometry args={[X1 - X0, 800]} />
          <meshBasicMaterial map={tex} transparent opacity={0.25 + 0.75 * arrive} side={THREE.DoubleSide} />
        </mesh>
      )}
      {mode === 'pinn' && vehicle && <VehicleModel v={vehicle} wheelsXMm={wheelsXMm} onMeshStatus={onMeshStatus} onArrive={(f) => setArrive((p) => (Math.abs(p - f) > 0.02 ? f : p))} />}
      {mode === 'pinn' && !vehicle && wheelsXMm.length > 0 && <Tyres xs={wheelsXMm} onArrive={(f) => setArrive((p) => (Math.abs(p - f) > 0.02 ? f : p))} />}
      {mode === 'structure' && (
        <mesh position={[0, -400, PATCH_Z]} rotation={[0, 0, 0]}>
          <planeGeometry args={[X1 - X0, 900]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Controls resetKey={resetKey} mode={mode} zoom={vehicle?.type === 'truck' ? 3.2 : vehicle?.type === 'car' ? 1.8 : 1} />
    </>
  );
};

const Pavement3D: React.FC<Pavement3DProps> = (props) => {
  const [resetKey, setResetKey] = useState(0);
  const [meshStatus, setMeshStatus] = useState('none');
  const asset = props.vehicle ? VEHICLE_ASSETS[props.vehicle.type] : null;
  const vehicleText = !asset
    ? 'roda ilustrasi (belum ada skenario kendaraan)'
    : meshStatus === 'glb'
      ? `${asset.label} — mesh ${asset.source}, lisensi ${asset.license}; diskalakan ke konfigurasi, roda di posisi kontak solver`
      : meshStatus.startsWith('error:')
        ? `gagal memuat aset (${meshStatus.slice(6)}) — model sederhana`
        : 'memuat aset GLB…';
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#0E1622] to-[#070B10]" data-testid={`pavement3d-${props.mode}`}>
      <Canvas gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: 38, near: 5, far: 20000, position: [2000, 1500, 1900] }}>
        <Scene {...props} resetKey={resetKey} onMeshStatus={setMeshStatus} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 max-w-[70%] space-y-1 text-[10.5px]" data-testid="geometry-provenance">
        {props.surface && (
          <div className="rounded bg-black/70 px-2 py-1 text-[#F5C451]">
            Geometri lubang: {props.surface.synthetic ? 'kontur dari deteksi foto F01; kedalaman SINTETIS (DATA CONTOH) — bukan rekonstruksi 3D' : props.surface.unit === 'mm' ? 'grid kedalaman terukur (skala metrik)' : 'geometri relatif, tanpa skala'}
          </div>
        )}
        {props.mode === 'pinn' && (
          <div className="rounded bg-black/70 px-2 py-1 text-[#C9D4E3]">
            Kendaraan: <span data-testid="vehicle-mesh-status">{vehicleText}</span> · respons: statis (MLET), roda bergerak = ilustrasi
          </div>
        )}
      </div>
      <button type="button" onClick={() => setResetKey((k) => k + 1)} className="absolute right-2 top-2 rounded-md bg-[#16202C]/90 px-2 py-1 text-[11px] text-[#C9D4E3]">
        ⟲ Reset kamera
      </button>
    </div>
  );
};

export default Pavement3D;
