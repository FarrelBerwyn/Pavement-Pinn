import { RoadSegment, SimulationParams } from '../types';

export interface WimScrapedRecord {
  id: string;
  stationId: string;
  stationName: string;
  corridorName: string;
  province: string;
  timestamp: string;
  vehicleClass: string; // e.g., 'Golongan 7B - Truk 4 Sumbu'
  licensePlate: string;
  grossVehicleWeightTon: number;
  maxAxleLoadTon: number;
  axleLoads: number[]; // [Sumbu 1, Sumbu 2, Sumbu 3, ...]
  legalLimitTon: number;
  overloadPercent: number;
  isOdol: boolean;
  speedKmH: number;
  confidenceScore: number;
  fwdDeflectionMicron: number;
  pinnDataLossContribution: number;
}

export interface ScraperTelemetry {
  targetUrl: string;
  status: 'IDLE' | 'SCRAPING' | 'PREPROCESSING' | 'TRAINING_PINN' | 'READY';
  recordsFetched: number;
  odolCount: number;
  avgAxleLoadTon: number;
  lastSyncTime: string;
  httpStatus: number;
  payloadSizeBytesKb: number;
  pinnTrainingEpochs: number;
  initialLoss: number;
  currentLoss: number;
  dataLoss: number;
  physicsLoss: number;
  boundaryLoss: number;
}

// Simulated Live Bina Marga WIM Scraper & Pipeline Connector
export class BinaMargaWimService {
  private static readonly TARGET_URL = 'https://binamarga.pu.go.id/dashboardbm/wim/index.html';

  public static getTargetUrl(): string {
    return this.TARGET_URL;
  }

  // Generate real-looking scraped Bina Marga WIM records from national corridors
  public static fetchBinaMargaWimDataset(): WimScrapedRecord[] {
    const rawStations = [
      { id: 'WIM-JBR-01', name: 'Jembatan Timbang Losari (Pantura)', corridor: 'Pantura Cirebon - Brebes', province: 'Jawa Barat' },
      { id: 'WIM-JTG-02', name: 'WIM Kaliwungu Kendal', corridor: 'Semarang - Kendal', province: 'Jawa Tengah' },
      { id: 'WIM-JTI-03', name: 'WIM Widang Tuban', corridor: 'Surabaya - Tuban', province: 'Jawa Timur' },
      { id: 'WIM-SUM-01', name: 'WIM Bandar Lampung', corridor: 'Bakauheni - Terbanggi Besar', province: 'Lampung' },
      { id: 'WIM-SUM-02', name: 'WIM Indralaya Ogan Ilir', corridor: 'Palembang - Indralaya', province: 'Sumatera Selatan' },
      { id: 'WIM-BAL-01', name: 'WIM Cekik Gilimanuk', corridor: 'Denpasar - Gilimanuk', province: 'Bali' }
    ];

    const plates = ['B 9284 UIV', 'E 8812 KT', 'H 9011 BA', 'L 8722 UI', 'BE 9012 AA', 'BG 8192 OA', 'DK 8821 FB'];
    const vClasses = [
      'Golongan 6B - Truk 3 Sumbu (Tronton)',
      'Golongan 7A - Truk Tempelan 4 Sumbu',
      'Golongan 7B - Truk Gandengan 5 Sumbu (ODOL Big Rig)',
      'Golongan 7C - Truk Container 6 Sumbu'
    ];

    const records: WimScrapedRecord[] = [];

    for (let i = 0; i < 28; i++) {
      const station = rawStations[i % rawStations.length];
      const isOdol = Math.random() > 0.35; // ~65% ODOL rate on heavy corridors
      const legalLimitTon = 10.0; // Standard MST
      const maxAxleLoadTon = isOdol
        ? Number((12.5 + Math.random() * 9.5).toFixed(1)) // 12.5 - 22.0 Ton
        : Number((7.5 + Math.random() * 2.3).toFixed(1)); // 7.5 - 9.8 Ton

      const grossVehicleWeightTon = Number((maxAxleLoadTon * (2.8 + Math.random() * 1.5)).toFixed(1));
      const overloadPercent = Math.max(0, Math.round(((maxAxleLoadTon - legalLimitTon) / legalLimitTon) * 100));

      const axleCount = 3 + (i % 3);
      const axleLoads = Array.from({ length: axleCount }, (_, idx) =>
        idx === 1 || idx === 2
          ? maxAxleLoadTon
          : Number((maxAxleLoadTon * (0.4 + Math.random() * 0.3)).toFixed(1))
      );

      // FWD deflection Micron estimated by Burmister layered elasticity from axle load
      const fwdDeflectionMicron = Math.round((maxAxleLoadTon * 48.0) / Math.pow(12 / 10, 0.5));
      const pinnDataLossContribution = Number((Math.pow(maxAxleLoadTon - legalLimitTon, 2) * 0.0012).toFixed(5));

      const dateObj = new Date(Date.now() - i * 180000); // every 3 mins back
      const timestamp = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      records.push({
        id: `BM-WIM-REC-${1000 + i}`,
        stationId: station.id,
        stationName: station.name,
        corridorName: station.corridor,
        province: station.province,
        timestamp,
        vehicleClass: vClasses[i % vClasses.length],
        licensePlate: plates[i % plates.length],
        grossVehicleWeightTon,
        maxAxleLoadTon,
        axleLoads,
        legalLimitTon,
        overloadPercent,
        isOdol,
        speedKmH: Math.round(45 + Math.random() * 30),
        confidenceScore: Number((96.5 + Math.random() * 3.2).toFixed(1)),
        fwdDeflectionMicron,
        pinnDataLossContribution
      });
    }

    return records;
  }

  // Simulates full ETL pipeline & PINN loss minimization using scraped Bina Marga dataset
  public static runEthAndPinnTraining(records: WimScrapedRecord[]) {
    const totalCount = records.length;
    const odolRecords = records.filter(r => r.isOdol);
    const avgAxleLoad = Number((records.reduce((acc, r) => acc + r.maxAxleLoadTon, 0) / totalCount).toFixed(2));

    // Calculate Data Loss L_data (MSE of predicted vs WIM observed axle loads)
    const dataLoss = Number((records.reduce((acc, r) => acc + r.pinnDataLossContribution, 0) / totalCount).toFixed(6));

    // Calculate Physics Loss L_physics (PDE Residual of Burmister Elasticity Equations)
    // Residual = || E1*d2w/dx2 - q(x) ||^2
    const physicsLoss = Number((dataLoss * 1.84 + 0.00215).toFixed(6));

    // Calculate Boundary Condition Loss L_boundary (Stress continuity across asphalt & subgrade interface)
    const boundaryLoss = Number((dataLoss * 0.42 + 0.00085).toFixed(6));

    const totalLoss = Number((dataLoss + 0.75 * physicsLoss + 0.25 * boundaryLoss).toFixed(6));

    return {
      recordsFetched: totalCount,
      odolCount: odolRecords.length,
      odolPercent: Math.round((odolRecords.length / totalCount) * 100),
      avgAxleLoadTon: avgAxleLoad,
      dataLoss,
      physicsLoss,
      boundaryLoss,
      totalLoss,
      epochHistory: [
        { epoch: 1, loss: Number((totalLoss * 4.2).toFixed(5)), dataLoss: Number((dataLoss * 3.8).toFixed(5)), physicsLoss: Number((physicsLoss * 4.5).toFixed(5)) },
        { epoch: 20, loss: Number((totalLoss * 2.8).toFixed(5)), dataLoss: Number((dataLoss * 2.5).toFixed(5)), physicsLoss: Number((physicsLoss * 3.1).toFixed(5)) },
        { epoch: 50, loss: Number((totalLoss * 1.9).toFixed(5)), dataLoss: Number((dataLoss * 1.7).toFixed(5)), physicsLoss: Number((physicsLoss * 2.1).toFixed(5)) },
        { epoch: 80, loss: Number((totalLoss * 1.3).toFixed(5)), dataLoss: Number((dataLoss * 1.2).toFixed(5)), physicsLoss: Number((physicsLoss * 1.4).toFixed(5)) },
        { epoch: 100, loss: totalLoss, dataLoss, physicsLoss }
      ]
    };
  }
}
