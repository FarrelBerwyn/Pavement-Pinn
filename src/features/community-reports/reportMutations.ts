import type { DamageReport, ReportMutationOutcome } from '../../types';

/**
 * Wait for a report create/edit callback. Legacy synchronous callbacks count as saved;
 * workflow-backed callbacks resolve only after the server stored the change.
 */
export async function settleMutation(result: void | Promise<ReportMutationOutcome>, submitted: DamageReport): Promise<ReportMutationOutcome> {
  const outcome = (await result) as ReportMutationOutcome | undefined;
  return outcome ? outcome : { ok: true, report: submitted };
}
