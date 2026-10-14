import { API_PATHS, NarrativeResponse, SimulationResult, UserRole } from '../../types';
import { apiUrl } from './client';

/**
 * POST /api/generate-narrative
 *
 * Rejects on network failure or a non-JSON body; callers fall back to the
 * narrative already embedded in the SimulationResult.
 */
export async function requestAiNarrative(role: UserRole, simulationData: SimulationResult): Promise<NarrativeResponse> {
  const resp = await fetch(apiUrl(API_PATHS.generateNarrative), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, simulationData })
  });
  return resp.json();
}

/** Download URL for the illustrative OpenVINO IR descriptor (GET /api/openvino/export-ir). */
export function openvinoIrExportUrl(device: string, precision: string): string {
  return `${apiUrl(API_PATHS.openvinoExportIr)}?device=${device}&precision=${precision}`;
}

/** Download URL for the deployment config JSON (GET /api/openvino/export-config). */
export function openvinoConfigExportUrl(device: string, precision: string): string {
  return `${apiUrl(API_PATHS.openvinoExportConfig)}?device=${device}&precision=${precision}`;
}
