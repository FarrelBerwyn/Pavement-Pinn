import React from 'react';
import { AuditLogItem } from '../types';
import { FileCheck, X } from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLogItem[];
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  auditLogs
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[85vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Log Audit Trail & Tata Kelola Keputusan RBAC
              </h2>
              <p className="text-xs text-slate-300">
                Catatan Historis Simulasi PINN, Pengalihan Rute, dan Penindakan WIM Terintegrasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto bg-slate-950/80 rounded-2xl border border-white/10">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900/60 border-b border-white/10">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Role & Instansi</th>
                <th className="p-3">Ruas Jalan</th>
                <th className="p-3">Jenis Aksi</th>
                <th className="p-3">Rincian Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-3 font-mono">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.userRole === 'FIELD_ENGINEER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : log.userRole === 'OPERATIONS_MANAGER'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {log.userAgency}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white">{log.segmentName}</td>
                  <td className="p-3 font-mono font-bold text-cyan-400">{log.action}</td>
                  <td className="p-3 text-slate-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Total Log Tersimpan: {auditLogs.length} Entri
          </span>
          <button
            onClick={onClose}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
