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
/** Formats a value from the simulation, or says it is missing; never substitutes a default number. */
function fmt(value: unknown, unit: string): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value} ${unit}` : "tidak tersedia";
}

export function buildFallbackNarrative(role: string, simulationData: any): string {
  if (role === "FIELD_ENGINEER") {
    return (
      simulationData?.aiNarrative?.fieldEngineerNarrative ||
      `[CATATAN TEKNIS - RULE_BASED, INDIKATIF]
Regangan tarik dasar aspal: ${fmt(simulationData?.tensors?.tensileStrainEt, "µε")}; regangan tekan tanah dasar: ${fmt(simulationData?.tensors?.compressiveStrainEv, "µε")}. Nilai dari mesin rumus, bukan desain; opsi perbaikan diputuskan insinyur.`
    );
  }
  if (role === "OPERATIONS_MANAGER") {
    return (
      simulationData?.aiNarrative?.operationsNarrative ||
      `[SINYAL OPERASIONAL - RULE_BASED]
Beban sumbu yang dimasukkan: ${fmt(simulationData?.params?.axleLoadTon, "Ton")} (sumbu standar 8,16 t). Tindakan apa pun diputuskan petugas melalui alur kerja, bukan oleh sistem.`
    );
  }
  return (
    simulationData?.aiNarrative?.policyMakerNarrative ||
    `[RINGKASAN KEBIJAKAN - RULE_BASED]
Ringkasan indikatif dari mesin rumus. Dampak biaya belum dihitung. Bukan dokumen resmi.`
  );
}

export function buildNarrativePrompt(role: string, simulationData: any): string {
  const prompt = `Anda adalah Asisten Kecerdasan Buatan PAVEMENT-PINN (mesin rumus RULE_BASED, PI-surrogate direncanakan; runtime Intel OpenVINO) untuk pengelolaan infrastruktur jalan nasional Indonesia.

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
- Dampak biaya: belum dihitung (jangan menyebut angka penghematan)

Instruksi Format:
- Untuk FIELD_ENGINEER: Fokus pada kriteria rekayasa struktur, regangan kritis, dan spesifikasi tebal overlay.
- Untuk OPERATIONS_MANAGER: Fokus pada sinyal operasional WIM, keselamatan lalu lintas, dan penindakan ODOL.
- Untuk POLICY_MAKER: Fokus pada prioritas penanganan (dampak biaya belum dihitung — jangan menyebut angka penghematan), dan Zero ODOL 2027.
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
