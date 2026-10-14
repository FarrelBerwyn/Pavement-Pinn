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
