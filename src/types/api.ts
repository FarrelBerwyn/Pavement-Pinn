/**
 * HTTP API contracts shared by the Express server (server/) and the frontend
 * API clients (src/services/api/). Paths and payload shapes mirror the
 * pre-restructure server.ts exactly — see docs/api/API_INVENTORY.md.
 */
import type { UserRole } from './rbac';
import type { RoadSegment } from './road';
import type { SimulationParams, SimulationResult } from './simulation';

export const API_PATHS = {
  health: '/api/health',
  roads: '/api/roads',
  simulate: '/api/simulate',
  openvinoExportIr: '/api/openvino/export-ir',
  openvinoExportConfig: '/api/openvino/export-config',
  generateNarrative: '/api/generate-narrative'
} as const;

export interface HealthResponse {
  status: 'ok';
  appName: string;
  timestamp: string;
}

export type RoadsResponse = RoadSegment[];

export interface SimulateRequest {
  params: SimulationParams;
}

export type SimulateResponse =
  | { success: true; result: SimulationResult }
  | { success: false; error: string };

/** Which generator produced the narrative text. */
export type NarrativeSource = 'rule-engine-offline' | 'rule-engine-fallback' | 'gemini-3.7-flash';

export interface NarrativeRequest {
  role: UserRole;
  simulationData: SimulationResult;
}

export interface NarrativeResponse {
  success: true;
  narrative: string;
  source: NarrativeSource;
}

/** Query string accepted by both OpenVINO export endpoints (all optional). */
export interface OpenvinoExportQuery {
  device?: string;
  precision?: string;
  streams?: string;
}
