/**
 * Client for the Python inference service (Dokumen Induk v3 D-23): Express forwards
 * engine requests to INFERENCE_URL. When the service is down the caller gets an explicit
 * INFERENCE_UNAVAILABLE error — never a locally invented result.
 */
export const DEFAULT_INFERENCE_URL = "http://127.0.0.1:8100";
const TIMEOUT_MS = 20_000;

export function inferenceUrl(): string {
  return (process.env.INFERENCE_URL || DEFAULT_INFERENCE_URL).replace(/\/+$/, "");
}

export type InferenceReply =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; body: unknown }
  | { ok: false; status: 503; unavailable: true; message: string };

export async function callInference(method: "GET" | "POST", path: string, payload?: unknown): Promise<InferenceReply> {
  try {
    const res = await fetch(`${inferenceUrl()}${path}`, {
      method,
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (error: any) {
    return { ok: false, status: 503, unavailable: true, message: error?.name === "TimeoutError" ? "Inference service timed out." : "Inference service is not reachable." };
  }
}
