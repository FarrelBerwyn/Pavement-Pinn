import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiUrl, isStaticHost } from '../../services/api/client';
import type { HealthResponse } from '../../types';

/**
 * Warns when the server behind this page runs older code than the repository (it was
 * started before the latest server/workflow change). Two localhost ports can then look
 * alike while enforcing different rules; the fix is restarting that server.
 */
export const ServerVersionBanner: React.FC = () => {
  const [server, setServer] = useState<HealthResponse['server'] | null>(null);

  useEffect(() => {
    if (isStaticHost()) return;
    let alive = true;
    const check = () =>
      fetch(apiUrl('/api/health'))
        .then((r) => (r.ok ? (r.json() as Promise<HealthResponse>) : null))
        // A server that does not report its version predates this check: older code by definition.
        .then((h) => alive && setServer(h ? h.server ?? { pid: 0, startedAt: h.timestamp, commit: null, currentCommit: null, stale: true } : null))
        .catch(() => undefined);
    void check();
    const id = window.setInterval(check, 60000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (!server?.stale) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[2000] flex items-center justify-center gap-2 border-b border-status-heavy/50 bg-[#2a1416] px-4 py-2 text-xs text-rose-100">
      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
      <span>
        Server di {window.location.host} menjalankan kode lama{server.commit ? ` (commit ${server.commit}; repositori sekarang ${server.currentCommit ?? '?'})` : ' (versi tidak dilaporkan)'}: data dan aturan alur kerja bisa berbeda dari port lain. Mulai ulang server ini agar aturan dan data sinkron.
      </span>
    </div>
  );
};
