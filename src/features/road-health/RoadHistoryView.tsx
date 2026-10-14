import React, { useState } from 'react';
import {
  History,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  ArrowRight,
  TrendingDown,
  Camera,
  MapPin,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { RoadSegment, DamageReport } from '../../types';

interface RoadHistoryViewProps {
  roadSegments: RoadSegment[];
  selectedSegment: RoadSegment | null;
  onSelectSegment: (segment: RoadSegment) => void;
  communityReports: DamageReport[];
  onClose?: () => void;
  onNavigateToSimulation?: (segment: RoadSegment) => void;
}

interface MaintenanceRecord {
  id: string;
  year: string;
  date: string;
  activityType: 'KONSTRUKSI_AWAL' | 'OVERLAY' | 'PATCHING' | 'REKONSTRUKSI' | 'SEALING' | 'MILLING';
  title: string;
  contractor: string;
  spkNumber: string;
  budget: string;
  volume: string;
  pciBefore: number;
  pciAfter: number;
  status: 'COMPLETED' | 'IN_WARRANTY' | 'SCHEDULED';
  warrantyEnd: string;
  notes: string;
  fwdDeflectionBefore: number; // micron
  fwdDeflectionAfter: number;
}

const SAMPLE_MAINTENANCE_HISTORY: Record<string, MaintenanceRecord[]> = {
  'seg-1': [
    {
      id: 'maint-101',
      year: '2025',
      date: '14 Feb 2025',
      activityType: 'PATCHING',
      title: 'Penambalan Lubang & Patching Cepat Cold Mix (Km 12+400)',
      contractor: 'PT Jaya Konstruksi Manggala Pratama',
      spkNumber: 'SPK/BBPJN-VI/2025/088',
      budget: 'Rp 145.000.000',
      volume: '180 m²',
      pciBefore: 42,
      pciAfter: 68,
      status: 'IN_WARRANTY',
      warrantyEnd: 'Feb 2026',
      notes: 'Penanganan lubang sedalam 4-7 cm akibat infiltrasi air hujan deras dan beban ODOL.',
      fwdDeflectionBefore: 460,
      fwdDeflectionAfter: 310
    },
    {
      id: 'maint-102',
      year: '2023',
      date: '10 Ags 2023',
      activityType: 'OVERLAY',
      title: 'Periodic Overlay Lapis Aus AC-WC Tebal 4.0 cm',
      contractor: 'PT Adhi Karya (Persero) Tbk',
      spkNumber: 'SPK/BBPJN-VI/2023/312',
      budget: 'Rp 1.420.000.000',
      volume: '3.200 m²',
      pciBefore: 55,
      pciAfter: 91,
      status: 'COMPLETED',
      warrantyEnd: 'Ags 2024',
      notes: 'Pelapisan ulang struktural setelah uji FWD menunjukkan penurunan daya dukung lapis pondasi.',
      fwdDeflectionBefore: 520,
      fwdDeflectionAfter: 220
    },
    {
      id: 'maint-103',
      year: '2021',
      date: '05 Mei 2021',
      activityType: 'SEALING',
      title: 'Crack Sealing & Pengisian Retak Blok Bitumen Karet',
      contractor: 'PT Hutama Karya Pemeliharaan',
      spkNumber: 'SPK/BBPJN-VI/2021/104',
      budget: 'Rp 280.000.000',
      volume: '1.450 m',
      pciBefore: 68,
      pciAfter: 82,
      status: 'COMPLETED',
      warrantyEnd: 'Mei 2022',
      notes: 'Pencegahan perembesan air tanah ke lapis pondasi atas (Base A).',
      fwdDeflectionBefore: 380,
      fwdDeflectionAfter: 305
    },
    {
      id: 'maint-104',
      year: '2019',
      date: '18 Nov 2019',
      activityType: 'KONSTRUKSI_AWAL',
      title: 'Rekonstruksi Penuh Full-Depth Asphalt AC-Base & AC-WC',
      contractor: 'PT Wijaya Karya (Persero) Tbk',
      spkNumber: 'KTR/BBPJN-VI/2019/001',
      budget: 'Rp 6.850.000.000',
      volume: '14.000 m²',
      pciBefore: 28,
      pciAfter: 98,
      status: 'COMPLETED',
      warrantyEnd: 'Nov 2021',
      notes: 'Rekonstruksi struktural koridor utama logistik industri berat.',
      fwdDeflectionBefore: 680,
      fwdDeflectionAfter: 180
    }
  ]
};

export const RoadHistoryView: React.FC<RoadHistoryViewProps> = ({
  roadSegments,
  selectedSegment,
  onSelectSegment,
  communityReports,
  onClose,
  onNavigateToSimulation
}) => {
  const [activeSegmentId, setActiveSegmentId] = useState<string>(selectedSegment?.id || roadSegments[0]?.id || 'seg-1');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSegment = roadSegments.find((s) => s.id === activeSegmentId) || roadSegments[0];

  // Retrieve or generate history for the current segment
  const historyList = SAMPLE_MAINTENANCE_HISTORY[currentSegment.id] || [
    {
      id: `maint-${currentSegment.id}-1`,
      year: '2024',
      date: '20 Okt 2024',
      activityType: 'PATCHING',
      title: `Pemeliharaan Rutin & Patching Cepat di ${currentSegment.name}`,
      contractor: 'PT Bina Marga Pemeliharaan Rutin',
      spkNumber: `SPK/PUPR/${currentSegment.id}/2024`,
      budget: 'Rp 185.000.000',
      volume: '240 m²',
      pciBefore: currentSegment.currentPci - 15,
      pciAfter: currentSegment.currentPci + 10,
      status: 'IN_WARRANTY',
      warrantyEnd: 'Okt 2025',
      notes: 'Penanganan kerusakan permukaan sebelum musim penghujan tinggi.',
      fwdDeflectionBefore: 440,
      fwdDeflectionAfter: 290
    },
    {
      id: `maint-${currentSegment.id}-2`,
      year: '2022',
      date: '12 Jul 2022',
      activityType: 'OVERLAY',
      title: `Overlay Berkala AC-WC 4cm ${currentSegment.name}`,
      contractor: 'PT Adhi Karya Infrastruktur',
      spkNumber: `SPK/PUPR/${currentSegment.id}/2022`,
      budget: 'Rp 1.150.000.000',
      volume: '2.800 m²',
      pciBefore: 48,
      pciAfter: 88,
      status: 'COMPLETED',
      warrantyEnd: 'Jul 2023',
      notes: 'Pelapisan ulang struktural perkerasan lentur.',
      fwdDeflectionBefore: 490,
      fwdDeflectionAfter: 210
    }
  ];

  const filteredHistory = historyList.filter((item) => {
    const matchesFilter = filterType === 'ALL' || item.activityType === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.spkNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Degradation trajectory simulation data (5 years)
  const pciTrend = [
    { year: '2021', pci: 88, status: 'Mantap', action: 'Pasca Overlay' },
    { year: '2022', pci: 82, status: 'Mantap', action: 'Inspeksi Rutin' },
    { year: '2023', pci: 73, status: 'Sedang', action: 'Crack Sealing' },
    { year: '2024', pci: 62, status: 'Sedang', action: 'Patching Ringan' },
    { year: '2025 (Kini)', pci: currentSegment.currentPci, status: currentSegment.currentPci > 70 ? 'Mantap' : currentSegment.currentPci > 50 ? 'Sedang' : 'Rusak Ringan', action: 'Perlu Penanganan' }
  ];

  return (
    <div className="min-h-full w-full bg-[#07090e] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Riwayat Penanganan & Log Siklus Jalan
            </h1>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Database BAST & FWD
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Rekam jejak pemeliharaan berkala, reonstruksi struktural, degradasi PCI historis, dan jaminan kontraktor PUPR.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <select
            value={activeSegmentId}
            onChange={(e) => {
              setActiveSegmentId(e.target.value);
              const seg = roadSegments.find((s) => s.id === e.target.value);
              if (seg) onSelectSegment(seg);
            }}
            className="bg-[#121724] border border-white/15 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 transition-colors cursor-pointer shadow-md"
          >
            {roadSegments.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.name} ({seg.kmPost})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Key Metrics & Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>PCI Saat Ini</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{currentSegment.currentPci} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
          <p className="text-[10px] text-amber-300 mt-0.5">Kondisi {currentSegment.currentPci > 70 ? 'Mantap' : currentSegment.currentPci > 50 ? 'Sedang' : 'Kritis'}</p>
        </div>

        <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Total Penanganan</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{historyList.length} <span className="text-xs font-normal text-slate-400">Kegiatan</span></div>
          <p className="text-[10px] text-slate-400 mt-0.5">Rentang 2019 - 2025</p>
        </div>

        <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Jaminan Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">1 <span className="text-xs font-normal text-slate-400">SPK Retensi</span></div>
          <p className="text-[10px] text-emerald-300 mt-0.5">Masa garansi s/d Feb 2026</p>
        </div>

        <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
            <span>Beban Historis</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">— <span className="text-xs font-normal text-slate-400">ESAL/thn</span></div>
          <p className="text-[10px] text-rose-300 mt-0.5">Data ESAL belum tersedia</p>
        </div>
      </div>

      {/* 3. Multi-Year Degradation Curve & Comparative Trajectory */}
      <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span>Tren Riwayat Penurunan Kondisi PCI (Tahun 2021 - 2025)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluasi kinerja struktural perkerasan terhadap laju akumulasi beban lalu lintas aktual.
            </p>
          </div>
          {onNavigateToSimulation && (
            <button
              onClick={() => onNavigateToSimulation(currentSegment)}
              className="px-3 py-1.5 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Simulasi Prediksi Lanjut (PINN)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Timeline Degradation Bar Chart */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 pt-2">
          {pciTrend.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center bg-[#141a29] border border-white/5 rounded-xl p-3 text-center">
              <span className="text-[11px] font-mono text-slate-400 mb-2">{item.year}</span>
              <div className="w-full bg-slate-800 rounded-full h-3 mb-2 relative overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.pci >= 80 ? 'bg-emerald-400' : item.pci >= 60 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${item.pci}%` }}
                />
              </div>
              <span className="text-sm sm:text-base font-black text-white">{item.pci}</span>
              <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-full">{item.status}</span>
              <span className="text-[9px] text-amber-300/80 mt-0.5 truncate max-w-full font-mono">{item.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter & Search Controls for History Timeline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {['ALL', 'PATCHING', 'OVERLAY', 'SEALING', 'KONSTRUKSI_AWAL'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-[#121724] text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {type === 'ALL'
                ? 'Semua Jenis Penanganan'
                : type === 'PATCHING'
                ? 'Patching / Tambal Lubang'
                : type === 'OVERLAY'
                ? 'Overlay AC-WC'
                : type === 'SEALING'
                ? 'Crack Sealing'
                : 'Konstruksi Awal'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kontraktor / no SPK..."
            className="w-full bg-[#121724] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* 5. Detailed Timeline Cards */}
      <div className="space-y-3">
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="bg-[#0e1320] border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-3"
          >
            {/* Top row: Year Badge, Title, Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-mono font-black bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl shadow-sm">
                  {item.year}
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
                <span className="text-xs font-bold text-white">{item.title}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                    item.status === 'IN_WARRANTY'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600/30'
                  }`}
                >
                  {item.status === 'IN_WARRANTY' ? 'Jaminan Aktif (Retensi)' : 'BAST Selesai'}
                </span>
              </div>
            </div>

            {/* Middle row: Technical details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#141a29] p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 text-[10px] block">Kontraktor Pelaksana</span>
                <span className="font-bold text-white flex items-center gap-1 truncate mt-0.5">
                  <UserCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  {item.contractor}
                </span>
              </div>

              <div className="bg-[#141a29] p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 text-[10px] block">No. SPK & Anggaran</span>
                <span className="font-bold text-slate-200 truncate mt-0.5 block font-mono text-[11px]">
                  {item.spkNumber}
                </span>
                <span className="text-amber-400 font-mono font-bold text-[10px]">{item.budget}</span>
              </div>

              <div className="bg-[#141a29] p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 text-[10px] block">Volume & Delta PCI</span>
                <div className="flex items-center space-x-1.5 mt-0.5 font-bold">
                  <span className="text-white">{item.volume}</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-rose-400">{item.pciBefore}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="text-emerald-400">{item.pciAfter}</span>
                </div>
              </div>

              <div className="bg-[#141a29] p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 text-[10px] block">Uji FWD Defleksi ($D_0$)</span>
                <div className="flex items-center space-x-1.5 mt-0.5 font-mono text-[11px] font-bold">
                  <span className="text-rose-400">{item.fwdDeflectionBefore}&mu;m</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="text-emerald-400">{item.fwdDeflectionAfter}&mu;m</span>
                </div>
              </div>
            </div>

            {/* Bottom row: Notes & Remarks */}
            <div className="text-xs text-slate-300 bg-[#121724]/80 p-2.5 rounded-xl border border-white/5 flex items-start gap-2">
              <FileCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{item.notes} &bull; Masa Pemeliharaan Garansi: s/d {item.warrantyEnd}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
