import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, HelpCircle, RefreshCw, GitCommit } from 'lucide-react';
import { apiUrl, isStaticHost } from '../../services/api/client';
import type { HealthResponse, SyncStatus } from '../../types';

/**
 * Warns when the server behind this page runs older code than the repository or has
 * unapplied backend changes. Distinguishes between commit mismatch, modified backend
 * files, and unverified status so developers receive accurate instructions.
 */
export const ServerVersionBanner: React.FC = () => {
  const [server, setServer] = useState<HealthResponse['server'] | null>(null);
  const [checking, setChecking] = useState(false);
  // Consecutive failed checks. One miss is a restart in progress; two mean nobody can vouch for the code.
  const [failures, setFailures] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (isStaticHost()) return;
    setChecking(true);
    try {
      const res = await fetch(apiUrl('/api/health'), { cache: 'no-store' });
      if (res.ok) {
        const body = (await res.json()) as HealthResponse;
        setFailures(0);
        if (body.server) {
          setServer(body.server);
        } else {
          setServer({
            pid: 0,
            startedAt: body.timestamp ?? new Date().toISOString(),
            commit: null,
            currentCommit: null,
            stale: true,
            syncStatus: 'UNKNOWN',
            checkedAt: new Date().toISOString()
          });
        }
      } else {
        setServer(null);
        setFailures((n) => n + 1);
      }
    } catch {
      setServer(null);
      setFailures((n) => n + 1);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isStaticHost()) return;
    void fetchStatus();
    const id = window.setInterval(fetchStatus, 10000);
    return () => {
      window.clearInterval(id);
    };
  }, [fetchStatus]);

  if (!server && failures < 2) return null;

  // Resolve syncStatus, supporting backwards-compatibility with servers that only report stale
  const status: SyncStatus = !server
    ? 'UNKNOWN'
    : server.syncStatus ??
    (!server.stale
      ? 'SYNCED'
      : server.commit && server.currentCommit && server.commit !== server.currentCommit
        ? 'COMMIT_MISMATCH'
        : 'SOURCE_MODIFIED');

  if (status === 'SYNCED') return null;

  let message = '';
  let badgeText = 'PERINGATAN SINKRONISASI';
  let bannerClass = 'border-amber-500/40 bg-[#241a12] text-amber-100';
  let badgeClass = 'bg-amber-950/60 border-amber-600/40 text-amber-300';
  let Icon = AlertTriangle;

  if (status === 'COMMIT_MISMATCH') {
    badgeText = 'COMMIT BERBEDA';
    bannerClass = 'border-rose-500/50 bg-[#2a1416] text-rose-100';
    badgeClass = 'bg-rose-950/70 border-rose-600/50 text-rose-300';
    Icon = GitCommit;
    message = `Server pada ${window.location.host} (PID ${server.pid}) menjalankan commit "${server.commit ?? '?'}", namun repositori aktif berada pada commit "${server.currentCommit ?? '?'}". Jalankan "npm run dev:restart" agar runtime memuat kode baru.`;
  } else if (status === 'SOURCE_MODIFIED') {
    badgeText = 'KODE SERVER BERUBAH';
    bannerClass = 'border-amber-500/50 bg-[#251b14] text-amber-100';
    badgeClass = 'bg-amber-950/70 border-amber-600/50 text-amber-300';
    Icon = AlertTriangle;
    message = `Kode backend/domain telah diubah sejak server dimulai pada commit "${server.commit ?? '?'}" (PID ${server.pid}). Jalankan "npm run dev:restart" agar runtime memuat kode baru ("npm run dev" saja hanya menambah alias ke runtime lama).${server.changedFiles?.length ? ` Berubah: ${server.changedFiles.slice(0, 3).join(", ")}${server.changedFiles.length > 3 ? ` (+${server.changedFiles.length - 3})` : ""}.` : ""}`;
  } else if (!server) {
    badgeText = 'TIDAK DAPAT DIVERIFIKASI';
    bannerClass = 'border-yellow-500/50 bg-[#262312] text-yellow-100';
    badgeClass = 'bg-yellow-950/70 border-yellow-600/50 text-yellow-300';
    Icon = HelpCircle;
    message = `Server di ${window.location.host} tidak menjawab pemeriksaan versi (${failures}× berturut-turut), jadi kode yang berjalan tidak dapat diverifikasi. Periksa terminal runtime atau jalankan "npm run dev:status".`;
  } else if (status === 'UNKNOWN') {
    badgeText = 'STATUS TIDAK DIKETAHUI';
    bannerClass = 'border-yellow-500/50 bg-[#262312] text-yellow-100';
    badgeClass = 'bg-yellow-950/70 border-yellow-600/50 text-yellow-300';
    Icon = HelpCircle;
    message = `Sidik jari kode server di ${window.location.host} tidak dapat dibaca${server.changedFiles?.length ? ` (${server.changedFiles.slice(0, 3).join(', ')})` : ''}, jadi kesesuaian kode yang berjalan tidak dapat diverifikasi. Jalankan "npm run dev:restart".`;
  }

  const checkTime = server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString() : null;

  return (
    <div
      role="alert"
      className={`relative z-[2000] shrink-0 flex items-center justify-between gap-3 border-b px-4 py-2 text-xs ${bannerClass}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-amber-400" />
        <span className={`font-mono text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded border uppercase shrink-0 ${badgeClass}`}>
          {badgeText}
        </span>
        <span className="truncate text-[11px] leading-relaxed">{message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-[10px] opacity-80">
        {checkTime && <span>Pemeriksaan: {checkTime}</span>}
        <button
          type="button"
          onClick={() => void fetchStatus()}
          disabled={checking}
          title="Periksa ulang status server"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Periksa</span>
        </button>
      </div>
    </div>
  );
};
