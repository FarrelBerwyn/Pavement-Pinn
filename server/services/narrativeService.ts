import type { GoogleGenAI } from "@google/genai";
import type { NarrativeSource } from "../../src/types";

export interface NarrativeResult {
  narrative: string;
  source: NarrativeSource;
}

export const NARRATIVE_MODEL = "gemini-3.7-flash";

/** The only role values that are ever forwarded to the language model. */
const KNOWN_ROLES: readonly string[] = [
  "FIELD_ENGINEER",
  "OPERATIONS_MANAGER",
  "POLICY_MAKER",
  "PUBLIC_REPORTER",
  "PUBLIC_VIEWER"
];

export function isKnownRole(role: unknown): role is string {
  return typeof role === "string" && KNOWN_ROLES.includes(role);
}

/**
 * Reduce a client-supplied value to one short line before it goes into the prompt.
 * The endpoint is unauthenticated, so everything in the request body is untrusted:
 * control characters (including newlines) are removed and the length is capped, which
 * stops a caller from appending their own instructions or an arbitrarily long prompt.
 * Well-formed simulation values (finite numbers, short labels) pass through unchanged.
 */
export function promptField(value: unknown, maxLength = 120): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "n/a";
  if (typeof value !== "string") return "n/a";
  const singleLine = value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  return singleLine.slice(0, maxLength) || "n/a";
}

/**
 * Deterministic, offline narrative (the "rule engine" text). Prefers the narrative the
 * PINN engine already embedded in the simulation result; otherwise fills a template.
 * simulationData is client-supplied and intentionally loosely typed.
 */
export function buildFallbackNarrative(role: string, simulationData: any): string {
  if (role === "FIELD_ENGINEER") {
    return (
      simulationData?.aiNarrative?.fieldEngineerNarrative ||
      `[ANALISIS REKAYASA STRUKTURAL BBPJN]\nSimulasi PINN mendeteksi regangan tarik dasar aspal εt sebesar ${simulationData?.tensors?.tensileStrainEt || 180} µε dan regangan tekan tanah dasar εv sebesar ${simulationData?.tensors?.compressiveStrainEv || 320} µε. Laju deteriorasi akibat beban ODOL memproyeksikan pembentukan retak lelah. Rekomendasi perbaikan: Tebal overlay ${simulationData?.roleOutputs?.fieldEngineer?.recommendedOverlayThicknessCm || 6} cm AC-WC.`
    );
  }
  if (role === "OPERATIONS_MANAGER") {
    return (
      simulationData?.aiNarrative?.operationsNarrative ||
      `[EVALUASI OPERASIONAL WIM & BPTD]\nBeban sumbu kendaraan ${simulationData?.params?.axleLoadTon || 18} Ton terdeteksi melampaui ambang batas izin (10 Ton). Tingkat akselerasi kerusakan perkerasan jalan mencapai level kritis. Sinyal WIM mengaktifkan prosedur penindakan tilang otomatis ANPR dan instruksi pengalihan rute truk.`
    );
  }
  return (
    simulationData?.aiNarrative?.policyMakerNarrative ||
    `[RINGKASAN KEBIJAKAN PRESERVASI EKSEKUTIF]\nImplementasi program preservasi jalan preventif dan penegakan Zero ODOL 2027 diproyeksikan memberikan efisiensi anggaran APBN sebesar Rp ${simulationData?.roleOutputs?.policyMaker?.preventiveCostSavingsRupiahBillions || 38.5} Miliar serta mempertahankan Indeks Kondisi Jalan (PCI) pada tingkat Mantap.`
  );
}

export function buildNarrativePrompt(role: string, simulationData: any): string {
  const prompt = `Anda adalah Asisten Kecerdasan Buatan PAVEMENT-PINN (Physics-Informed Neural Network + Intel OpenVINO Edge AI) untuk pengelolaan infrastruktur jalan nasional Indonesia.

Berikan analisis dan rekomendasi yang sangat ringkas, profesional, dan dapat ditindaklanjuti (actionable) khusus untuk peran: ${promptField(role, 40)}.

Data Hasil Simulasi:
- Ruas Jalan: ${promptField(simulationData?.roadSegment?.name)} (${promptField(simulationData?.roadSegment?.province)})
- Beban Sumbu: ${promptField(simulationData?.params?.axleLoadTon)} Ton (Batas ODOL: 10 Ton)
- Intensitas Hujan: ${promptField(simulationData?.params?.rainIntensityMmHr)} mm/jam
- Subgrade CBR: ${promptField(simulationData?.params?.subgradeCbrPercent)}%
- Prediksi PCI: ${promptField(simulationData?.predictedPci)}/100
- Regangan Tarik dasar Aspal (εt): ${promptField(simulationData?.tensors?.tensileStrainEt)} µε
- Tegangan Tekan Subgrade (εv): ${promptField(simulationData?.tensors?.compressiveStrainEv)} µε
- Estimasi Hari Pembentukan Lubang: ${promptField(simulationData?.roleOutputs?.fieldEngineer?.potholeHorizonDays)} hari
- Rekomendasi Overlay: ${promptField(simulationData?.roleOutputs?.fieldEngineer?.recommendedOverlayThicknessCm)} cm
- Status Alert WIM: ${promptField(simulationData?.roleOutputs?.operationsManager?.alertStatus)}
- Tindakan Penindakan WIM: ${promptField(simulationData?.roleOutputs?.operationsManager?.wimActionRequired)}
- Potensi Penghematan Anggaran Preservasi: Rp ${promptField(simulationData?.roleOutputs?.policyMaker?.preventiveCostSavingsRupiahBillions)} Miliar

Instruksi Format:
- Untuk FIELD_ENGINEER: Fokus pada kriteria rekayasa struktur, regangan kritis, dan spesifikasi tebal overlay.
- Untuk OPERATIONS_MANAGER: Fokus pada sinyal operasional WIM, keselamatan lalu lintas, dan penindakan ODOL.
- Untuk POLICY_MAKER: Fokus pada efisiensi anggaran APBN, dampak ekonomi, dan Zero ODOL 2027.
- Panjang jawaban 3-4 kalimat padat.`;

  return prompt;
}

/**
 * Generates the role-specific narrative. Never throws: without a Gemini client, or when
 * the Gemini call fails, it degrades to the offline narrative and reports the source.
 */
export async function generateNarrative(
  role: string,
  simulationData: any,
  ai: GoogleGenAI | null
): Promise<NarrativeResult> {
  const getFallbackNarrative = () => buildFallbackNarrative(role, simulationData);

  // Unknown roles are answered from the offline text and never forwarded to Gemini.
  if (!ai || !isKnownRole(role)) {
    return { narrative: getFallbackNarrative(), source: "rule-engine-offline" };
  }

  try {
    const prompt = buildNarrativePrompt(role, simulationData);

    const response = await ai.models.generateContent({
      model: NARRATIVE_MODEL,
      contents: prompt
    });

    return { narrative: response.text || getFallbackNarrative(), source: NARRATIVE_MODEL };
  } catch (err: any) {
    console.warn("Gemini API call failed (using fallback narrative):", err?.message || err);

    return { narrative: getFallbackNarrative(), source: "rule-engine-fallback" };
  }
}
