export type StrategicMapLayer = 'CURRENT' | 'PROJECTION_5Y' | 'PRIORITY' | 'BUDGET' | 'ECONOMIC';

export type PolicyScenario =
  | 'NO_INTERVENTION'
  | 'PREVENTIVE'
  | 'PRIORITY_1'
  | 'STRICT_ODOL'
  | 'PREVENTIVE_AND_ODOL';

export interface StrategicCorridor {
  id: string;
  name: string;
  corridor: string;
  province: string;
  coordinates: [number, number];
  polyline: [number, number][];
  lengthKm: number;
  currentPci: number;
  projection2030NoAction: number;
  projection2030WithAction: number;
  remainingLifeYears: number;
  priorityLevel: 'P1' | 'P2' | 'P3';
  priorityLabel: 'Critical / Darurat' | 'High / Rehabilitasi' | 'Moderate / Preservasi';
  priorityHaloColor: string;
  
  // 4 Pillars of Health Profile
  pinnHealthProfile: {
    roadConditionScore: number; // 0-100
    roadConditionCategory: 'BAIK' | 'SEDANG' | 'BURUK' | 'SANGAT_BURUK';
    wimAxleLoadTon: number;
    wimLegalLimitTon: number;
    wimOverloadPercent: number;
    wimSeverity: 'NORMAL' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
    rainIntensityMmHr: number;
    floodRiskLevel: 'NORMAL' | 'RAIN' | 'HEAVY_RAIN' | 'FLOOD_RISK';
    subgradeCbrPercent: number;
    subgradeCondition: 'CRITICAL' | 'POOR' | 'FAIR' | 'GOOD';
    parisLawCrackPropagation: string;
  };

  // PINN Factor Bar Breakdown (0-100 scale for UI bar)
  pinnFactors: {
    trafficLoadScore: number; // 0-100
    trafficLoadLabel: string;
    rainfallScore: number;
    rainfallLabel: string;
    subgradeCbrScore: number;
    subgradeCbrLabel: string;
    existingDamageScore: number;
    existingDamageLabel: string;
  };

  // Economic and Budget
  budgetNeededM: number;
  economicLossWithoutActionM: number;
  potentialSavingsM: number;
  benefitCostRatio: number;
  recommendedTreatment: string;
}

export interface StrategicRegion {
  id: string;
  name: string;
  province: string;
  coordinates: [number, number];
  rhi: number;
  rhiChange: number;
  status: 'Perlu Perhatian' | 'Kritis' | 'Cukup Baik' | 'Optimal';
  totalRuas: number;
  ruasKritis: number;
  pciAvg: number;
  lengthKm: number;
  projectionWithout: number;
  projectionWith: number;
  investmentNeededM: number;
  criticalHotspots: number;
  clusterBadgeColor: string;
  badgeLabel: string;
  corridors: string[];
  priorityCounts: {
    criticalP1: number;
    highP2: number;
    moderateP3: number;
  };
}

export interface StrategicWimStation {
  id: string;
  name: string;
  corridor: string;
  coordinates: [number, number];
  plateNumber: string;
  truckClass: string;
  axleLoadTon: number;
  legalLimitTon: number;
  overloadPercent: number;
  severity: 'NORMAL' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'EXTREME';
  speedKmh: number;
  hourlyTrucksCount: number;
}

export interface StrategicWeatherStation {
  id: string;
  name: string;
  coordinates: [number, number];
  rainMmHr: number;
  floodRisk: 'NORMAL' | 'RAIN' | 'HEAVY_RAIN' | 'FLOOD_RISK';
  waterloggedSubgrade: boolean;
  stationType: 'BMKG Telemetry' | 'IoT Road Sensor';
}

// Color coding according to document:
// 🟢 Hijau: Baik (≥ 70)
// 🟡 Kuning: Sedang (50 - 69)
// 🟠 Oranye: Buruk (30 - 49)
// 🔴 Merah: Sangat Buruk (< 30)
export function getPciColor(pci: number): string {
  if (pci >= 70) return '#57ae78'; // Green
  if (pci >= 50) return '#e8b23a'; // Yellow
  if (pci >= 30) return '#e2823d'; // Orange
  return '#d9655d'; // Red
}

export function getPciCategoryName(pci: number): string {
  if (pci >= 70) return 'Baik (PCI ≥ 70)';
  if (pci >= 50) return 'Sedang (50–69)';
  if (pci >= 30) return 'Buruk (30–49)';
  return 'Sangat Buruk (< 30)';
}

export const STRATEGIC_CORRIDORS: StrategicCorridor[] = [
  {
    id: 'CORR-PANTURA-KM62',
    name: 'Jl. Raya Pantura KM 62 - Klari',
    corridor: 'Koridor Logistik Nasional Pantura Jawa Barat',
    province: 'Jawa Barat',
    coordinates: [-6.3050, 107.3180],
    polyline: [
      [-6.3050, 107.3180],
      [-6.3500, 107.3800],
      [-6.4200, 107.4500],
      [-6.5300, 107.4800]
    ],
    lengthKm: 28.4,
    currentPci: 42,
    projection2030NoAction: 27,
    projection2030WithAction: 76,
    remainingLifeYears: 2.1,
    priorityLevel: 'P1',
    priorityLabel: 'Critical / Darurat',
    priorityHaloColor: '#d9655d',
    pinnHealthProfile: {
      roadConditionScore: 42,
      roadConditionCategory: 'BURUK',
      wimAxleLoadTon: 22.4,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 124,
      wimSeverity: 'EXTREME',
      rainIntensityMmHr: 48,
      floodRiskLevel: 'HEAVY_RAIN',
      subgradeCbrPercent: 3.8,
      subgradeCondition: 'CRITICAL',
      parisLawCrackPropagation: 'da/dN = 0.042 mm/siklus (Laju Kritis)'
    },
    pinnFactors: {
      trafficLoadScore: 92,
      trafficLoadLabel: 'High (ODOL +124%)',
      rainfallScore: 78,
      rainfallLabel: 'High (48 mm/jam)',
      subgradeCbrScore: 88,
      subgradeCbrLabel: 'High (CBR 3.8% Jenuh)',
      existingDamageScore: 84,
      existingDamageLabel: 'High (Fatigue Alligator)'
    },
    budgetNeededM: 8.2,
    economicLossWithoutActionM: 18.4,
    potentialSavingsM: 12.7,
    benefitCostRatio: 2.4,
    recommendedTreatment: 'Rekonstruksi Fondasi + Heavy Duty Asphalt Overlay 9.5 cm + Drainase Box Culvert'
  },
  {
    id: 'CORR-KALIMALANG-JAKTIM',
    name: 'Jl. Arteri Kalimalang - Cipinang Bypass',
    corridor: 'Arteri Penghubung Jakarta Timur - Bekasi Barat',
    province: 'DKI Jakarta',
    coordinates: [-6.2400, 106.9200],
    polyline: [
      [-6.2300, 106.8700],
      [-6.2400, 106.9200],
      [-6.2480, 106.9600],
      [-6.2520, 107.0100]
    ],
    lengthKm: 14.2,
    currentPci: 32,
    projection2030NoAction: 18,
    projection2030WithAction: 78,
    remainingLifeYears: 1.4,
    priorityLevel: 'P1',
    priorityLabel: 'Critical / Darurat',
    priorityHaloColor: '#d9655d',
    pinnHealthProfile: {
      roadConditionScore: 32,
      roadConditionCategory: 'SANGAT_BURUK',
      wimAxleLoadTon: 19.8,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 98,
      wimSeverity: 'HEAVY',
      rainIntensityMmHr: 52,
      floodRiskLevel: 'FLOOD_RISK',
      subgradeCbrPercent: 4.1,
      subgradeCondition: 'CRITICAL',
      parisLawCrackPropagation: 'da/dN = 0.051 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 86,
      trafficLoadLabel: 'High (19.8 Ton Axle)',
      rainfallScore: 85,
      rainfallLabel: 'High (52 mm/jam Genangan)',
      subgradeCbrScore: 80,
      subgradeCbrLabel: 'High (CBR 4.1%)',
      existingDamageScore: 90,
      existingDamageLabel: 'High (Pothole & Rutting 3.8 cm)'
    },
    budgetNeededM: 12.4,
    economicLossWithoutActionM: 26.8,
    potentialSavingsM: 18.2,
    benefitCostRatio: 2.35,
    recommendedTreatment: 'Full-Depth Reclamation (FDR) + Polymer Modified Asphalt 8 cm'
  },
  {
    id: 'CORR-PRIOK-MARUNDA',
    name: 'Jl. Jampea Pelabuhan Tanjung Priok - Marunda',
    corridor: 'Sabuk Logistik Kontainer Pelabuhan Tanjung Priok',
    province: 'DKI Jakarta',
    coordinates: [-6.1384, 106.8640],
    polyline: [
      [-6.1150, 106.8800],
      [-6.1384, 106.9100],
      [-6.1800, 106.9500],
      [-6.2200, 107.0100]
    ],
    lengthKm: 18.6,
    currentPci: 38,
    projection2030NoAction: 22,
    projection2030WithAction: 82,
    remainingLifeYears: 1.8,
    priorityLevel: 'P1',
    priorityLabel: 'Critical / Darurat',
    priorityHaloColor: '#d9655d',
    pinnHealthProfile: {
      roadConditionScore: 38,
      roadConditionCategory: 'BURUK',
      wimAxleLoadTon: 24.1,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 141,
      wimSeverity: 'EXTREME',
      rainIntensityMmHr: 35,
      floodRiskLevel: 'HEAVY_RAIN',
      subgradeCbrPercent: 3.4,
      subgradeCondition: 'CRITICAL',
      parisLawCrackPropagation: 'da/dN = 0.058 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 96,
      trafficLoadLabel: 'Extreme (24.1 Ton Kontainer)',
      rainfallScore: 68,
      rainfallLabel: 'Moderate (Rob Pasang Laut)',
      subgradeCbrScore: 92,
      subgradeCbrLabel: 'Critical (CBR 3.4% Tanah Lunak)',
      existingDamageScore: 85,
      existingDamageLabel: 'High (Rutting Dalam)'
    },
    budgetNeededM: 16.5,
    economicLossWithoutActionM: 41.2,
    potentialSavingsM: 28.5,
    benefitCostRatio: 2.5,
    recommendedTreatment: 'Rigid Concrete Pavement K-500 + Subgrade Geotextile Stabilization'
  },
  {
    id: 'CORR-DAAN-MOGOT',
    name: 'Jl. Daan Mogot Arteri Barat',
    corridor: 'Koridor Utama Barat Jakarta - Tangerang',
    province: 'DKI Jakarta',
    coordinates: [-6.1683, 106.7588],
    polyline: [
      [-6.1550, 106.7300],
      [-6.1700, 106.7900],
      [-6.1900, 106.8400],
      [-6.2250, 106.9004]
    ],
    lengthKm: 22.4,
    currentPci: 54,
    projection2030NoAction: 42,
    projection2030WithAction: 76,
    remainingLifeYears: 3.4,
    priorityLevel: 'P2',
    priorityLabel: 'High / Rehabilitasi',
    priorityHaloColor: '#e2823d',
    pinnHealthProfile: {
      roadConditionScore: 54,
      roadConditionCategory: 'SEDANG',
      wimAxleLoadTon: 16.2,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 62,
      wimSeverity: 'MODERATE',
      rainIntensityMmHr: 28,
      floodRiskLevel: 'RAIN',
      subgradeCbrPercent: 5.2,
      subgradeCondition: 'POOR',
      parisLawCrackPropagation: 'da/dN = 0.024 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 65,
      trafficLoadLabel: 'Moderate (+62%)',
      rainfallScore: 55,
      rainfallLabel: 'Moderate (28 mm/jam)',
      subgradeCbrScore: 58,
      subgradeCbrLabel: 'Moderate (CBR 5.2%)',
      existingDamageScore: 54,
      existingDamageLabel: 'Moderate (Retak Memanjang)'
    },
    budgetNeededM: 9.8,
    economicLossWithoutActionM: 19.5,
    potentialSavingsM: 12.4,
    benefitCostRatio: 2.1,
    recommendedTreatment: 'Milling & Inlay 5 cm + Crack Sealing'
  },
  {
    id: 'CORR-DEPOK-BOGOR',
    name: 'Jl. Raya Bogor - Simatupang - Cibinong',
    corridor: 'Arteri Penghubung Selatan Jakarta - Depok - Bogor',
    province: 'Jawa Barat',
    coordinates: [-6.4025, 106.7942],
    polyline: [
      [-6.2900, 106.7800],
      [-6.3050, 106.8400],
      [-6.3800, 106.8200],
      [-6.4025, 106.8000],
      [-6.5200, 106.8100],
      [-6.5971, 106.8060]
    ],
    lengthKm: 34.8,
    currentPci: 60,
    projection2030NoAction: 48,
    projection2030WithAction: 78,
    remainingLifeYears: 4.1,
    priorityLevel: 'P2',
    priorityLabel: 'High / Rehabilitasi',
    priorityHaloColor: '#e2823d',
    pinnHealthProfile: {
      roadConditionScore: 60,
      roadConditionCategory: 'SEDANG',
      wimAxleLoadTon: 14.5,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 45,
      wimSeverity: 'MODERATE',
      rainIntensityMmHr: 44,
      floodRiskLevel: 'HEAVY_RAIN',
      subgradeCbrPercent: 5.8,
      subgradeCondition: 'FAIR',
      parisLawCrackPropagation: 'da/dN = 0.019 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 58,
      trafficLoadLabel: 'Moderate (+45%)',
      rainfallScore: 72,
      rainfallLabel: 'High (Hujan Curam Bogor)',
      subgradeCbrScore: 50,
      subgradeCbrLabel: 'Fair (CBR 5.8%)',
      existingDamageScore: 48,
      existingDamageLabel: 'Moderate (Pelepasan Butir)'
    },
    budgetNeededM: 11.2,
    economicLossWithoutActionM: 21.0,
    potentialSavingsM: 13.5,
    benefitCostRatio: 2.2,
    recommendedTreatment: 'Preventive Micro-surfacing 3 cm + Perbaikan Saluran Samping'
  },
  {
    id: 'CORR-CIKARANG-INDUSTRI',
    name: 'Jl. Kawasan Industri MM2100 - Cikarang',
    corridor: 'Kawasan Manufaktur & Logistik Cikarang',
    province: 'Jawa Barat',
    coordinates: [-6.2800, 107.1200],
    polyline: [
      [-6.2800, 107.1200],
      [-6.3200, 107.1500],
      [-6.3600, 107.1800]
    ],
    lengthKm: 16.5,
    currentPci: 74,
    projection2030NoAction: 64,
    projection2030WithAction: 86,
    remainingLifeYears: 6.8,
    priorityLevel: 'P3',
    priorityLabel: 'Moderate / Preservasi',
    priorityHaloColor: '#e8b23a',
    pinnHealthProfile: {
      roadConditionScore: 74,
      roadConditionCategory: 'BAIK',
      wimAxleLoadTon: 12.0,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 20,
      wimSeverity: 'LIGHT',
      rainIntensityMmHr: 18,
      floodRiskLevel: 'NORMAL',
      subgradeCbrPercent: 7.5,
      subgradeCondition: 'GOOD',
      parisLawCrackPropagation: 'da/dN = 0.008 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 35,
      trafficLoadLabel: 'Light (+20%)',
      rainfallScore: 30,
      rainfallLabel: 'Low (Drainase Baik)',
      subgradeCbrScore: 25,
      subgradeCbrLabel: 'Good (CBR 7.5%)',
      existingDamageScore: 24,
      existingDamageLabel: 'Minor Hairline Cracks'
    },
    budgetNeededM: 4.8,
    economicLossWithoutActionM: 9.2,
    potentialSavingsM: 6.8,
    benefitCostRatio: 2.6,
    recommendedTreatment: 'Fog Seal Preservasi Dini + Rutin Crack Pouring'
  },
  {
    id: 'CORR-TANGERANG-SERPONG',
    name: 'Jl. Raya Serpong - Tangerang Selatan',
    corridor: 'Arteri Komuter Banten - Serpong BSD',
    province: 'Banten',
    coordinates: [-6.2100, 106.6600],
    polyline: [
      [-6.1600, 106.6100],
      [-6.2100, 106.6600],
      [-6.2800, 106.7000]
    ],
    lengthKm: 19.8,
    currentPci: 76,
    projection2030NoAction: 66,
    projection2030WithAction: 88,
    remainingLifeYears: 7.2,
    priorityLevel: 'P3',
    priorityLabel: 'Moderate / Preservasi',
    priorityHaloColor: '#e8b23a',
    pinnHealthProfile: {
      roadConditionScore: 76,
      roadConditionCategory: 'BAIK',
      wimAxleLoadTon: 11.0,
      wimLegalLimitTon: 10.0,
      wimOverloadPercent: 10,
      wimSeverity: 'LIGHT',
      rainIntensityMmHr: 15,
      floodRiskLevel: 'NORMAL',
      subgradeCbrPercent: 8.0,
      subgradeCondition: 'GOOD',
      parisLawCrackPropagation: 'da/dN = 0.006 mm/siklus'
    },
    pinnFactors: {
      trafficLoadScore: 28,
      trafficLoadLabel: 'Light (+10%)',
      rainfallScore: 25,
      rainfallLabel: 'Low (15 mm/jam)',
      subgradeCbrScore: 20,
      subgradeCbrLabel: 'Good (CBR 8.0%)',
      existingDamageScore: 22,
      existingDamageLabel: 'Minor Roughness'
    },
    budgetNeededM: 3.9,
    economicLossWithoutActionM: 7.5,
    potentialSavingsM: 5.6,
    benefitCostRatio: 2.7,
    recommendedTreatment: 'Pemeliharaan Rutin Preservasi + Rekondisi Marka'
  }
];

export const STRATEGIC_REGIONS: StrategicRegion[] = [
  {
    id: 'jaktim',
    name: 'Jakarta Timur',
    province: 'DKI Jakarta',
    coordinates: [-6.2250, 106.9004],
    rhi: 61,
    rhiChange: -3.1,
    status: 'Perlu Perhatian',
    totalRuas: 84,
    ruasKritis: 12,
    pciAvg: 61,
    lengthKm: 245.8,
    projectionWithout: 51,
    projectionWith: 72,
    investmentNeededM: 28.4,
    criticalHotspots: 24,
    clusterBadgeColor: '#d9655d',
    badgeLabel: '24',
    corridors: ['Arteri Kalimalang', 'Jl. I Gusti Ngurah Rai', 'Bina Marga Bypass Cakung'],
    priorityCounts: {
      criticalP1: 4,
      highP2: 5,
      moderateP3: 3
    }
  },
  {
    id: 'jakut',
    name: 'Jakarta Utara',
    province: 'DKI Jakarta',
    coordinates: [-6.1384, 106.8640],
    rhi: 58,
    rhiChange: -4.5,
    status: 'Kritis',
    totalRuas: 62,
    ruasKritis: 14,
    pciAvg: 58,
    lengthKm: 198.4,
    projectionWithout: 46,
    projectionWith: 74,
    investmentNeededM: 32.1,
    criticalHotspots: 12,
    clusterBadgeColor: '#d9655d',
    badgeLabel: '12',
    corridors: ['Jl. Jampea Pelabuhan Tanjung Priok', 'Arteri Marunda Logistik', 'Jl. Yos Sudarso'],
    priorityCounts: {
      criticalP1: 6,
      highP2: 5,
      moderateP3: 3
    }
  },
  {
    id: 'karawang',
    name: 'Karawang & Purwakarta',
    province: 'Jawa Barat',
    coordinates: [-6.3050, 107.3180],
    rhi: 63,
    rhiChange: -3.4,
    status: 'Perlu Perhatian',
    totalRuas: 88,
    ruasKritis: 11,
    pciAvg: 63,
    lengthKm: 275.6,
    projectionWithout: 52,
    projectionWith: 78,
    investmentNeededM: 24.5,
    criticalHotspots: 11,
    clusterBadgeColor: '#e2823d',
    badgeLabel: '11',
    corridors: ['Pantura KM 62 - Klari', 'Jl. Akses KIIC Karawang Barat', 'Arteri Industri Suryacipta'],
    priorityCounts: {
      criticalP1: 4,
      highP2: 4,
      moderateP3: 3
    }
  },
  {
    id: 'depok',
    name: 'Kota Depok',
    province: 'Jawa Barat',
    coordinates: [-6.4025, 106.7942],
    rhi: 60,
    rhiChange: -3.8,
    status: 'Perlu Perhatian',
    totalRuas: 54,
    ruasKritis: 9,
    pciAvg: 60,
    lengthKm: 168.0,
    projectionWithout: 49,
    projectionWith: 73,
    investmentNeededM: 16.8,
    criticalHotspots: 18,
    clusterBadgeColor: '#e2823d',
    badgeLabel: '18',
    corridors: ['Jl. Margonda Raya', 'Jl. Raya Bogor KM 28-35', 'Jl. Sawangan Raya'],
    priorityCounts: {
      criticalP1: 3,
      highP2: 4,
      moderateP3: 2
    }
  },
  {
    id: 'jakbar',
    name: 'Jakarta Barat',
    province: 'DKI Jakarta',
    coordinates: [-6.1683, 106.7588],
    rhi: 64,
    rhiChange: -2.8,
    status: 'Perlu Perhatian',
    totalRuas: 76,
    ruasKritis: 8,
    pciAvg: 64,
    lengthKm: 215.2,
    projectionWithout: 54,
    projectionWith: 76,
    investmentNeededM: 19.5,
    criticalHotspots: 8,
    clusterBadgeColor: '#e8b23a',
    badgeLabel: '8',
    corridors: ['Daan Mogot Arteri', 'Jl. Panjang Kebon Jeruk', 'Ring Road Cengkareng'],
    priorityCounts: {
      criticalP1: 2,
      highP2: 4,
      moderateP3: 2
    }
  },
  {
    id: 'bekasi',
    name: 'Bekasi & Cikarang',
    province: 'Jawa Barat',
    coordinates: [-6.2383, 106.9756],
    rhi: 74,
    rhiChange: +1.5,
    status: 'Optimal',
    totalRuas: 110,
    ruasKritis: 6,
    pciAvg: 74,
    lengthKm: 340.5,
    projectionWithout: 65,
    projectionWith: 84,
    investmentNeededM: 22.0,
    criticalHotspots: 5,
    clusterBadgeColor: '#57ae78',
    badgeLabel: '5',
    corridors: ['Jl. Arteri Cikarang - Lemahabang', 'Kawasan Industri MM2100', 'Jl. Sultan Agung'],
    priorityCounts: {
      criticalP1: 1,
      highP2: 3,
      moderateP3: 2
    }
  },
  {
    id: 'tangerang',
    name: 'Tangerang Raya',
    province: 'Banten',
    coordinates: [-6.1783, 106.6319],
    rhi: 68,
    rhiChange: -1.9,
    status: 'Cukup Baik',
    totalRuas: 96,
    ruasKritis: 7,
    pciAvg: 68,
    lengthKm: 290.4,
    projectionWithout: 59,
    projectionWith: 80,
    investmentNeededM: 18.2,
    criticalHotspots: 7,
    clusterBadgeColor: '#e8b23a',
    badgeLabel: '7',
    corridors: ['Jl. Daan Mogot Tangerang', 'Jl. Raya Serang KM 12-25', 'Arteri Bandara Soetta'],
    priorityCounts: {
      criticalP1: 2,
      highP2: 3,
      moderateP3: 2
    }
  },
  {
    id: 'bogor',
    name: 'Bogor & Puncak',
    province: 'Jawa Barat',
    coordinates: [-6.5971, 106.8060],
    rhi: 59,
    rhiChange: -4.1,
    status: 'Kritis',
    totalRuas: 72,
    ruasKritis: 13,
    pciAvg: 59,
    lengthKm: 210.0,
    projectionWithout: 48,
    projectionWith: 75,
    investmentNeededM: 21.0,
    criticalHotspots: 15,
    clusterBadgeColor: '#d9655d',
    badgeLabel: '!',
    corridors: ['Jl. Raya Puncak Gadog', 'Jl. Raya Tajur', 'Jl. Sholeh Iskandar'],
    priorityCounts: {
      criticalP1: 5,
      highP2: 5,
      moderateP3: 3
    }
  }
];

export const STRATEGIC_WIM_STATIONS: StrategicWimStation[] = [
  {
    id: 'WIM-PANTURA-KM62',
    name: 'Stasiun WIM Pantura KM 62 Klari',
    corridor: 'Pantura Karawang - Subang',
    coordinates: [-6.3200, 107.3400],
    plateNumber: 'B 9482 UDF',
    truckClass: 'Golongan 7B - Tronton Multi-Axle ODOL',
    axleLoadTon: 22.4,
    legalLimitTon: 10.0,
    overloadPercent: 124,
    severity: 'EXTREME',
    speedKmh: 46,
    hourlyTrucksCount: 164
  },
  {
    id: 'WIM-PRIOK-MARUNDA',
    name: 'Stasiun WIM Gerbang Pelabuhan Marunda',
    corridor: 'Arteri Kontainer Pelabuhan Tanjung Priok',
    coordinates: [-6.1280, 106.9200],
    plateNumber: 'B 9120 TNP',
    truckClass: 'Golongan 7A - Truk Kontainer 40 Feet',
    axleLoadTon: 24.1,
    legalLimitTon: 10.0,
    overloadPercent: 141,
    severity: 'EXTREME',
    speedKmh: 38,
    hourlyTrucksCount: 210
  },
  {
    id: 'WIM-CAKUNG-BYPASS',
    name: 'Stasiun WIM Cakung Bypass Kalimalang',
    corridor: 'Arteri Industri Jakarta Timur',
    coordinates: [-6.2350, 106.9400],
    plateNumber: 'T 8821 KRW',
    truckClass: 'Golongan 6B - Truk Fuso Tronton',
    axleLoadTon: 19.8,
    legalLimitTon: 10.0,
    overloadPercent: 98,
    severity: 'HEAVY',
    speedKmh: 42,
    hourlyTrucksCount: 118
  },
  {
    id: 'WIM-CIKARANG-WEST',
    name: 'Stasiun WIM Cikarang Barat MM2100',
    corridor: 'Kawasan Industri Cikarang',
    coordinates: [-6.2950, 107.1350],
    plateNumber: 'B 9310 KWS',
    truckClass: 'Golongan 5 - Truk 3 Sumbu',
    axleLoadTon: 12.0,
    legalLimitTon: 10.0,
    overloadPercent: 20,
    severity: 'LIGHT',
    speedKmh: 54,
    hourlyTrucksCount: 85
  }
];

export const STRATEGIC_WEATHER_STATIONS: StrategicWeatherStation[] = [
  {
    id: 'WX-KALIMALANG',
    name: 'Sensor IoT Subgrade Kalimalang (DEMO)',
    coordinates: [-6.2420, 106.9050],
    rainMmHr: 52,
    floodRisk: 'FLOOD_RISK',
    waterloggedSubgrade: true,
    stationType: 'IoT Road Sensor'
  },
  {
    id: 'WX-PRIOK',
    name: 'Stasiun Cuaca Tanjung Priok (DEMO)',
    coordinates: [-6.1100, 106.8750],
    rainMmHr: 35,
    floodRisk: 'HEAVY_RAIN',
    waterloggedSubgrade: true,
    stationType: 'BMKG Telemetry'
  },
  {
    id: 'WX-PANTURA-KLARI',
    name: 'Sensor Cuaca & Drainase Pantura Klari',
    coordinates: [-6.3150, 107.3250],
    rainMmHr: 48,
    floodRisk: 'HEAVY_RAIN',
    waterloggedSubgrade: true,
    stationType: 'IoT Road Sensor'
  },
  {
    id: 'WX-BOGOR-GADOG',
    name: 'Stasiun Cuaca Bogor - Gadog (DEMO)',
    coordinates: [-6.5700, 106.8150],
    rainMmHr: 44,
    floodRisk: 'HEAVY_RAIN',
    waterloggedSubgrade: false,
    stationType: 'BMKG Telemetry'
  }
];
