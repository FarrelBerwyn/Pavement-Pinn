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
  generateNarrative: '/api/generate-narrative'
} as const;

/**
 * Workflow, identity and system endpoints added for the cross-role workflow (P2).
 * Kept separate from API_PATHS, whose six pre-restructure entries are a frozen contract.
 * Contract details: docs/api/WORKFLOW_API.md.
 */
export const WORKFLOW_API_PATHS = {
  /** Credential login (demo credentials while DEMO_AUTH is on). */
  login: '/api/auth/login',
  /** Same call as `login` under its older name; also requires credentials. */
  demoSession: '/api/auth/demo-session',
  anonymousSession: '/api/auth/anonymous',
  me: '/api/auth/me',
  reports: '/api/workflow/reports',
  report: '/api/workflow/reports/:id',
  transitions: '/api/workflow/reports/:id/transitions',
  content: '/api/workflow/reports/:id/content',
  audit: '/api/workflow/audit',
  engineers: '/api/workflow/engineers',
  systemHealth: '/api/system-health',
  roadStory: '/api/road-segments/:id/story',
  riskMap: '/api/risk-map'
} as const;

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

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
