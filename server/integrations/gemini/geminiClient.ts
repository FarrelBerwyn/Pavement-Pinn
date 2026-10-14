import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

/**
 * Lazily creates the Gemini client. Returns null when GEMINI_API_KEY is absent or is
 * the template placeholder — callers must then use the offline rule-engine narrative.
 * The key is server-side only and must never be exposed through a VITE_* variable.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn("Failed to initialize Gemini AI client:", err);
    }
  }
  return aiClient;
}
