export interface NationalRoadCorridor {
  id: string;
  name: string;
  island: 'Sumatera' | 'Jawa' | 'Kalimantan' | 'Sulawesi' | 'Bali & Nusa Tenggara' | 'Maluku' | 'Papua';
  corridorType: 'Arteri Primer' | 'Tol Trans' | 'Kolektor Nasional' | 'Jalur Logistik Strategis';
  rhi: number; // 0 - 100
  pci: number; // 0 - 100
  status: 'Baik' | 'Sedang' | 'Buruk' | 'Sangat Buruk';
  lengthKm: number;
  trafficLhr: number;
  axleLoadTon: number;
  overloadPercent: number;
  treatment: string;
  polyline: [number, number][];
}

export function getRhiStatusAndColor(rhi: number): {
  status: 'Baik' | 'Sedang' | 'Buruk' | 'Sangat Buruk';
  color: string;
  badgeClass: string;
  lineWeight: number;
} {
  if (rhi >= 70) {
    return {
      status: 'Baik',
      color: '#57ae78', // Vivid Green
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      lineWeight: 3.5
    };
  }
  if (rhi >= 50) {
    return {
      status: 'Sedang',
      color: '#e8b23a', // Vivid Amber/Yellow
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      lineWeight: 3.5
    };
  }
  if (rhi >= 30) {
    return {
      status: 'Buruk',
      color: '#e2823d', // Vivid Orange
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      lineWeight: 4
    };
  }
  return {
    status: 'Sangat Buruk',
    color: '#d9655d', // Vivid Red
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    lineWeight: 4.5
  };
}

export const NATIONAL_ROAD_HEALTH_CORRIDORS: NationalRoadCorridor[] = [
  // ==================== SUMATERA ====================
  {
    id: 'SUM-LINTAS-TIMUR-1',
    name: 'Lintas Timur Sumatera: Banda Aceh - Medan - Tebing Tinggi',
    island: 'Sumatera',
    corridorType: 'Arteri Primer',
    rhi: 74,
    pci: 76,
    status: 'Baik',
    lengthKm: 580,
    trafficLhr: 38500,
    axleLoadTon: 14.5,
    overloadPercent: 45,
    treatment: 'Pemeliharaan Rutin & Rekondisi Marka',
    polyline: [
      [5.5483, 95.3238],
      [5.1800, 97.1400],
      [4.4800, 97.9600],
      [3.5952, 98.6722],
      [3.3285, 99.1625]
    ]
  },
  {
    id: 'SUM-LINTAS-TIMUR-2',
    name: 'Lintas Timur Sumatera: Rantau Prapat - Pekanbaru - Duri',
    island: 'Sumatera',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 48,
    pci: 46,
    status: 'Buruk',
    lengthKm: 420,
    trafficLhr: 44200,
    axleLoadTon: 22.8,
    overloadPercent: 128,
    treatment: 'Rehabilitasi Berat + Inlay AC-WC 6 cm',
    polyline: [
      [3.3285, 99.1625],
      [2.0950, 99.8300],
      [1.4500, 100.5800],
      [1.2700, 101.2100],
      [0.5071, 101.4478]
    ]
  },
  {
    id: 'SUM-LINTAS-TIMUR-3',
    name: 'Lintas Timur Sumatera: Pekanbaru - Jambi - Palembang',
    island: 'Sumatera',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 42,
    pci: 40,
    status: 'Buruk',
    lengthKm: 490,
    trafficLhr: 49800,
    axleLoadTon: 24.6,
    overloadPercent: 146,
    treatment: 'Rekonstruksi Fondasi + Heavy Duty Asphalt 9 cm',
    polyline: [
      [0.5071, 101.4478],
      [-0.4500, 102.3200],
      [-1.6101, 103.6131],
      [-2.3500, 104.2800],
      [-2.9761, 104.7754]
    ]
  },
  {
    id: 'SUM-LINTAS-TIMUR-4',
    name: 'Lintas Timur Sumatera: Palembang - Kayu Agung - Bakauheni',
    island: 'Sumatera',
    corridorType: 'Tol Trans',
    rhi: 78,
    pci: 82,
    status: 'Baik',
    lengthKm: 360,
    trafficLhr: 54000,
    axleLoadTon: 18.2,
    overloadPercent: 82,
    treatment: 'Pemeliharaan Preventif Micro-Surfacing',
    polyline: [
      [-2.9761, 104.7754],
      [-3.3900, 104.8500],
      [-4.1800, 105.1200],
      [-4.9600, 105.2800],
      [-5.4500, 105.2667],
      [-5.8694, 105.7525]
    ]
  },
  {
    id: 'SUM-LINTAS-TENGAH',
    name: 'Lintas Tengah Sumatera: Padang Sidempuan - Bukittinggi - Solok - Lahat',
    island: 'Sumatera',
    corridorType: 'Arteri Primer',
    rhi: 58,
    pci: 56,
    status: 'Sedang',
    lengthKm: 650,
    trafficLhr: 28000,
    axleLoadTon: 16.8,
    overloadPercent: 68,
    treatment: 'Patching Deep & Overlay 5 cm',
    polyline: [
      [1.3700, 99.2700],
      [0.3000, 100.3700],
      [-0.7900, 100.6500],
      [-1.5800, 101.5500],
      [-2.6500, 102.8500],
      [-3.7800, 103.5400],
      [-4.8200, 104.8800]
    ]
  },
  {
    id: 'SUM-LINTAS-BARAT',
    name: 'Lintas Barat Sumatera: Meulaboh - Tapaktuan - Sibolga - Padang - Bengkulu - Krui',
    island: 'Sumatera',
    corridorType: 'Arteri Primer',
    rhi: 64,
    pci: 62,
    status: 'Sedang',
    lengthKm: 890,
    trafficLhr: 19500,
    axleLoadTon: 14.0,
    overloadPercent: 40,
    treatment: 'Penanganan Longsoran Tebing & Slurry Seal',
    polyline: [
      [4.1447, 96.1285],
      [3.2500, 97.1800],
      [1.7400, 98.7800],
      [-0.9492, 100.3543],
      [-2.1500, 101.1200],
      [-3.8004, 102.2655],
      [-5.1800, 103.8800],
      [-5.8694, 105.7525]
    ]
  },

  // ==================== JAWA ====================
  {
    id: 'JAW-PANTURA-1',
    name: 'Pantura Barat: Merak - Tangerang - Jakarta - Karawang',
    island: 'Jawa',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 42,
    pci: 38,
    status: 'Buruk',
    lengthKm: 145,
    trafficLhr: 98000,
    axleLoadTon: 24.2,
    overloadPercent: 142,
    treatment: 'Rekonstruksi Rigid Concrete K-500 + Subgrade Geotextile',
    polyline: [
      [-5.9328, 105.9989],
      [-6.1150, 106.1500],
      [-6.1751, 106.8650],
      [-6.2800, 107.1200],
      [-6.3050, 107.3180]
    ]
  },
  {
    id: 'JAW-PANTURA-2',
    name: 'Pantura Tengah: Karawang - Cirebon - Brebes - Tegal - Pekalongan - Semarang',
    island: 'Jawa',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 52,
    pci: 50,
    status: 'Sedang',
    lengthKm: 340,
    trafficLhr: 82000,
    axleLoadTon: 21.5,
    overloadPercent: 115,
    treatment: 'Milling Inlay Polymer 6 cm + Perbaikan Drainase',
    polyline: [
      [-6.3050, 107.3180],
      [-6.3400, 107.8200],
      [-6.7320, 108.5523],
      [-6.8700, 109.0400],
      [-6.8680, 109.6753],
      [-6.9667, 110.4167]
    ]
  },
  {
    id: 'JAW-PANTURA-3',
    name: 'Pantura Timur: Semarang - Kudus - Rembang - Tuban - Surabaya - Banyuwangi',
    island: 'Jawa',
    corridorType: 'Arteri Primer',
    rhi: 68,
    pci: 66,
    status: 'Sedang',
    lengthKm: 460,
    trafficLhr: 65000,
    axleLoadTon: 18.0,
    overloadPercent: 80,
    treatment: 'Preventive Overlay AC-WC 4 cm',
    polyline: [
      [-6.9667, 110.4167],
      [-6.8048, 110.8405],
      [-6.7063, 111.3384],
      [-6.8976, 112.0649],
      [-7.2575, 112.7521],
      [-7.7543, 113.2159],
      [-7.7058, 113.9856],
      [-8.2192, 114.3692]
    ]
  },
  {
    id: 'JAW-TRANS-TOLL',
    name: 'Tol Trans Jawa: Jakarta - Cipali - Semarang - Solo - Surabaya - Pasuruan',
    island: 'Jawa',
    corridorType: 'Tol Trans',
    rhi: 86,
    pci: 88,
    status: 'Baik',
    lengthKm: 780,
    trafficLhr: 72000,
    axleLoadTon: 16.0,
    overloadPercent: 60,
    treatment: 'Pemeliharaan Rutin Berkala & Diamond Grinding',
    polyline: [
      [-6.1751, 106.8650],
      [-6.4500, 107.5500],
      [-6.7000, 108.3000],
      [-6.9800, 109.8000],
      [-7.0000, 110.4200],
      [-7.5700, 110.8200],
      [-7.4500, 111.4500],
      [-7.4800, 112.4500],
      [-7.2575, 112.7521],
      [-7.6400, 112.9100]
    ]
  },
  {
    id: 'JAW-JALUR-TENGAH',
    name: 'Jalur Tengah Jawa: Bandung - Tasikmalaya - Purwokerto - Yogyakarta - Solo',
    island: 'Jawa',
    corridorType: 'Arteri Primer',
    rhi: 76,
    pci: 78,
    status: 'Baik',
    lengthKm: 420,
    trafficLhr: 41000,
    axleLoadTon: 13.5,
    overloadPercent: 35,
    treatment: 'Micro-Surfacing & Perbaikan Bahu Jalan',
    polyline: [
      [-6.9175, 107.6191],
      [-7.3274, 108.2207],
      [-7.4243, 109.2302],
      [-7.7956, 110.3695],
      [-7.5700, 110.8200]
    ]
  },
  {
    id: 'JAW-PANSELA',
    name: 'Jalur Pansela: Pelabuhan Ratu - Pangandaran - Cilacap - Yogyakarta - Malang - Banyuwangi',
    island: 'Jawa',
    corridorType: 'Arteri Primer',
    rhi: 82,
    pci: 84,
    status: 'Baik',
    lengthKm: 980,
    trafficLhr: 18000,
    axleLoadTon: 11.2,
    overloadPercent: 12,
    treatment: 'Pemeliharaan Rutin Preservasi',
    polyline: [
      [-6.9858, 106.5500],
      [-7.7011, 108.4900],
      [-7.7167, 109.0167],
      [-7.8900, 110.1500],
      [-8.2000, 111.1000],
      [-8.3000, 112.6000],
      [-8.3500, 113.8000],
      [-8.4500, 114.3500]
    ]
  },

  // ==================== KALIMANTAN ====================
  {
    id: 'KAL-POROS-SELATAN',
    name: 'Trans Kalimantan Poros Selatan: Pontianak - Ketapang - Sampit - Palangkaraya - Banjarmasin',
    island: 'Kalimantan',
    corridorType: 'Arteri Primer',
    rhi: 48,
    pci: 46,
    status: 'Buruk',
    lengthKm: 890,
    trafficLhr: 24500,
    axleLoadTon: 19.5,
    overloadPercent: 95,
    treatment: 'Peninggian Badan Jalan Rawan Banjir Gambut + Rigid Pavement',
    polyline: [
      [-0.0263, 109.3425],
      [-1.8300, 109.9800],
      [-2.4000, 111.7500],
      [-2.5300, 112.9500],
      [-2.2161, 113.9140],
      [-3.3194, 114.5908]
    ]
  },
  {
    id: 'KAL-POROS-TIMUR',
    name: 'Trans Kalimantan Poros Timur: Banjarmasin - Balikpapan - Samarinda - IKN - Bontang - Sangatta',
    island: 'Kalimantan',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 68,
    pci: 70,
    status: 'Sedang',
    lengthKm: 680,
    trafficLhr: 39000,
    axleLoadTon: 22.0,
    overloadPercent: 120,
    treatment: 'Overlay Heavy Duty AC-WC & Stabilisasi Tanah Lereng',
    polyline: [
      [-3.3194, 114.5908],
      [-2.1500, 115.5800],
      [-1.2379, 116.8289],
      [-0.9800, 116.7000], // Area IKN
      [-0.5022, 117.1536],
      [0.1300, 117.4800],
      [0.4800, 117.5800],
      [2.1500, 117.4800]
    ]
  },
  {
    id: 'KAL-POROS-TENGAH-PERBATASAN',
    name: 'Trans Kalimantan Poros Tengah & Perbatasan: Pontianak - Sanggau - Putussibau - Entikong',
    island: 'Kalimantan',
    corridorType: 'Kolektor Nasional',
    rhi: 72,
    pci: 74,
    status: 'Baik',
    lengthKm: 560,
    trafficLhr: 14500,
    axleLoadTon: 12.0,
    overloadPercent: 20,
    treatment: 'Pemeliharaan Rutin Drainase Saluran Samping',
    polyline: [
      [-0.0263, 109.3425],
      [0.1200, 110.4500],
      [0.5500, 110.3500], // Entikong border
      [0.4500, 111.4500],
      [0.8500, 112.9200]
    ]
  },

  // ==================== SULAWESI ====================
  {
    id: 'SUL-BARAT-SELATAN',
    name: 'Trans Sulawesi Barat: Makassar - Parepare - Majene - Mamuju - Pasangkayu - Palu',
    island: 'Sulawesi',
    corridorType: 'Arteri Primer',
    rhi: 62,
    pci: 60,
    status: 'Sedang',
    lengthKm: 820,
    trafficLhr: 31000,
    axleLoadTon: 16.5,
    overloadPercent: 65,
    treatment: 'Penanganan Amblesan Pesisir & Inlay 5 cm',
    polyline: [
      [-5.1477, 119.4327],
      [-4.0150, 119.6250],
      [-3.5400, 118.9800],
      [-2.6700, 118.8800],
      [-1.3800, 119.3800],
      [-0.9000, 119.8700]
    ]
  },
  {
    id: 'SUL-TIMUR-TENGAH',
    name: 'Trans Sulawesi Timur: Makassar - Bulukumba - Bone - Palopo - Kolaka - Kendari',
    island: 'Sulawesi',
    corridorType: 'Arteri Primer',
    rhi: 66,
    pci: 68,
    status: 'Sedang',
    lengthKm: 740,
    trafficLhr: 26000,
    axleLoadTon: 17.2,
    overloadPercent: 72,
    treatment: 'Overlay AC-BC & Perkuatan Jembatan',
    polyline: [
      [-5.1477, 119.4327],
      [-5.5500, 120.1800],
      [-4.5300, 120.3200],
      [-3.0000, 120.2000],
      [-2.5000, 121.3500],
      [-3.9900, 122.5100] // Kendari
    ]
  },
  {
    id: 'SUL-UTARA',
    name: 'Trans Sulawesi Utara: Palu - Gorontalo - Kotamobagu - Manado - Bitung',
    island: 'Sulawesi',
    corridorType: 'Arteri Primer',
    rhi: 56,
    pci: 54,
    status: 'Sedang',
    lengthKm: 780,
    trafficLhr: 28500,
    axleLoadTon: 17.8,
    overloadPercent: 78,
    treatment: 'Penanganan Titik Rawan Longsor & Overlay 6 cm',
    polyline: [
      [-0.9000, 119.8700],
      [0.5500, 120.8500],
      [0.5400, 123.0600], // Gorontalo
      [0.7200, 124.3100],
      [1.4748, 124.8428], // Manado
      [1.4400, 125.1800]  // Bitung Port
    ]
  },

  // ==================== BALI & NUSA TENGGARA ====================
  {
    id: 'BAL-NUSA-1',
    name: 'Sabuk Bali: Gilimanuk - Tabanan - Denpasar - Padangbai - Singaraja',
    island: 'Bali & Nusa Tenggara',
    corridorType: 'Arteri Primer',
    rhi: 84,
    pci: 86,
    status: 'Baik',
    lengthKm: 290,
    trafficLhr: 45000,
    axleLoadTon: 12.5,
    overloadPercent: 25,
    treatment: 'Pemeliharaan Rutin Preservasi Wisata',
    polyline: [
      [-8.1600, 114.4400],
      [-8.5400, 115.1200],
      [-8.6705, 115.2126],
      [-8.5300, 115.5100],
      [-8.1100, 115.0900],
      [-8.1600, 114.4400]
    ]
  },
  {
    id: 'BAL-NUSA-2',
    name: 'Trans Lombok & Sumbawa: Lembar - Mataram - Kayangan - Poto Tano - Sumbawa Besar - Bima - Sape',
    island: 'Bali & Nusa Tenggara',
    corridorType: 'Arteri Primer',
    rhi: 72,
    pci: 74,
    status: 'Baik',
    lengthKm: 480,
    trafficLhr: 22000,
    axleLoadTon: 14.0,
    overloadPercent: 40,
    treatment: 'Patching & Slurry Seal',
    polyline: [
      [-8.7200, 116.0700],
      [-8.5800, 116.1100],
      [-8.4900, 116.6800],
      [-8.5400, 116.8500],
      [-8.5000, 117.4300],
      [-8.4600, 118.7200],
      [-8.5700, 119.0100]
    ]
  },
  {
    id: 'BAL-NUSA-3',
    name: 'Trans Flores & Timor: Labuan Bajo - Ruteng - Ende - Maumere | Kupang - Atambua',
    island: 'Bali & Nusa Tenggara',
    corridorType: 'Arteri Primer',
    rhi: 45,
    pci: 44,
    status: 'Buruk',
    lengthKm: 720,
    trafficLhr: 11000,
    axleLoadTon: 13.8,
    overloadPercent: 38,
    treatment: 'Rehabilitasi Penanganan Amblesan Geometrik & Overlay 6 cm',
    polyline: [
      [-8.4900, 119.8800],
      [-8.6100, 120.4600],
      [-8.8400, 121.6500],
      [-8.6200, 122.2100],
      [-8.3300, 122.9800]
    ]
  },
  {
    id: 'BAL-NUSA-4',
    name: 'Trans Timor: Kupang - Soe - Kefamenanu - Atambua (PLBN Motaain)',
    island: 'Bali & Nusa Tenggara',
    corridorType: 'Arteri Primer',
    rhi: 54,
    pci: 52,
    status: 'Sedang',
    lengthKm: 280,
    trafficLhr: 12500,
    axleLoadTon: 14.5,
    overloadPercent: 45,
    treatment: 'Peningkatan Struktur Fondasi Agregat Kelas A',
    polyline: [
      [-10.1700, 123.6000],
      [-9.8600, 124.2800],
      [-9.4500, 124.4800],
      [-9.1100, 124.8900]
    ]
  },

  // ==================== MALUKU ====================
  {
    id: 'MAL-1',
    name: 'Jaringan Jalan Nasional Pulau Ambon & Seram (Piru - Masohi - Bula)',
    island: 'Maluku',
    corridorType: 'Arteri Primer',
    rhi: 51,
    pci: 50,
    status: 'Sedang',
    lengthKm: 340,
    trafficLhr: 8500,
    axleLoadTon: 12.0,
    overloadPercent: 20,
    treatment: 'Perbaikan Saluran Lereng & Lapis Penetrasi Makadam ke Hotmix',
    polyline: [
      [-3.6900, 128.1800],
      [-3.0700, 128.1000],
      [-3.2900, 128.9500],
      [-3.1100, 130.4900]
    ]
  },
  {
    id: 'MAL-2',
    name: 'Jaringan Jalan Pulau Halmahera: Sofifi - Tobelo - Weda Industri',
    island: 'Maluku',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 46,
    pci: 44,
    status: 'Buruk',
    lengthKm: 310,
    trafficLhr: 18500,
    axleLoadTon: 24.0,
    overloadPercent: 140,
    treatment: 'Peningkatan Jalan Tambang Nikel ke Rigid Pavement K-450',
    polyline: [
      [0.7200, 127.5700],
      [1.7300, 128.0100],
      [0.3400, 127.9100]
    ]
  },

  // ==================== PAPUA ====================
  {
    id: 'PAP-TRANS-UTARA',
    name: 'Trans Papua Utara: Jayapura - Sarmi - Mamberamo - Nabire - Manokwari - Sorong',
    island: 'Papua',
    corridorType: 'Arteri Primer',
    rhi: 38,
    pci: 36,
    status: 'Buruk',
    lengthKm: 980,
    trafficLhr: 7500,
    axleLoadTon: 15.0,
    overloadPercent: 50,
    treatment: 'Pembangunan Lapis Aspal Hotmix & Penanganan Jembatan Kayu ke Rangka Baja',
    polyline: [
      [-2.5337, 140.7181],
      [-1.8600, 138.7400],
      [-2.2000, 137.5000],
      [-3.3600, 135.5000],
      [-0.8600, 134.0600],
      [-0.8700, 131.2500]
    ]
  },
  {
    id: 'PAP-TRANS-PEGUNUNGAN',
    name: 'Trans Papua Pegunungan: Jayapura - Elelim - Wamena - Habema - Kenyam - Dekai',
    island: 'Papua',
    corridorType: 'Jalur Logistik Strategis',
    rhi: 26,
    pci: 24,
    status: 'Sangat Buruk',
    lengthKm: 540,
    trafficLhr: 3800,
    axleLoadTon: 16.5,
    overloadPercent: 65,
    treatment: 'Rekonstruksi Total Koridor Pegunungan Terisolir + Drainase Tebing Batu',
    polyline: [
      [-2.5337, 140.7181],
      [-3.7800, 139.4200],
      [-4.0900, 138.9400],
      [-4.2400, 138.6800],
      [-4.5300, 138.2500]
    ]
  },
  {
    id: 'PAP-TRANS-SELATAN',
    name: 'Trans Papua Selatan: Merauke - Boven Digoel - Tanah Merah - Mindiptana',
    island: 'Papua',
    corridorType: 'Arteri Primer',
    rhi: 32,
    pci: 30,
    status: 'Buruk',
    lengthKm: 460,
    trafficLhr: 4900,
    axleLoadTon: 16.0,
    overloadPercent: 60,
    treatment: 'Stabilisasi Tanah Lempung Ekspansif + Lapisan Fondasi Bawah Agregat',
    polyline: [
      [-8.4991, 140.4011],
      [-6.9500, 140.3500],
      [-6.1000, 140.3000],
      [-5.8000, 140.5000]
    ]
  },
  {
    id: 'PAP-TRANS-BARAT-DAYA',
    name: 'Trans Papua Barat: Sorong - Maybrat - Bintuni - Manokwari',
    island: 'Papua',
    corridorType: 'Arteri Primer',
    rhi: 41,
    pci: 40,
    status: 'Buruk',
    lengthKm: 420,
    trafficLhr: 6200,
    axleLoadTon: 15.5,
    overloadPercent: 55,
    treatment: 'Peningkatan Struktur Perkerasan Jalan Logistik LNG & Industri',
    polyline: [
      [-0.8700, 131.2500],
      [-1.3500, 132.3500],
      [-2.1300, 133.5200],
      [-0.8600, 134.0600]
    ]
  }
];
