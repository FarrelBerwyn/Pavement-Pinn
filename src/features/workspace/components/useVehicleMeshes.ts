/**
 * Loads a vehicle's GLB body and wheel meshes (three.js GLTFLoader) and normalises them:
 * - wheel: centred, scaled to the configured diameter and tyre width, axle along X;
 * - body: wheel nodes removed, scaled to the configured length/width/height, sitting on y = 0.
 * Errors are returned, never hidden: the caller falls back to the simple model and says so.
 */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { VehicleAsset } from './vehicleAssets';

const cache = new Map<string, Promise<THREE.Object3D>>();
const base = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');

export function loadGlb(file: string): Promise<THREE.Object3D> {
  if (!cache.has(file)) {
    cache.set(
      file,
      new GLTFLoader().loadAsync(`${base}${file}`).then((g) => g.scene).catch((e) => {
        cache.delete(file);
        throw new Error(`Gagal memuat ${file}: ${e?.message ?? e}`);
      })
    );
  }
  return cache.get(file)!;
}

/** Scale an object so its bounding box has the given size (mm) and centre it at the origin. */
export function fitToSize(obj: THREE.Object3D, size: THREE.Vector3, sitOnGround: boolean): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(obj);
  const dims = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  obj.position.sub(centre);
  holder.add(obj);
  holder.scale.set(size.x / (dims.x || 1), size.y / (dims.y || 1), size.z / (dims.z || 1));
  if (sitOnGround) holder.position.y = size.y / 2;
  const outer = new THREE.Group();
  outer.add(holder);
  return outer;
}

export interface VehicleMeshes {
  body: THREE.Object3D | null;
  /** Factory: a fresh normalised wheel (diameter 2R, width W, axle along X). */
  makeWheel: (() => THREE.Object3D) | null;
  error: string | null;
  loading: boolean;
}

export function useVehicleMeshes(asset: VehicleAsset, bodyLengthMm: number): VehicleMeshes {
  const [state, setState] = useState<VehicleMeshes>({ body: null, makeWheel: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const wheelSrc = await loadGlb(asset.wheelFile);
        const makeWheel = () => {
          const w = wheelSrc.clone(true);
          const box = new THREE.Box3().setFromObject(w);
          const d = box.getSize(new THREE.Vector3());
          // The thinnest dimension of a wheel mesh is its width; rotate it onto X.
          if (d.z < d.x && d.z < d.y) w.rotation.y = Math.PI / 2;
          else if (d.y < d.x && d.y < d.z) w.rotation.z = Math.PI / 2;
          return fitToSize(w, new THREE.Vector3(asset.wheelWidthMm, asset.wheelRadiusMm * 2, asset.wheelRadiusMm * 2), false);
        };
        let body: THREE.Object3D | null = null;
        if (asset.bodyFile) {
          const src = (await loadGlb(asset.bodyFile)).clone(true);
          const wheels: THREE.Object3D[] = [];
          src.traverse((o) => o.name.toLowerCase().startsWith('wheel') && wheels.push(o));
          wheels.forEach((w) => w.parent?.remove(w));
          body = fitToSize(src, new THREE.Vector3(asset.widthMm, asset.heightMm - asset.wheelRadiusMm * 0.6, bodyLengthMm), true);
          body.position.y = asset.wheelRadiusMm * 0.6;
        }
        if (alive) setState({ body, makeWheel, error: null, loading: false });
      } catch (e) {
        if (alive) setState({ body: null, makeWheel: null, error: e instanceof Error ? e.message : String(e), loading: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [asset.id, bodyLengthMm]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
