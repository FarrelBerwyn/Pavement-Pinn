/**
 * Validation tab: reference (field) vs system depth, computed only from real pairs. No pairs ->
 * UnavailableCard, never zeros. Tolerance band is a TARGET (team target), not a proven figure.
 */
import React, { useState } from 'react';
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useWsT } from '../i18n';
import { useWorkspace } from '../WorkspaceContext';
import { ActionButton, Row, SectionTitle, StatusBadge, UnavailableCard, VERDICT_TONE } from '../components/shared';
import { VersionActions } from '../components/VersionActions';
import { DEPTH_TOLERANCE_MM, validationStats, verdictFor } from '../../../domain/workspace/metrics';

const fmt = (v: number | null, d = 1) => (v === null ? '—' : v.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d }));

export const ValidationMain: React.FC = () => {
  const t = useWsT();
  const { workspace: w, activeObject: o, setActiveObject, isFieldEngineer, setTab } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  if (!w) return null;
  const pairs = w.groundTruth.filter((p) => p.referenceMm !== null && p.systemMm !== null);
  const objPoints = w.groundTruth.filter((p) => p.objectId === o?.objectId);
  if (pairs.length === 0 && objPoints.length === 0) {
    return (
      <UnavailableCard
        title={t('validationUnavailable')}
        reason="Belum ada pasangan ukur manual (jangka sorong/mistar) vs sistem. MAE/RMSE tidak dihitung tanpa pasangan nyata."
        action={{ label: 'Tambah titik referensi', disabled: !isFieldEngineer, title: isFieldEngineer ? undefined : t('feOnly'), onClick: () => setTab('3d') }}
      />
    );
  }
  const max = Math.max(10, ...pairs.flatMap((p) => [p.referenceMm as number, p.systemMm as number])) * 1.1;
  const data = pairs.map((p) => ({ x: p.referenceMm, y: p.systemMm, id: p.pointId, obj: p.objectId, v: verdictFor(p) }));
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="h-[360px]" data-testid="validation-scatter">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 12, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="#1A2430" />
            <XAxis type="number" dataKey="x" domain={[0, max]} tick={{ fill: '#8B9BB0', fontSize: 10 }} label={{ value: 'Referensi lapangan (mm)', fill: '#8B9BB0', fontSize: 11, position: 'insideBottom', offset: -12 }} />
            <YAxis type="number" dataKey="y" domain={[0, max]} tick={{ fill: '#8B9BB0', fontSize: 10 }} label={{ value: 'Sistem 3D (mm)', angle: -90, fill: '#8B9BB0', fontSize: 11, position: 'insideLeft' }} />
            <ReferenceArea x1={0} x2={max} y1={0} y2={max} fill="transparent" />
            <ReferenceLine segment={[{ x: 0, y: DEPTH_TOLERANCE_MM }, { x: max, y: max + DEPTH_TOLERANCE_MM }]} stroke="#6B7A90" strokeDasharray="4 4" />
            <ReferenceLine segment={[{ x: DEPTH_TOLERANCE_MM, y: 0 }, { x: max, y: max - DEPTH_TOLERANCE_MM }]} stroke="#6B7A90" strokeDasharray="4 4" />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke="#6EE7A8" />
            <Tooltip contentStyle={{ background: '#0B121A', border: '1px solid #273244', fontSize: 12 }} formatter={(v: number) => fmt(v)} />
            <Scatter data={data} isAnimationActive={false} onClick={(d: any) => { setActiveObject(d.obj); setSelected(d.id); }}>
              {data.map((d) => (
                <Cell key={d.id} fill={d.v === 'PASS' ? '#38BDF8' : d.v === 'REVIEW' ? '#F5C451' : '#EF4444'} stroke={d.id === selected ? '#fff' : 'none'} strokeWidth={2} cursor="pointer" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-[#8B9BB0]">Garis hijau y = x; garis putus-putus = toleransi ±{DEPTH_TOLERANCE_MM} mm (TARGET tim). Klik titik untuk membuka objeknya.</p>
      </div>
      <div>
        <div className="mb-2 text-[14px] font-semibold">Titik ukur {o?.objectId ?? ''}</div>
        <table className="w-full text-[12px]" data-testid="validation-table">
          <thead className="text-left text-[#8B9BB0]"><tr><th className="py-1">Titik</th><th>Ref.</th><th>Sistem</th><th>Δ</th><th>Status</th></tr></thead>
          <tbody>
            {objPoints.map((p) => {
              const v = verdictFor(p);
              return (
                <tr key={p.pointId} onClick={() => setSelected(p.pointId)} className={`cursor-pointer border-b border-[#1A2430] ${p.pointId === selected ? 'bg-[#13243A]' : ''}`} data-selected={p.pointId === selected}>
                  <td className="py-1.5">{p.pointId}</td>
                  <td>{fmt(p.referenceMm)}</td>
                  <td>{fmt(p.systemMm)}</td>
                  <td>{p.referenceMm !== null && p.systemMm !== null ? `${p.systemMm - p.referenceMm >= 0 ? '+' : ''}${fmt(p.systemMm - p.referenceMm)}` : '—'}</td>
                  <td><StatusBadge tone={VERDICT_TONE[v]}>{v === 'NOT_VALIDATED' ? 'tanpa ref.' : v.toLowerCase()}</StatusBadge></td>
                </tr>
              );
            })}
            {objPoints.length === 0 && <tr><td colSpan={5} className="py-2 italic text-[#8B9BB0]">Belum ada titik ukur untuk objek ini.</td></tr>}
          </tbody>
        </table>
        {objPoints.find((p) => p.pointId === selected)?.note && <p className="mt-2 text-[11px] text-[#9AA8BC]">{objPoints.find((p) => p.pointId === selected)?.note}</p>}
      </div>
    </div>
  );
};

export const ValidationPanel: React.FC = () => {
  const t = useWsT();
  const { workspace: w, isFieldEngineer, isOpsManager, setTab } = useWorkspace();
  if (!w) return null;
  const s = validationStats(w.groundTruth);
  const last = [...w.groundTruth].reverse()[0];
  return (
    <div>
      <SectionTitle>Metrik kedalaman {s ? `(n = ${s.n} pasangan, ${s.objects} objek)` : ''}</SectionTitle>
      {s ? (
        <>
          <Row label="MAE">{fmt(s.maeMm)} mm</Row>
          <Row label="RMSE">{fmt(s.rmseMm)} mm</Row>
          <Row label="Bias">{s.biasMm >= 0 ? '+' : ''}{fmt(s.biasMm)} mm ({s.biasMm >= 0 ? 'overestimate' : 'underestimate'})</Row>
          <Row label="Galat relatif">{s.relErrPct === null ? '—' : `${fmt(s.relErrPct)} %`}</Row>
          <Row label="R² (sistem vs referensi, y = x)">{s.r2 !== null ? fmt(s.r2, 3) : <span className="italic text-[#8B9BB0]">tidak dihitung: {s.r2Reason}</span>}</Row>
        </>
      ) : (
        <p className="text-[12px] italic text-[#8B9BB0]" data-testid="no-stats">{t('validationUnavailable')} — MAE/RMSE hanya dari pasangan nyata.</p>
      )}
      {(() => {
        const sw = validationStats(w.groundTruth, 'width');
        if (!sw) return null;
        return (
          <>
            <SectionTitle>Metrik lebar crack (n = {sw.n})</SectionTitle>
            <Row label="MAE">{fmt(sw.maeMm)} mm</Row>
            <Row label="Bias">{sw.biasMm >= 0 ? '+' : ''}{fmt(sw.biasMm)} mm</Row>
            <Row label="R²">{sw.r2 !== null ? fmt(sw.r2, 3) : <span className="italic text-[#8B9BB0]">tidak dihitung: {sw.r2Reason}</span>}</Row>
          </>
        );
      })()}
      <Row label="Toleransi">±{DEPTH_TOLERANCE_MM} mm (TARGET tim)</Row>
      <SectionTitle>Referensi</SectionTitle>
      <Row label="Alat">{last?.tool ?? '—'}</Row>
      <Row label="Diukur">{last ? new Date(last.measuredAt).toLocaleDateString('id-ID') : '—'}</Row>
      <SectionTitle>{t('validationStatus')}</SectionTitle>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        <StatusBadge tone="green">Pass</StatusBadge> {s?.pass ?? 0}
        <StatusBadge tone="amber">Review</StatusBadge> {s?.review ?? 0}
        <StatusBadge tone="red">Fail</StatusBadge> {s?.fail ?? 0}
      </div>
      <SectionTitle>{isOpsManager ? t('omActions') : t('feActions')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => setTab('camera')}>Buka foto bukti</ActionButton>
        <ActionButton locked={isFieldEngineer ? null : t('feOnly')} onClick={() => setTab('3d')}>Tambah titik referensi</ActionButton>
      </div>
      <div className="mt-3"><VersionActions /></div>
    </div>
  );
};
