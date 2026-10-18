/**
 * Dataset reference images for reports that have no citizen photo (the bundled demo
 * reports). Pure and isomorphic: the seed data, the store migration and the UI all use it,
 * so they agree on which image a report gets.
 *
 * Rules: a reference photo illustrates the damage type only — it is never the pinned
 * location, never a citizen photo and never before/after repair evidence. Damage types the
 * dataset has no label for get an explicit "no coverage" image instead of a generic photo.
 */
import registry from '../../data/reference/datasetImageRegistry.json';
import type { DamageReport } from '../../types';

export interface DatasetAsset {
  assetId: string;
  datasetName: string;
  sourceImageId: string;
  storagePath: string;
  damageType: string;
  originalLabel: string;
  sha256: string;
}

export const DATASET_ASSETS: readonly DatasetAsset[] = registry.assets;
export const DATASET_INFO = registry.datasets[0];
export const NO_COVERAGE_PATH = registry.noCoverageImage;

/** App-absolute URL for a public asset under the deployment base path (e.g. /PavementPinn/). */
export function assetUrl(storagePath: string, basePath: string): string {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${base}${storagePath}`;
}

export type ReferencePhoto =
  | { provenance: 'DATASET_REFERENCE'; asset: DatasetAsset }
  | { provenance: 'NO_DATASET_COVERAGE'; asset: null };

/**
 * Assign reference photos to reports, deterministically: reports in id order, each damage
 * type takes the next unused asset of that type (reused in order only when a type has more
 * reports than assets).
 */
export function assignReferencePhotos(reports: Pick<DamageReport, 'id' | 'damageType'>[]): Map<string, ReferencePhoto> {
  const out = new Map<string, ReferencePhoto>();
  const next = new Map<string, number>();
  for (const r of [...reports].sort((a, b) => a.id.localeCompare(b.id))) {
    const pool = DATASET_ASSETS.filter((a) => a.damageType === r.damageType);
    if (pool.length === 0) {
      out.set(r.id, { provenance: 'NO_DATASET_COVERAGE', asset: null });
      continue;
    }
    const i = next.get(r.damageType) ?? 0;
    next.set(r.damageType, i + 1);
    out.set(r.id, { provenance: 'DATASET_REFERENCE', asset: pool[i % pool.length] });
  }
  return out;
}

/** The report with its reference photo applied (photo fields only; nothing else changes). */
export function withReferencePhoto(report: DamageReport, ref: ReferencePhoto, basePath: string): DamageReport {
  return ref.provenance === 'DATASET_REFERENCE'
    ? { ...report, photoUrl: assetUrl(ref.asset.storagePath, basePath), photoProvenance: 'DATASET_REFERENCE', datasetAssetId: ref.asset.assetId }
    : { ...report, photoUrl: assetUrl(NO_COVERAGE_PATH, basePath), photoProvenance: 'NO_DATASET_COVERAGE', datasetAssetId: undefined };
}

/** Short Indonesian label for where a report's photo comes from. */
export function photoSourceLabel(report: Pick<DamageReport, 'photoProvenance' | 'datasetAssetId'>): string {
  if (report.photoProvenance === 'DATASET_REFERENCE') {
    const asset = DATASET_ASSETS.find((a) => a.assetId === report.datasetAssetId);
    return `Referensi dataset ${DATASET_INFO.name}${asset ? ` · ${asset.originalLabel}` : ''} · ${DATASET_INFO.license.split(' (')[0]} — bukan foto lokasi ini`;
  }
  if (report.photoProvenance === 'NO_DATASET_COVERAGE') return 'Belum ada foto referensi dataset untuk jenis kerusakan ini';
  return 'Foto laporan warga';
}

/** Caption for a report photo: dataset reference, no coverage, citizen photo, or legacy illustration. */
export function reportPhotoCaption(report: Pick<DamageReport, 'photoProvenance' | 'datasetAssetId' | 'photoUrl'>, illustrativeLabel: string): string {
  if (report.photoProvenance) return photoSourceLabel(report);
  return report.photoUrl?.startsWith('data:') ? 'Foto laporan warga' : illustrativeLabel;
}
