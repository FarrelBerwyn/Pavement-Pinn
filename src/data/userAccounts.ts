import { UserRole } from '../types';

export interface UserAccount {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  agency: string;
  agencyCode: string;
  email: string;
  nip: string;
  clearanceLevel: string;
  avatarUrl: string;
  layoutStyle?: 'MODERN_APP' | 'CLASSIC_PORTAL';
  allowedScopes: string[];
  restrictedScopes: string[];
}

export const USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'Ir. Ahmad Subagyo, M.T.',
    title: 'Senior Pavement Civil Engineer (Portal Klasik)',
    role: 'FIELD_ENGINEER',
    agency: 'Balai Besar Pelaksanaan Jalan Nasional (BBPJN DKI-Jabar)',
    agencyCode: 'BBPJN-PU',
    email: 'ahmad.subagyo@pu.go.id',
    nip: '19820415 200801 1 003',
    clearanceLevel: 'Level 3 - Spesialis Keteknikan Jalan (Portal Klasik)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'CLASSIC_PORTAL',
    allowedScopes: [
      'Visualisasi Tensor Regangan Asphalt (εt & εv)',
      'Profil Basin Lendutan FWD (Falling Weight Deflectometer)',
      'Simulator Parameter Elastisitas Burmister (E1, Es)',
      'Kalkulator Tebal Lapisan Tambah (Overlay AC-WC)',
      'Diagnostik Loss Objective Function PINN (LPDE & LData)',
      'Data Publik: Peta Jalan & PCI Rata-rata'
    ],
    restrictedScopes: [
      'Streaming Kamera ANPR CCTV Plat Nomor (Khusus Kemenhub)',
      'Sistem Penilangan & Denda WIM (Khusus Operasional WIM)',
      'Proyeksi Alokasi Anggaran APBN 5 Tahun (Khusus Bappenas/PU)'
    ]
  },
  {
    id: 'USR-006',
    name: 'Ir. Ahmad Subagyo, M.T.',
    title: 'Field Civil Engineer (App Lapangan PUPR)',
    role: 'FIELD_ENGINEER',
    agency: 'Balai Besar Pelaksanaan Jalan Nasional (BBPJN DKI-Jabar)',
    agencyCode: 'BBPJN-FE',
    email: 'ahmad.subagyo.lapangan@pu.go.id',
    nip: '19820415 200801 1 003 (Insinyur Lapangan)',
    clearanceLevel: 'Level 3 - Spesialis Keteknikan Jalan & Verifikasi Lapangan (Mobile App)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'MODERN_APP',
    allowedScopes: [
      'Verifikasi & Validasi Laporan Kerusakan Warga Lapangan (Status PENDING → VERIFIED → SPK)',
      'Profil Basin Lendutan FWD (Falling Weight Deflectometer w(r)) & Defleksi D0',
      'Tensor Regangan Asphalt (εt & εv) vs Batas Ijin AASHTO / Bina Marga',
      'Kalkulator Desain Lapisan Tambah (Tebal Overlay AC-WC, Volume Hotmix & Biaya)',
      'Penerbitan Surat Perintah Kerja (SPK) & Disposisi Tim Kontraktor Lapangan',
      'Export & Cetak PDF Dokumen Rekayasa Sipil Resmi PUPR',
      'Input & Buat Laporan Kerusakan Baru Langsung dari Lokasi (GPS)',
      'Simulator Parameter Fisika PINN & Kalibrasi Nilai CBR Tanah Dasar',
      'Akses Peta Geospasial, Telemetri WIM & Data Kerusakan Jalan'
    ],
    restrictedScopes: [
      'Streaming Kamera ANPR CCTV Plat Nomor (Khusus Kemenhub/BPTD)',
      'Sistem Penilangan & Denda WIM (Khusus Operasional WIM)',
      'Proyeksi Alokasi Anggaran APBN 5 Tahun (Khusus Bappenas/Kementerian PU)'
    ]
  },
  {
    id: 'USR-002',
    name: 'Drs. Hendra Gunawan, S.Si.',
    title: 'Kepala Bidang Operasional & Penindakan WIM (Portal Klasik)',
    role: 'OPERATIONS_MANAGER',
    agency: 'Balai Pengelola Transportasi Darat (BPTD Wilayah VIII)',
    agencyCode: 'BPTD-HUB',
    email: 'hendra.gunawan@dephub.go.id',
    nip: '19791102 200502 1 001',
    clearanceLevel: 'Level 2 - Penyidik & Pengawas Operasional WIM (Portal Klasik)',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'CLASSIC_PORTAL',
    allowedScopes: [
      'Telemetry Real-Time Sensor Weigh-In-Motion (WIM) 24/7',
      'Peringatan Dini Alert Violasi Truk ODOL (>20 Ton)',
      'Kamera ANPR CCTV Plat Nomor & Tonase Beban As',
      'Tombol Penindakan: Transfer Muatan & Pengalihan Rute',
      'Rekapitulasi Sanksi Administratif & Denda Tilang',
      'Data Publik: Peta Jalan & PCI Rata-rata'
    ],
    restrictedScopes: [
      'Perhitungan Modulus Elastisitas Burmister (Khusus Field Eng.)',
      'Perumusan Kebijakan Pagu Anggaran APBN (Khusus Eksekutif)'
    ]
  },
  {
    id: 'USR-008',
    name: 'Drs. Hendra Gunawan, S.Si.',
    title: 'Operations Manager (App Operasional WIM & Dephub)',
    role: 'OPERATIONS_MANAGER',
    agency: 'Balai Pengelola Transportasi Darat (BPTD Wilayah VIII) & Kemenhub',
    agencyCode: 'BPTD-OPS',
    email: 'hendra.gunawan.operasional@dephub.go.id',
    nip: '19791102 200502 1 001 (Pengawas Lapangan WIM)',
    clearanceLevel: 'Level 2 - Pengawas Operasional WIM & Penindakan ODOL (Modern App)',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'MODERN_APP',
    allowedScopes: [
      'Input & Edit Laporan Kerusakan Jalan Lapangan (Hak Penuh seperti Budi Santoso)',
      'Akses Seluruh Survei & Rekayasa Lapangan (Sama dengan Ir. Ahmad Subagyo)',
      'Live Streaming Telemetri Sensor Weigh-In-Motion (WIM) 24/7 & Pemindaian ANPR',
      'Sinyal Keputusan Cepat: Status Alert (🔴 Merah / 🟡 Kuning / 🟢 Hijau)',
      'Kalkulator Ambang Batas Tonase Dinamis (Penyesuaian Beban terhadap Hujan & CBR)',
      'Aksi Penindakan: Penerbitan Berita Acara Transfer Muatan (BATM) Truk ODOL >20 Ton',
      'Penerbitan Surat Perintah Pengalihan Rute Wajib (Mandatory Rerouting Order)',
      'Penilangan Elektronik (ETLE WIM) & Rekapitulasi Denda Pelanggaran Overload',
      'Korelasi Kerusakan Jalan Terhadap Akumulasi Lintasan Truk Overload WIM',
      'Export & Cetak PDF Dokumen Sinyal WIM & Berita Acara Penindakan Resmi',
      'Intel OpenVINO Edge Telemetry Pos Jembatan Timbang (Latensi <10 ms, NPU/CPU)'
    ],
    restrictedScopes: [
      'Kalibrasi Mikro Sensor Deflektometer FWD (Khusus Field Engineer)',
      'Formulasi Pagu Anggaran APBN 5 Tahun (Khusus Bappenas & Eksekutif PU)'
    ]
  },
  {
    id: 'USR-003',
    name: 'Dr. Ir. Retno Wulandari, M.Sc.',
    title: 'Direktur Ketahanan Perkerasan Jalan & Anggaran (Portal Klasik)',
    role: 'POLICY_MAKER',
    agency: 'Direktorat Jenderal Bina Marga & Bappenas RI',
    agencyCode: 'DITJEN-BM',
    email: 'retno.wulandari@bappenas.go.id',
    nip: '19750318 199903 2 002',
    clearanceLevel: 'Level 1 - Otoritas Eksekutif & Pengambil Kebijakan APBN (Portal Klasik)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'CLASSIC_PORTAL',
    allowedScopes: [
      'Proyeksi Anggaran Pemeliharaan Jalan 5 Tahun (Rp Miliar)',
      'Matriks Disparitas PCI Antar-Provinsi & Koridor Logistik',
      'Analisis Cost-Benefit & Penghematan Fiskal Zero ODOL 2027',
      'Laporan Naratif Eksekutif Otomatis Gemini GenAI',
      'Export Laporan Resmi Kebijakan Format PDF',
      'Data Publik: Peta Jalan & PCI Rata-rata'
    ],
    restrictedScopes: [
      'Kalibrasi Sensor FWD Lapangan (Khusus Field Eng.)',
      'Manual Override Sensor WIM Individual (Khusus Ops Manager)'
    ]
  },
  {
    id: 'USR-007',
    name: 'Dr. Ir. Retno Wulandari, M.Sc.',
    title: 'Executive Policy Maker (App Eksekutif Bappenas & Bina Marga)',
    role: 'POLICY_MAKER',
    agency: 'Kementerian PPN/Bappenas & Ditjen Bina Marga PU',
    agencyCode: 'BAPPENAS-PM',
    email: 'retno.wulandari.eksekutif@bappenas.go.id',
    nip: '19750318 199903 2 002 (Otoritas Eksekutif)',
    clearanceLevel: 'Level 1 - Otoritas Eksekutif & Pengambil Kebijakan APBN (Modern App)',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    layoutStyle: 'MODERN_APP',
    allowedScopes: [
      'Dashboard Indeks Kerusakan Makro & Proyeksi 5 Tahun PCI',
      'Simulator Skenario Kebijakan Fiskal Makro & Penegakan Zero ODOL 2027',
      'Matriks Pagu Anggaran Preservasi & Koridor Strategis Nasional',
      'GenAI Executive Policy Brief (Nota Dinas Menteri, RDP DPR, Memo Antar-Lembaga)',
      'Ekspor Resmi PDF Dokumen Kebijakan & Ringkasan Eksekutif',
      'Estimasi Kerugian Ekonomi Nasional Truk ODOL (Rp 43.4T - 47.43T / Tahun)',
      'Lensa Respon Warga: Monitoring & Disposisi Cepat Laporan Publik ke PPK',
      'Peta Geospasial Koridor Jalan & Pemantauan Sensor WIM Nasional'
    ],
    restrictedScopes: [
      'Kalibrasi Mikro Sensor FWD Lapangan (Khusus Field Engineer)',
      'Penilangan Manual & Penahanan Fisik Truk Jembatan Timbang (Khusus Ops Manager)'
    ]
  },
  {
    id: 'USR-004',
    name: 'Budi Santoso, S.T.',
    title: 'Warga Pelapor Aktif (Lapor & Edit)',
    role: 'PUBLIC_REPORTER',
    agency: 'Komunitas Pengguna Jalan & Logistik',
    agencyCode: 'WARGA-AKTIF',
    email: 'budi.santoso@penggunajalan.or.id',
    nip: 'Pelapor Terverifikasi #4829',
    clearanceLevel: 'Level 4 - Pelapor Aktif (Bisa Lapor & Edit Laporannya)',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    allowedScopes: [
      'Input & Buat Laporan Kerusakan Baru (Foto, Kedalaman, Luas)',
      'Edit & Perbarui Laporan Yang Dibuat Sendiri',
      'Otomasisasi Analisis Korelasi Beban Truk ODOL WIM',
      'Akses Feed Laporan Komunitas & Peta Geospasial',
      'Dukungan (Upvote) & Monitoring Status Perbaikan Jalan',
      'Data Publik: Peta Jalan & PCI Rata-rata'
    ],
    restrictedScopes: [
      'Manual Calibration Sensor FWD (Khusus Field Engineer)',
      'Otorisasi Penindakan & Penilangan WIM (Khusus Operations Manager)',
      'Formulasi Pagu Anggaran APBN 5 Tahun (Khusus Policy Maker)'
    ]
  },
  {
    id: 'USR-005',
    name: 'Siti Aminah, S.E.',
    title: 'Warga Pengamat Baru (Lihat & Lapor Baru)',
    role: 'PUBLIC_VIEWER',
    agency: 'Masyarakat Pengamat Trans-Jawa',
    agencyCode: 'WARGA-BARU',
    email: 'siti.aminah@pengamatjalan.id',
    nip: 'Pengamat Terdaftar #1024',
    clearanceLevel: 'Level 5 - Warga Baru (Melihat & Bisa Lapor Baru)',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    allowedScopes: [
      'Akses & Lihat Seluruh Feed Laporan Kerusakan Jalan & Analisis WIM',
      'Input & Buat Laporan Kerusakan Baru',
      'Edit Laporan (Tersedia setelah membuat laporan sendiri)',
      'Visualisasi Peta Geospasial Laporan Komunitas',
      'Pencarian & Filtering Laporan Per Wilayah',
      'Data Publik: Peta Jalan & PCI Rata-rata'
    ],
    restrictedScopes: [
      'Kalibrasi Tensor PINN (Khusus Engineer)',
      'Penindakan Tilang Truk WIM (Khusus Kemenhub)'
    ]
  }
];
