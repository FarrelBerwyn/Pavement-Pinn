/**
 * "Navigasi ke Lokasi" for a field task: the map centred on the report's own coordinates,
 * with the same report pin, and a panel that only states what is known. Turn-by-turn routing
 * is handed to a real routing provider (Google Maps); distance is shown only from the
 * device's real GPS fix, as a straight line. No simulated route, speed or ETA.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crosshair, ExternalLink, MapPin } from 'lucide-react';
import type { ReportCase } from '../../../domain/workflow/model';
import type { RoadSegment } from '../../../types';
import { reportForDisplay } from '../../../domain/workflow/projections';
import { LeafletMap } from '../../../components/maps/LeafletMap';

type Fix = { coordinates: [number, number]; accuracyM: number };

/** Great-circle distance in metres. */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const TaskNavigation: React.FC<{ c: ReportCase; roadSegments: RoadSegment[]; onBack: () => void }> = ({ c, roadSegments, onBack }) => {
  const target = c.report.coordinates;
  const report = useMemo(() => reportForDisplay(c), [c]);
  const [fix, setFix] = useState<Fix | null>(null);
  const [gps, setGps] = useState<'WAITING' | 'OK' | 'DENIED' | 'UNSUPPORTED'>('WAITING');
  const [centerAt] = useState(() => Date.now());

  useEffect(() => {
    if (!navigator.geolocation) return setGps('UNSUPPORTED');
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setFix({ coordinates: [p.coords.latitude, p.coords.longitude], accuracyM: p.coords.accuracy });
        setGps('OK');
      },
      () => setGps('DENIED'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const segment = roadSegments.find((s) => s.id === c.segmentId) ?? null;
  const dist = fix ? distanceM(fix.coordinates, target) : null;
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${target[0]},${target[1]}&travelmode=driving`;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-canvas text-fg md:flex-row" role="dialog" aria-modal="true" aria-label={`Navigasi ke lokasi ${c.id}`}>
      <div className="relative min-h-[50vh] flex-1">
        <LeafletMap
          roadSegments={roadSegments}
          selectedSegment={segment}
          onSelectSegment={() => {}}
          communityReports={[report]}
          highlightReportId={c.id}
          mapCenterTarget={{ coords: target, zoom: 17, timestamp: centerAt }}
          userLocation={fix}
          activeRole="FIELD_ENGINEER"
          theme="dark"
        />
        <button type="button" onClick={onBack} className="absolute left-3 top-3 z-[500] inline-flex items-center gap-2 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs font-bold text-fg shadow-lg hover:bg-elevated">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Tugas Saya
        </button>
      </div>

      <aside className="w-full space-y-4 overflow-y-auto border-t border-line bg-surface p-5 md:w-96 md:border-l md:border-t-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-fg-muted">Lokasi tugas</p>
          <h2 className="mt-1 text-lg font-bold">{c.report.damageTypeLabel} — {c.report.segmentName}</h2>
          <p className="mt-1 font-mono text-xs text-brand">{c.id}{c.assignment && ` · ${c.assignment.id}`}</p>
        </div>
        <dl className="space-y-2 rounded-xl border border-line bg-canvas/60 p-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-fg-muted">Koordinat laporan</dt><dd className="font-mono">{target[0].toFixed(5)}, {target[1].toFixed(5)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-fg-muted">Koridor</dt><dd className="text-right">{c.report.corridor}</dd></div>
          {c.assignment && <div className="flex justify-between gap-3"><dt className="text-fg-muted">Tenggat</dt><dd>{new Date(c.assignment.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>}
        </dl>

        <div className="rounded-xl border border-line bg-canvas/60 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Crosshair className="h-4 w-4 text-brand" /> Posisi Anda</p>
          {gps === 'OK' && dist !== null && fix ? (
            <p className="mt-1">
              <b className="text-xl">{dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}</b> garis lurus ke lokasi
              <span className="block text-xs text-fg-muted">Akurasi GPS ±{Math.round(fix.accuracyM)} m. Jarak tempuh jalan bisa lebih panjang.</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-fg-muted">
              {gps === 'WAITING' ? 'Menunggu GPS perangkat…' : gps === 'DENIED' ? 'Izin lokasi ditolak: jarak tidak dapat dihitung. Gunakan koordinat di atas.' : 'Perangkat tidak mendukung GPS.'}
            </p>
          )}
        </div>

        <a href={gmaps} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-bold text-navy hover:bg-brand-hover">
          <ExternalLink className="h-4 w-4" /> Buka rute di Google Maps
        </a>
        <p className="flex items-start gap-2 text-xs text-fg-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Rute belokan dan perkiraan waktu tempuh disediakan Google Maps. Aplikasi ini tidak menghitung rute sendiri.
        </p>
        {c.assignment && (
          <div className="rounded-xl border border-line p-3 text-xs">
            <p className="font-bold uppercase tracking-wide text-fg-subtle">Instruksi M.O</p>
            <p className="mt-1 text-fg/90">{c.assignment.instructions}</p>
          </div>
        )}
      </aside>
    </div>
  );
};
