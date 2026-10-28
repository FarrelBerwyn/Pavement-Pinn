/**
 * Public projection for the citizen tracking page (/track/:code). Allow-list only: no
 * names, account ids, coordinates beyond 3 decimals, model parameters or unvalidated
 * measurements ever leave through this function.
 */
import type { DamageObject, Workspace } from './types';
import { verdictFor } from './metrics';
import { publishedVersion } from './versions';

export interface PublicTrackView {
  trackingCode: string;
  demo: boolean;
  status: 'received' | 'in_review' | 'verified' | 'repaired';
  damageLabel: string;
  severity: 'low' | 'medium' | 'high' | null;
  /** Rounded to whole cm, present only for an object with field-validated depth and a valid scale. */
  sizeCm: { length: number | null; width: number | null; depth: number | null } | null;
  action: string | null;
  sanitizedPhotoUri: string | null;
  /** 'dataset' = a public dataset reference photo on DATA CONTOH, not a sanitised field photo. */
  photoKind: 'sanitized' | 'dataset' | null;
  afterPhotoUri: string | null;
  location: { lat: number; lon: number } | null;
  currentVersion: number | null;
  changeSummary: string | null;
  versions: Array<{ version: number; approvedAt: string; changeSummary: string }>;
  timeline: Array<{ at: string; label: string; done: boolean }>;
  canConfirmRepair: boolean;
  citizenConfirmedRepaired: boolean | null;
}

const roundCm = (mm: number | null) => (mm === null ? null : Math.round(mm / 10));

function primaryObject(ws: Workspace): DamageObject | null {
  return ws.objects.find((o) => o.class.value !== 'not_damage') ?? null;
}

function validatedSize(ws: Workspace, o: DamageObject | null): PublicTrackView['sizeCm'] {
  if (!o || o.quality.scaleStatus !== 'valid') return null;
  const passed = ws.groundTruth.some((p) => p.objectId === o.objectId && verdictFor(p) === 'PASS');
  if (!passed) return null;
  const m = o.measurements;
  return { length: roundCm(m.lengthMm.value), width: roundCm(m.widthMaxMm.value), depth: roundCm(m.depthMaxMm.value) };
}

export function toPublicTrack(ws: Workspace): PublicTrackView {
  const published = publishedVersion(ws);
  const o = primaryObject(ws);
  const repaired = ws.publicInfo.afterPhotoUri !== null && published !== null;
  const status: PublicTrackView['status'] = repaired ? 'repaired' : published ? 'verified' : ws.versions.length ? 'in_review' : 'received';
  const approved = ws.versions.filter((v) => v.status === 'approved' && v.approvedAt).sort((a, b) => a.version - b.version);
  const timeline: PublicTrackView['timeline'] = [
    { at: ws.createdAt, label: 'Diterima', done: true },
    ...ws.audit.filter((a) => a.action === 'extra_photo').map((a) => ({ at: a.at, label: 'Foto tambahan oleh petugas', done: true })),
    ...approved.map((v) => ({ at: v.approvedAt as string, label: `Diverifikasi (revisi v${v.version})`, done: true })),
    { at: '', label: 'Perbaikan', done: repaired },
    { at: '', label: 'Konfirmasi Anda: “sudah diperbaiki?”', done: ws.publicInfo.citizenConfirmedRepaired !== null }
  ];
  return {
    trackingCode: ws.trackingCode,
    demo: ws.demo,
    status,
    damageLabel: ws.publicInfo.damageLabel,
    severity: published && o ? o.severity.value : null,
    sizeCm: published ? validatedSize(ws, o) : null,
    action: published ? ws.publicInfo.action : null,
    sanitizedPhotoUri: ws.publicInfo.sanitizedPhotoUri,
    photoKind: ws.publicInfo.sanitizedPhotoUri === null ? null : ws.demo ? 'dataset' : 'sanitized',
    afterPhotoUri: published ? ws.publicInfo.afterPhotoUri : null,
    location: o ? { lat: Math.round(o.location.lat * 1000) / 1000, lon: Math.round(o.location.lon * 1000) / 1000 } : null,
    currentVersion: published?.version ?? null,
    changeSummary: published?.changeSummaryPublic ?? null,
    versions: approved.map((v) => ({ version: v.version, approvedAt: v.approvedAt as string, changeSummary: v.changeSummaryPublic })),
    timeline,
    canConfirmRepair: repaired && ws.publicInfo.citizenConfirmedRepaired === null,
    citizenConfirmedRepaired: ws.publicInfo.citizenConfirmedRepaired
  };
}
