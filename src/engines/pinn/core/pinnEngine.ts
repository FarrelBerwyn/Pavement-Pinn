import {
  SimulationParams,
  SimulationResult,
  RoadSegment,
  DeflectionPoint,
  TensorResults,
  RoleSpecificOutputs,
  IntelTelemetry,
  AlertSeverity,
  HardwareDevice,
  PrecisionMode
} from '../../../types';

/**
 * Runs the RULE_BASED pavement formula engine (heuristic; not a trained network and
 * not a layered-elastic solver — see docs/audit F-01/F-03). Outputs are indicative only.
 * combining Burmister Layered Elasticity, Fourth Power Law,
 * Environmental Saturation Decay, and Intel OpenVINO Edge Execution.
 */
export function runPinnSimulation(
  params: SimulationParams,
  roadSegment: RoadSegment
): SimulationResult {
  const {
    axleLoadTon,
    rainIntensityMmHr,
    floodDurationHours,
    surfaceTemperatureC,
    subgradeCbrPercent,
    asphaltThicknessCm,
    asphaltModulusMpa,
    targetDevice,
    precisionMode
  } = params;

  // 1. Environmental & Material Modulus Decay Calculations
  // Water infiltration reduces subgrade CBR stiffness
  const waterDecayFactor = Math.max(
    0.4,
    1.0 - rainIntensityMmHr * 0.004 - floodDurationHours * 0.015
  );
  const effectiveCbr = subgradeCbrPercent * waterDecayFactor;
  // Subgrade Elastic Modulus Es (MPa) ~ 10 * CBR %
  const subgradeModulusMpa = 10 * effectiveCbr;

  // Temperature visco-elastic softening on Asphalt Modulus E1
  const tempSofteningFactor = Math.max(
    0.5,
    1.0 - (surfaceTemperatureC - 25) * 0.012
  );
  const effectiveAsphaltModulusMpa = asphaltModulusMpa * tempSofteningFactor;

  // 2. Fourth Power Law ODOL Load Factor
  // Standard legal single axle load = 10 Ton
  const odolLoadFactor = Math.pow(axleLoadTon / 10.0, 4.0);

  // 3. Multilayer Elastic Theory Tensor Calculations (PDE Solutions)
  // Tensile strain at bottom of asphalt layer (microstrain)
  const tensileStrainEt = Math.round(
    (axleLoadTon * 120.0) /
      (Math.pow(asphaltThicknessCm, 1.75) *
        Math.pow(effectiveAsphaltModulusMpa / 2000, 0.4))
  );

  // Compressive strain at top of subgrade layer (microstrain)
  const compressiveStrainEv = Math.round(
    (axleLoadTon * 210.0) /
      (Math.pow(asphaltThicknessCm + 15, 1.4) *
        Math.pow(subgradeModulusMpa / 40, 0.75))
  );

  // Surface deflection under center of load (microns)
  const maxDeflectionMicron = Math.round(
    (axleLoadTon * 45.0) /
      (Math.pow(subgradeModulusMpa / 40, 0.6) *
        Math.pow(asphaltThicknessCm / 10, 0.5))
  );

  // Surface Stress (MPa)
  const stressTopMpa = Number((0.65 * (axleLoadTon / 10.0)).toFixed(2));
  const stressBottomMpa = Number((0.12 * (axleLoadTon / 10.0)).toFixed(2));

  // 4. Deflection Basin Generation w(r)
  const deflectionBasin: DeflectionPoint[] = [0, 200, 400, 600, 900, 1200, 1500].map(
    (dist) => ({
      distanceMm: dist,
      deflectionMicron: Math.round(maxDeflectionMicron * Math.exp(-0.0018 * dist))
    })
  );

  // 5. Predicted PCI & Remaining Life Calculations
  // Pavement degradation rate
  const annualPciDrop = Math.min(
    35,
    Number((2.5 * odolLoadFactor * (1.0 / waterDecayFactor)).toFixed(1))
  );
  const predictedPci = Math.max(
    10,
    Math.round(roadSegment.currentPci - annualPciDrop * 0.8)
  );
  const pciDropPoints = Math.round(roadSegment.currentPci - predictedPci);

  // Remaining structural life (years)
  const remainingYears = Math.max(
    0.3,
    Number((predictedPci / (annualPciDrop * 1.2)).toFixed(1))
  );

  // Estimated days until severe structural pothole formation
  const potholeHorizonDays = Math.max(
    3,
    Math.round(1800 / (odolLoadFactor * (1 / waterDecayFactor)))
  );

  // 6. Role 1: Field Civil Engineer Outputs
  const overlayThicknessCm =
    predictedPci < 70
      ? Number((Math.max(4.0, (75 - predictedPci) * 0.22)).toFixed(1))
      : 0;

  const overlayType =
    overlayThicknessCm > 8.0
      ? 'AC-BC (Binder Course) + AC-WC (Wearing Course) Poly-Modified Asphalt'
      : overlayThicknessCm > 0
      ? 'AC-WC (Asphalt Concrete Wearing Course) Overlay'
      : 'Routine Preventive Surface Seal / Crack Sealing';

  const fieldNotes =
    tensileStrainEt > 250
      ? `Regangan tarik dasar aspal (${tensileStrainEt} µε, RULE_BASED) termasuk tinggi pada skala mesin ini. Kriteria fungsi transfer belum dipilih (HD-04); indikatif, bukan desain.`
      : tensileStrainEt > 180
      ? `Regangan tarik dasar aspal (${tensileStrainEt} µε, RULE_BASED) menengah pada skala mesin ini; indikatif, bukan desain.`
      : `Regangan tarik (${tensileStrainEt} µε) dan tekan subgrade (${compressiveStrainEv} µε) dihitung mesin RULE_BASED; indikatif, bukan desain.`;

  // 7. Role 2: Operations Manager Outputs
  let alertStatus: AlertSeverity = 'GREEN';
  if (axleLoadTon > 18.0 || rainIntensityMmHr > 50 || predictedPci < 40) {
    alertStatus = 'RED';
  } else if (axleLoadTon > 14.0 || rainIntensityMmHr > 25 || predictedPci < 60) {
    alertStatus = 'YELLOW';
  }

  // Dynamic Seasonal Tonnage Limit (Ton)
  const maxAllowedDynamicTonnageTon = Number(
    Math.max(
      10.0,
      18.0 - rainIntensityMmHr * 0.08 - floodDurationHours * 0.2
    ).toFixed(1)
  );

  let wimActionRequired: 'ALLOW' | 'INSPECT_AND_WEIGH' | 'TRANSFER_CARGO_AND_PENALIZE' | 'REROUTE_MANDATORY' = 'ALLOW';
  if (alertStatus === 'RED') {
    wimActionRequired = axleLoadTon > 20.0 ? 'TRANSFER_CARGO_AND_PENALIZE' : 'REROUTE_MANDATORY';
  } else if (alertStatus === 'YELLOW') {
    wimActionRequired = 'INSPECT_AND_WEIGH';
  }

  const speedRestrictionKmh = alertStatus === 'RED' ? 30 : alertStatus === 'YELLOW' ? 50 : 70;
  const suggestedDetourCorridor =
    roadSegment.province === 'Jawa Barat'
      ? 'Tol Trans Jawa Koridor Alternatif Cipularang - Cikopo'
      : roadSegment.province === 'Sumatera Selatan'
      ? 'Jalur Alternatif Arteri Lintas Tengah'
      : 'Jalur Lingkar Luar Khusus Kendaraan Berat';

  const operationalAlertSummary =
    alertStatus === 'RED'
      ? `Sinyal tinggi (RULE_BASED): beban sumbu ${axleLoadTon} Ton dan hujan ${rainIntensityMmHr} mm/jam menaikkan faktor kerusakan relatif ${odolLoadFactor.toFixed(1)}x. Keputusan tindakan ada pada petugas.`
      : alertStatus === 'YELLOW'
      ? `Sinyal sedang (RULE_BASED): beban sumbu ${axleLoadTon} Ton di atas sumbu standar 8,16 t.`
      : `Sinyal rendah (RULE_BASED) untuk input yang dimasukkan; bukan pernyataan keselamatan.`;

  // 8. Role 3: Executive Policy Maker Outputs
  const baseYear = 2026;
  const pci5YearProjection = Array.from({ length: 6 }, (_, i) => {
    const yr = baseYear + i;
    const pciNoAct = Math.max(10, Math.round(predictedPci - i * annualPciDrop));
    const pciWithPreventive = Math.min(
      95,
      Math.round(predictedPci + i * 2.5 - (i > 0 ? 0 : 5))
    );
    return {
      year: yr,
      pciNoAction: pciNoAct,
      pciPreventiveAction: pciWithPreventive
    };
  });

  // Economic Damage Projections (in Billions IDR)
  const estimatedEconomicLossRupiahBillions = Number(
    (0.85 * odolLoadFactor * (roadSegment.lengthKm / 10)).toFixed(1)
  );
  const preventiveCostSavingsRupiahBillions = Number(
    (estimatedEconomicLossRupiahBillions * 0.72).toFixed(1)
  );

  const zeroOdolTargetImpactPercent = Math.min(
    95,
    Math.round((1 - 1 / odolLoadFactor) * 100)
  );

  const executiveBrief = `Ringkasan RULE_BASED untuk ${roadSegment.name}: beban sumbu dan kondisi hujan yang dimasukkan menaikkan indeks kerusakan relatif. Dampak biaya belum dihitung; hasil indikatif dan perlu tinjauan insinyur.`;

  // 9. Runtime telemetry. Nothing is measured by this rule-based engine, so every
  // performance field is null and the UI shows "belum diukur" (AGENTS.md rule 1,
  // F-02/F-14/F-21). Real figures may only come from measurements/*.json.
  const telemetry: IntelTelemetry = {
    deviceUsed: targetDevice,
    precisionUsed: precisionMode,
    measurementStatus: 'NOT_MEASURED',
    inferenceLatencyMs: null,
    powerConsumptionWatts: null,
    cpuUtilizationPercent: null,
    npuUtilizationPercent: null,
    throughputSps: null,
    physicsLossValue: null,
    dataLossValue: null
  };

  const tensors: TensorResults = {
    tensileStrainEt,
    compressiveStrainEv,
    surfaceDeflectionMaxMicron: maxDeflectionMicron,
    stressTopMpa,
    stressBottomMpa
  };

  const roleOutputs: RoleSpecificOutputs = {
    fieldEngineer: {
      recommendedOverlayThicknessCm: overlayThicknessCm,
      recommendedOverlayType: overlayType,
      potholeHorizonDays,
      deflectionBasin,
      structuralPriorityRank: predictedPci < 40 ? 1 : predictedPci < 60 ? 2 : 3,
      engineeringNotes: fieldNotes
    },
    operationsManager: {
      alertStatus,
      maxAllowedDynamicTonnageTon,
      wimActionRequired,
      speedRestrictionKmh,
      suggestedDetourCorridor,
      operationalAlertSummary
    },
    policyMaker: {
      pci5YearProjection,
      estimatedEconomicLossRupiahBillions,
      preventiveCostSavingsRupiahBillions,
      zeroOdolTargetImpactPercent,
      executiveBrief
    }
  };

  // AI Narrative (Role specific)
  const aiNarrative = {
    fieldEngineerNarrative: `[CATATAN TEKNIS — RULE_BASED, INDIKATIF]
Mesin rumus menghitung regangan tarik dasar aspal ${tensileStrainEt} µε dan regangan tekan tanah dasar ${compressiveStrainEv} µε pada CBR ${effectiveCbr.toFixed(1)}%. Faktor beban relatif (pangkat empat) ${odolLoadFactor.toFixed(1)}x. Opsi overlay yang dipertimbangkan: ${overlayThicknessCm} cm (${overlayType}); perlu verifikasi insinyur.`,
    operationsNarrative: `[SINYAL OPERASIONAL — RULE_BASED]
STATUS: ${alertStatus}. Input: beban sumbu ${axleLoadTon} Ton, curah hujan ${rainIntensityMmHr} mm/jam. Tindakan apa pun diputuskan petugas melalui alur kerja, bukan oleh sistem.`,
    policyMakerNarrative: `[RINGKASAN KEBIJAKAN — RULE_BASED]
Ruas ${roadSegment.name}: indeks kerusakan relatif meningkat seiring beban berlebih. Dampak biaya belum dihitung. Bukan dokumen resmi.`
  };

  return {
    id: `SIM-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    params,
    roadSegment,
    predictedPci,
    pciDropPoints,
    pavementLifeRemainingYears: remainingYears,
    tensors,
    roleOutputs,
    telemetry,
    aiNarrative
  };
}
