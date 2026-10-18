/**
 * Account context at the top of "Tim & Tugas" / "Tugas Saya", as on the original dashboard:
 * who is signed in (name, role, agency) and what is on their plate, counted from the same
 * server cases the board lists. Each figure opens the tab that holds those cases.
 */
import React from 'react';
import type { ReportCase } from '../../../domain/workflow/model';
import type { GatewayMode } from '../../../services/api/workflowClient';
import { fieldStage } from '../../work-orders/fieldStages';
import { isOverdue } from '../queues';

export type BoardTab = 'TODO' | 'ACTIVE' | 'DONE' | 'ALL';

export interface AccountInfo {
  name: string;
  title: string;
  agency: string;
  email: string;
  avatarUrl: string;
}

interface Tile {
  label: string;
  value: number | string;
  hint: string;
  tab?: BoardTab;
  tone?: 'warn' | 'good' | 'info' | 'neutral';
}

const TONE: Record<NonNullable<Tile['tone']>, string> = {
  warn: 'text-amber-300',
  good: 'text-emerald-300',
  info: 'text-sky-300',
  neutral: 'text-fg'
};

function opsTiles(cases: ReportCase[]): Tile[] {
  const n = (f: (c: ReportCase) => boolean) => cases.filter(f).length;
  const real = n((c) => c.dataStatus !== 'SYNTHETIC');
  return [
    { label: 'Perlu ditinjau', value: n((c) => c.state === 'NEEDS_REVIEW'), hint: `${n((c) => c.state === 'NEEDS_REVIEW' && c.dataStatus !== 'SYNTHETIC')} laporan warga nyata`, tab: 'TODO', tone: 'warn' },
    { label: 'Siap diterbitkan SPK', value: n((c) => c.state === 'VERIFIED'), hint: 'Sudah diterima, belum ditugaskan', tab: 'TODO', tone: 'warn' },
    { label: 'Perlu verifikasi Anda', value: n((c) => c.state === 'INSPECTED' || c.state === 'ACTION_RECOMMENDED' || (c.state === 'IN_PROGRESS' && c.workOrder?.status === 'COMPLETED')), hint: 'Hasil inspeksi, rekomendasi, bukti perbaikan', tab: 'ACTIVE', tone: 'info' },
    { label: 'Menunggu F.E', value: n((c) => c.state === 'FIELD_INSPECTION_REQUESTED' || (c.state === 'INSPECTION_VERIFIED' && c.inspection?.verdict === 'CONFIRMED') || (c.state === 'IN_PROGRESS' && c.workOrder?.status !== 'COMPLETED')), hint: `${n((c) => isOverdue(c))} lewat tenggat`, tab: 'ACTIVE', tone: 'neutral' },
    { label: 'Selesai', value: n((c) => c.state === 'RESOLVED' || c.state === 'CLOSED'), hint: `${real} laporan nyata · ${cases.length - real} data contoh`, tab: 'DONE', tone: 'good' }
  ];
}

function fieldTiles(cases: ReportCase[]): Tile[] {
  const stages = cases.map((c) => fieldStage(c));
  const n = (f: (key: string, tab: string) => boolean) => stages.filter((s) => f(s.key, s.tab)).length;
  const open = cases.filter((c) => c.assignment && c.state === 'FIELD_INSPECTION_REQUESTED').sort((a, b) => Date.parse(a.assignment!.dueAt) - Date.parse(b.assignment!.dueAt));
  const next = open[0]?.assignment?.dueAt;
  return [
    { label: 'Belum dimulai', value: n((_, tab) => tab === 'TODO'), hint: `${n((k) => k === 'REINSPECTION' || k === 'REWORK')} diminta ulang M.O`, tab: 'TODO', tone: 'warn' },
    { label: 'Giliran Anda', value: n((k) => k === 'RECOMMEND'), hint: 'Perlu rekomendasi penanganan', tab: 'ACTIVE', tone: 'info' },
    { label: 'Menunggu M.O', value: n((k) => k === 'INSPECTION_SENT' || k === 'REPAIR_SENT' || k === 'DECISION' || k === 'WORK_ORDER' || k === 'NOT_CONFIRMED'), hint: 'Sudah dikirim, menunggu keputusan', tab: 'ACTIVE', tone: 'neutral' },
    { label: 'Selesai', value: n((_, tab) => tab === 'DONE'), hint: 'Terverifikasi M.O atau ditutup', tab: 'DONE', tone: 'good' },
    { label: 'Tenggat terdekat', value: next ? new Date(next).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—', hint: `${cases.filter((c) => isOverdue(c)).length} lewat tenggat`, tab: 'TODO', tone: cases.some((c) => isOverdue(c)) ? 'warn' : 'neutral' }
  ];
}

export const AccountContext: React.FC<{
  role: 'OPS' | 'FE';
  account: AccountInfo | null;
  cases: ReportCase[];
  mode: GatewayMode;
  syncedAt: string | null;
  onTab: (tab: BoardTab) => void;
}> = ({ role, account, cases, mode, syncedAt, onTab }) => {
  const tiles = role === 'OPS' ? opsTiles(cases) : fieldTiles(cases);
  return (
    <section className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-navy p-4 sm:p-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]" aria-label="Konteks akun">
      <div className="flex items-start gap-3">
        {account?.avatarUrl && <img src={account.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full border border-line object-cover" />}
        <div className="min-w-0">
          <span className="rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand">
            {role === 'OPS' ? 'OPERATIONS MANAGER · M.O' : 'FIELD ENGINEER · F.E'}
          </span>
          <p className="mt-1.5 truncate font-bold text-fg">{account?.name ?? '—'}</p>
          <p className="truncate text-xs text-fg-muted">{account?.title}</p>
          <p className="truncate text-xs text-fg-muted">{account?.agency}</p>
          <p className="mt-1.5 text-[11px] text-fg-subtle">
            {mode === 'SERVER' ? 'Data server bersama · dimuat ulang tiap 15 detik' : 'DEMO OFFLINE di browser ini'}
            {syncedAt && <> · terakhir {new Date(syncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => t.tab && onTab(t.tab)}
            className="rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <span className="block text-[11px] font-semibold text-fg-muted">{t.label}</span>
            <span className={`mt-1 block text-2xl font-bold tabular-nums ${TONE[t.tone ?? 'neutral']}`}>{t.value}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-fg-subtle">{t.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
