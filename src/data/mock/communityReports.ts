import { DamageReport } from '../../types';
import { normalizeBasePath } from '../../constants/deployment';
import { assignReferencePhotos, withoutStockRepairPhoto, withReferencePhoto } from '../../domain/reports/datasetImages';

const SEED_REPORTS: DamageReport[] = [
  // ==========================================
  // KARAWANG REGION (INDUSTRIAL & ARTERIAL CORRIDORS)
  // ==========================================
  {
    id: 'REP-KRW-001',
    reporterName: 'Budi Santoso, S.T.',
    reporterRole: 'Warga Perumahan Galuh Mas Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-20 14:15:30',
    segmentId: 'JLN-KRW-KIIC-1',
    segmentName: 'Jl. Akses KIIC - Karawang Barat (Kawasan Industri KIIC)',
    corridor: 'Kawasan Industri KIIC - Interchange Karawang Barat',
    province: 'Jawa Barat',
    coordinates: [-6.3350, 107.2780],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Dalam (Pothole)',
    severity: 'CRITICAL',
    estimatedDepthCm: 18,
    estimatedAreaM2: 5.5,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    description: 'Lubang menganga sedalam 18 cm tepat di depan gerbang utama KIIC Karawang Barat. Sangat membahayakan pengendara motor dan truk trailer logistik saat hujan dan malam hari.',
    status: 'PENDING',
    upvotesCount: 84,
    userUpvoted: true,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-21',
      repairMethod: 'Hotmix Asphalt Overlay & Patching AC-WC 6cm',
      repairedPciImprovement: 'PCI 28 -> 88 (Mulus & Rata)',
      engineerNote: 'Simulasi rekonstruksi penambalan hotmix lapis aus (DEMO).',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-002',
    reporterName: 'Ratna Paramitha, S.E.',
    reporterRole: 'Karyawan Swasta Suryacipta Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-20 09:30:10',
    segmentId: 'JLN-KRW-SURYACIPTA',
    segmentName: 'Jl. Surya Utama - Kawasan Industri Suryacipta (Karawang Timur)',
    corridor: 'Arteri Industri Suryacipta - Ciampel Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3720, 107.3380],
    damageType: 'RUTTING',
    damageTypeLabel: 'Ambles & Deformasi Alur (Rutting)',
    severity: 'SEVERE',
    estimatedDepthCm: 14,
    estimatedAreaM2: 12.0,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
    description: 'Aspal amblas beralur panjang di lajur lambat Jl. Surya Utama depan ruko komersial Suryacipta Karawang Timur. Mobil dan truk sering tersangkut.',
    status: 'PENDING',
    upvotesCount: 62,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-21',
      repairMethod: 'Milling & Resurfacing Asphalt Concrete Binder Course',
      repairedPciImprovement: 'PCI 35 -> 85 (Kondisi Prima)',
      engineerNote: 'Perataan alur deformasi dengan pengikisan aspal lama dan pelapisan ulang binder course.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-003',
    reporterName: 'Agus Purnomo',
    reporterRole: 'Supir Logistik KIM Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-19 16:45:00',
    segmentId: 'JLN-KRW-KIM',
    segmentName: 'Jl. Mitra Raya - Kawasan Industri Mitra Karawang (KIM)',
    corridor: 'Kawasan Industri KIM - Parungmulya Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3650, 107.3520],
    damageType: 'ALLIGATOR_CRACK',
    damageTypeLabel: 'Retak Buaya (Alligator Cracking)',
    severity: 'CRITICAL',
    estimatedDepthCm: 9,
    estimatedAreaM2: 18.5,
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
    description: 'Retak buaya saling sambung meluas lebih dari 20 meter di akses utama Jl. Mitra Raya KIM Karawang Timur. Lapisan aspal sudah rapuh dan mulai ambrol.',
    status: 'PENDING',
    upvotesCount: 95,
    userUpvoted: true,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-20',
      repairMethod: 'Full-Depth Reclamation & Geogrid Reinforcement',
      repairedPciImprovement: 'PCI 22 -> 92 (Sangat Baik)',
      engineerNote: 'Penguatan pondasi agregat kelas A dan pemasangan geogrid sebelum pengaspalan ulang.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-004',
    reporterName: 'Dewi Lestari',
    reporterRole: 'Warga Kosambi Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-19 11:20:00',
    segmentId: 'JLN-KRW-PANTURA-KLARI',
    segmentName: 'Jl. Raya Klari - Kosambi (Jalur Arteri Pantura Karawang)',
    corridor: 'Arteri Primer Pantura Klari - Kosambi Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3480, 107.3650],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Bertubi-tubi (Potholes Cluster)',
    severity: 'CRITICAL',
    estimatedDepthCm: 22,
    estimatedAreaM2: 8.2,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
    description: 'Deretan lubang dalam berlumpur sepanjang 50 meter di Jl. Raya Klari-Kosambi KM 8. Sering memicu kemacetan parah dan kecelakaan roda dua.',
    status: 'PENDING',
    upvotesCount: 118,
    userUpvoted: true,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-20',
      repairMethod: 'Rigid Pavement Concrete Patching Fast Track 24 Jam',
      repairedPciImprovement: 'PCI 19 -> 90 (Tuntas)',
      engineerNote: 'Pengecoran beton cepat kering mutu FS 45 untuk menangani beban tonase tinggi Pantura.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-005',
    reporterName: 'Hendra Gunawan',
    reporterRole: 'Pengemudi Ojek Online Karawang Kota',
    reporterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-18 20:10:45',
    segmentId: 'JLN-KRW-AYANI',
    segmentName: 'Jl. Jenderal Ahmad Yani - Bypass Karawang Kota',
    corridor: 'Arteri Pusat Kota Karawang - Pemda Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3030, 107.3020],
    damageType: 'CORRUGATION',
    damageTypeLabel: 'Aspal Bergelombang (Corrugation)',
    severity: 'MODERATE',
    estimatedDepthCm: 8,
    estimatedAreaM2: 15.0,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=800',
    description: 'Gelombang aspal tinggi di dekat lampu merah Bypass Ahmad Yani Karawang Kota membuat laju kendaraan tidak stabil.',
    status: 'PENDING',
    upvotesCount: 47,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-19',
      repairMethod: 'Cold Milling Leveling & Thin Hotmix Overlay (THO)',
      repairedPciImprovement: 'PCI 45 -> 88 (Rata & Nyaman)',
      engineerNote: 'Pengikisan gelombang aspal lama dan perataan permukaan menggunakan aspal modifikasi polimer.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-006',
    reporterName: 'Tri Wahyuni',
    reporterRole: 'Warga Galuh Mas Karawang Barat',
    reporterAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-18 15:40:00',
    segmentId: 'JLN-KRW-GALUHMAS',
    segmentName: 'Jl. Arteri Galuh Mas Boulevard (Karawang Barat)',
    corridor: 'Kawasan Hunian & Komersial Galuh Mas Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3180, 107.2920],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Tepi Jalan (Edge Pothole)',
    severity: 'SEVERE',
    estimatedDepthCm: 16,
    estimatedAreaM2: 4.8,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    description: 'Lubang dalam di bahu jalan belokan Galuh Mas menuju bundaran Mall Karawang Central Plaza. Genangan air hujan menutupi lubang sehingga tidak terlihat.',
    status: 'PENDING',
    upvotesCount: 53,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-19',
      repairMethod: 'Edge Asphalt Compaction & Drain Inlet Realignment',
      repairedPciImprovement: 'PCI 38 -> 86 (Aman)',
      engineerNote: 'Penutupan lubang bahu jalan dan normalisasi saluran tali air drainase tepi.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-007',
    reporterName: 'Fajar Nugroho',
    reporterRole: 'Pengendara Komuter Tanjungpura Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-18 07:15:20',
    segmentId: 'JLN-KRW-TANJUNGPURA',
    segmentName: 'Jl. Lingkar Luar Tanjungpura - Klari (Bypass Karawang)',
    corridor: 'Jalur Lingkar Luar Non-Tol Tanjungpura Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.2880, 107.2750],
    damageType: 'SUBSIDENCE',
    damageTypeLabel: 'Penurunan Badan Jalan (Subsidence)',
    severity: 'CRITICAL',
    estimatedDepthCm: 25,
    estimatedAreaM2: 14.5,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
    description: 'Badan jalan lingkar luar Tanjungpura ambles sedalam 25 cm ke arah bahu jalan dekat jembatan perbatasan Karawang-Bekasi.',
    status: 'PENDING',
    upvotesCount: 91,
    userUpvoted: true,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-19',
      repairMethod: 'Subgrade Soil Grouting & Heavy Asphalt Reconstruction',
      repairedPciImprovement: 'PCI 20 -> 89 (Kokoh & Rata)',
      engineerNote: 'Injeksi semen grouting stabilisasi tanah dasar sebelum rekonstruksi struktur perkerasan jalan.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-008',
    reporterName: 'Rian Pratama',
    reporterRole: 'Warga Telukjambe Timur Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-17 14:00:00',
    segmentId: 'JLN-KRW-GALUHMAS',
    segmentName: 'Jl. Sirnabaya - Telukjambe Timur (Karawang)',
    corridor: 'Konektor Telukjambe - Unsika Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3260, 107.3050],
    damageType: 'ALLIGATOR_CRACK',
    damageTypeLabel: 'Retak Rambut Halus (Fine Cracking)',
    severity: 'LIGHT',
    estimatedDepthCm: 3,
    estimatedAreaM2: 4.0,
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
    description: 'Mulai timbul retak-retak rambut tipis di lajur kiri jalan akses Telukjambe dekat gerbang kampus Unsika Karawang.',
    status: 'PENDING',
    upvotesCount: 16,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-18',
      repairMethod: 'Slurry Seal Protective Surface Treatment',
      repairedPciImprovement: 'PCI 58 -> 94 (Sempurna)',
      engineerNote: 'Aplikasi peremaja aspal slurry seal untuk mencegah penetrasi air hujan ke pori jalan.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-009',
    reporterName: 'Nurul Hidayah',
    reporterRole: 'Karyawan Kawasan KIIC Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-17 10:10:00',
    segmentId: 'JLN-KRW-KIIC-1',
    segmentName: 'Jl. Trans Heksa - Kawasan Industri KIIC (Karawang Barat)',
    corridor: 'Kawasan Industri KIIC Karawang Barat',
    province: 'Jawa Barat',
    coordinates: [-6.3420, 107.2750],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Aspal Sedang',
    severity: 'MODERATE',
    estimatedDepthCm: 9,
    estimatedAreaM2: 3.5,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    description: 'Terdapat dua lubang berurutan di pertigaan Jl. Trans Heksa KIIC Karawang. Sudah diberi tanda kerucut oranye oleh pihak keamanan.',
    status: 'PENDING',
    upvotesCount: 34,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-18',
      repairMethod: 'Semi-Permanent Cold Patch Injection & Asphalt Sealing',
      repairedPciImprovement: 'PCI 42 -> 87 (Mulus)',
      engineerNote: 'Penambalan cepat presisi dengan aspal emulsi polimer.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-010',
    reporterName: 'Bambang Kusuma',
    reporterRole: 'Pengusaha Angkutan Logistik Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-16 18:25:00',
    segmentId: 'JLN-KRW-SURYACIPTA',
    segmentName: 'Jl. Surya Madya - Kawasan Suryacipta (Karawang Timur)',
    corridor: 'Kawasan Industri Suryacipta',
    province: 'Jawa Barat',
    coordinates: [-6.3790, 107.3450],
    damageType: 'RUTTING',
    damageTypeLabel: 'Ambles Parah Jalur Truk',
    severity: 'SEVERE',
    estimatedDepthCm: 15,
    estimatedAreaM2: 11.2,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
    description: 'Deformasi alur bekas roda ban truk tronton kontainer sangat dalam di lajur masuk pergudangan Suryacipta Karawang Timur.',
    status: 'PENDING',
    upvotesCount: 58,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-17',
      repairMethod: 'Heavy Duty Asphalt Re-paving AC-BC 10cm',
      repairedPciImprovement: 'PCI 30 -> 86 (Bebas Deformasi)',
      engineerNote: 'Peningkatan daya dukung struktur jalan dengan campuran aspal tahan beban gandar berat.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-011',
    reporterName: 'Dian Permatasari',
    reporterRole: 'Guru Sekolah Dasar Karawang Kulon',
    reporterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-16 08:45:00',
    segmentId: 'JLN-KRW-AYANI',
    segmentName: 'Jl. Tuparev - Dekat Stasiun Karawang Kota',
    corridor: 'Akses Perdagangan Tuparev - Stasiun Karawang',
    province: 'Jawa Barat',
    coordinates: [-6.3010, 107.3060],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Aspal Dekat Zebra Cross',
    severity: 'LIGHT',
    estimatedDepthCm: 5,
    estimatedAreaM2: 2.2,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    description: 'Lubang kecil mulai terbentuk di dekat penyeberangan anak sekolah Jl. Tuparev Karawang.',
    status: 'REPAIRED',
    upvotesCount: 22,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-17',
      repairMethod: 'Cold Patch Asphalt Injection',
      repairedPciImprovement: 'PCI 40 -> 82 (Mulus)',
      engineerNote: 'Telah diperbaiki (contoh DEMO).',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-KRW-012',
    reporterName: 'Wawan Setiawan',
    reporterRole: 'Warga Rengasdengklok Karawang',
    reporterAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-15 13:20:00',
    segmentId: 'JLN-KRW-TANJUNGPURA',
    segmentName: 'Jl. Raya Rengasdengklok - Karawang',
    corridor: 'Konektor Karawang Kota - Rengasdengklok',
    province: 'Jawa Barat',
    coordinates: [-6.2200, 107.2880],
    damageType: 'CORRUGATION',
    damageTypeLabel: 'Aspal Bergelombang & Keriting',
    severity: 'MODERATE',
    estimatedDepthCm: 7,
    estimatedAreaM2: 9.8,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=800',
    description: 'Jalanan bergelombang di jalur Rengasdengklok Karawang menyebabkan getaran kuat pada roda kendaraan roda empat.',
    status: 'PENDING',
    upvotesCount: 29,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-16',
      repairMethod: 'Leveling & Overlay AC-WC 4cm',
      repairedPciImprovement: 'PCI 48 -> 85 (Mulus Nyaman)',
      engineerNote: 'Penataan ulang elevasi perkerasan jalan poros Rengasdengklok.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },

  // ==========================================
  // JAKARTA AREA (A FEW SELECT REPORTS)
  // ==========================================
  {
    id: 'REP-JKT-001',
    reporterName: 'Dra. Ratna Sarumpaet',
    reporterRole: 'Warga Cilandak Jakarta Selatan',
    reporterAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-14 16:45:20',
    segmentId: 'JLN-JAKARTA-02',
    segmentName: 'Jl. TB Simatupang - Fatmawati/Cilandak (Jakarta Selatan)',
    corridor: 'Arteri Lingkar Luar Jakarta (TB Simatupang)',
    province: 'DKI Jakarta',
    coordinates: [-6.2915, 106.8234],
    damageType: 'RUTTING',
    damageTypeLabel: 'Ambles & Deformasi Alur (Rutting)',
    severity: 'SEVERE',
    estimatedDepthCm: 16,
    estimatedAreaM2: 9.8,
    photoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
    description: 'Aspal melepuh dan terkelupas sepanjang 10 meter di persimpangan Fatmawati - TB Simatupang Jakarta Selatan.',
    status: 'PENDING',
    upvotesCount: 42,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-15',
      repairMethod: 'Asphalt Scraping & High Modulus Asphalt Concrete (HMAC)',
      repairedPciImprovement: 'PCI 32 -> 87 (Mulus)',
      engineerNote: 'Pelapisan aspal elastis berdaya tahan tinggi.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-JKT-002',
    reporterName: 'Hendra Wijaya',
    reporterRole: 'Pengemudi Ojol Jakarta Selatan',
    reporterAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-13 11:10:00',
    segmentId: 'JLN-JAKARTA-02',
    segmentName: 'Jl. Gatot Subroto - Kuningan Barat (Jakarta Selatan)',
    corridor: 'Arteri Gatot Subroto - MT Haryono',
    province: 'DKI Jakarta',
    coordinates: [-6.2350, 106.8280],
    damageType: 'ALLIGATOR_CRACK',
    damageTypeLabel: 'Retak Buaya (Alligator Cracking)',
    severity: 'MODERATE',
    estimatedDepthCm: 6,
    estimatedAreaM2: 5.5,
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&q=80&w=600',
    description: 'Retak buaya menyebar di jalur lambat depan halte Kuningan Barat arah Cawang.',
    status: 'PENDING',
    upvotesCount: 28,
    userUpvoted: false,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-14',
      repairMethod: 'Micro-surfacing Thin Asphalt Layer',
      repairedPciImprovement: 'PCI 50 -> 91 (Sangat Halus)',
      engineerNote: 'Penyegelan celah retak halus di jalur lambat Kuningan.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  },
  {
    id: 'REP-JKT-003',
    reporterName: 'Anugrah Saputra',
    reporterRole: 'Komuter Jakarta Timur',
    reporterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    timestamp: '2026-08-12 08:20:00',
    segmentId: 'JLN-JAKARTA-02',
    segmentName: 'Jl. MT Haryono - Cawang Flyover (Jakarta Timur)',
    corridor: 'Arteri Cawang - MT Haryono',
    province: 'DKI Jakarta',
    coordinates: [-6.2440, 106.8650],
    damageType: 'POTHOLE',
    damageTypeLabel: 'Lubang Aspal Naik Flyover',
    severity: 'CRITICAL',
    estimatedDepthCm: 14,
    estimatedAreaM2: 3.8,
    photoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    description: 'Lubang aspal tajam di tanjakan flyover Cawang arah Pancoran, sangat berbahaya bagi motor di malam hari.',
    status: 'PENDING',
    upvotesCount: 77,
    userUpvoted: true,
    repairDetails: {
      afterPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800',
      repairDate: '2026-08-13',
      repairMethod: 'Rapid Set Polymer Patching Flyover Deck',
      repairedPciImprovement: 'PCI 25 -> 88 (Mulus & Aman)',
      engineerNote: 'Penambalan kilat expansion deck flyover Cawang.',
      agencyInCharge: 'Instansi berwenang (belum ditetapkan)'
    }
  }
];

/** Deployment base path in the browser (Vite) and on the server (env), for asset URLs. */
const BASE_PATH: string =
  (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ??
  normalizeBasePath((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITE_BASE_PATH);

/**
 * Demo reports (SYNTHETIC). They have no citizen photo, so each shows a labelled dataset
 * reference image for its damage type (RDD2022), or an explicit "no coverage" image.
 */
const REFERENCE_PHOTOS = assignReferencePhotos(SEED_REPORTS);
/**
 * Bundled reports are DATA CONTOH: reporters get generic names and no stock face photos, so no
 * card shows a person who looks real. The citizen's own size estimate stays in the report as
 * "estimasi pelapor", never as a system measurement.
 */
const anonymised = ({ reporterAvatar: _stockFace, ...report }: DamageReport, index: number): DamageReport => ({
  ...report,
  reporterName: `Warga contoh ${String(index + 1).padStart(2, '0')}`,
  reporterRole: 'Pelapor (DATA CONTOH)'
});

export const INITIAL_COMMUNITY_REPORTS: DamageReport[] = SEED_REPORTS.map((report, index) =>
  withoutStockRepairPhoto(withReferencePhoto(anonymised(report, index), REFERENCE_PHOTOS.get(report.id)!, BASE_PATH))
);
