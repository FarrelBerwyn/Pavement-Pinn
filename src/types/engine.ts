/**
 * Contract of POST /api/engine/assess (relayed to the Python service /v1/assess,
 * Dokumen Induk v3 §4.8). Units: mm, MPa, tonnes, microstrain, years.
 */
export interface EngineAssessRequest {
  segment_id: string;
  layers: Array<{ h_mm: number; E_mpa: number; nu: number; source: string }>;
  subgrade: { cbr: number; state?: 'dry' | 'wet' };
  load?: { axle_t?: number; q_mpa?: number; dual_spacing_mm?: number | null };
  traffic?: { esal_day_p10: number; esal_day_p50: number; esal_day_p90: number; growth?: number };
  criterion?: 'AI' | 'AUS';
  n_mc?: number;
  seed?: number;
}

export interface Percentiles { p10: number; p50: number; p90: number }

export interface MonteCarloCondition {
  status: 'COMPUTED' | 'OUT_OF_DOMAIN' | 'CROSSCHECK_FAILED';
  condition?: 'dry' | 'wet';
  n?: number;
  life_years?: Percentiles;
  et_ue?: Percentiles;
  ev_ue?: Percentiles;
  governing?: 'fatigue' | 'rutting';
  sensitivity_spearman?: Record<string, number>;
  share_out_of_domain?: number;
  solved_exact?: number;
  crosscheck?: { n: number; max_err_pct: number; mean_err_pct: number };
  message?: string;
}

export interface EngineAssessResult {
  segment_id: string;
  mlet: { et_ue: number; ev_ue: number; a_mm: number; method: string; elapsed_ms: number };
  subgrade_E_mpa: number;
  allowable: { criterion: 'AI' | 'AUS'; nf: number; nd: number; governing: 'fatigue' | 'rutting' };
  life_years: (Percentiles & { uncertainty: string; label: string }) | null;
  monte_carlo:
    | { status: 'COMPUTED' | 'PARTIAL'; dry: MonteCarloCondition; wet: MonteCarloCondition; elapsed_ms: number; label: string }
    | { status: 'NO_TRAFFIC' | 'OUTSIDE_SURROGATE_SCOPE' | 'MODEL_UNAVAILABLE'; message: string }
    | null;
  surrogate: { version: string; precision: string; device: string; openvino_version: string } | null;
  assumptions: string[];
  status_label: 'COMPUTED';
  engine_version: string;
  device: { kind: string; processor: string; platform: string };
}
