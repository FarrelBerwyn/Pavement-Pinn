/**
 * Provenance of the bundled datasets. Nothing shipped in src/data is field data: the
 * UI uses these labels so demo content is never presented as measured or observed.
 */
import type { Language } from '../i18n/translations';

export type DataProvenance = 'SYNTHETIC' | 'ILLUSTRATIVE' | 'SIMULATED' | 'RULE_BASED';

export const DATASET_PROVENANCE = {
  /** Segment attributes (PCI, CBR, thickness, traffic) in data/reference/indonesianRoads.ts. */
  roadSegments: 'SYNTHETIC',
  /** Segment polylines are a few hand-placed points, not surveyed road geometry. */
  roadGeometry: 'ILLUSTRATIVE',
  /** Reports in data/mock/communityReports.ts and reports created in the demo session. */
  communityReports: 'SYNTHETIC',
  /** Report photos are stock images, not evidence of the reported location. */
  reportPhotos: 'ILLUSTRATIVE',
  /** WIM station readings and truck records. */
  wimTelemetry: 'SIMULATED',
  /** Strain, PCI and life figures come from the deterministic formula in engines/pinn. */
  riskEstimate: 'RULE_BASED'
} as const satisfies Record<string, DataProvenance>;

export const DEMO_DATA_LABEL: Record<Language, string> = {
  id: 'DATA DEMO',
  en: 'DEMO DATA'
};

export const DEMO_DATA_NOTE: Record<Language, string> = {
  id: 'Ruas jalan, laporan, dan foto pada peta ini adalah data contoh, bukan data lapangan. Garis ruas adalah geometri ilustratif.',
  en: 'Road segments, reports and photos on this map are sample data, not field data. Segment lines are illustrative geometry.'
};

export const ILLUSTRATIVE_PHOTO_LABEL: Record<Language, string> = {
  id: 'Foto ilustrasi',
  en: 'Illustrative photo'
};
