// Этот файл теперь использует API бекенда
// Старые функции перенесены в api.ts

import {
  ScriptSegment,
  AnalysisInput,
} from "./types";
import * as api from "./api";

/** ------------------ Main Functions ------------------ */

/**
 * Анализ контента через бекенд API
 */
export async function analyzeContent(inputs: AnalysisInput[]) {
  return await api.createAnalysis(inputs);
}

/**
 * Генерация сценария через бекенд API
 */
export async function generateScript(
  topic: string,
  analysisId: string
): Promise<{ scriptId: string; segments: ScriptSegment[] }> {
  return await api.createScript(analysisId, topic);
}

/**
 * Генерация медиа теперь происходит через бекенд API
 * Эти функции больше не используются напрямую
 */
export async function generateImage(prompt: string): Promise<string> {
  // Deprecated: используйте generateMediaForSegment
  throw new Error("Используйте generateMediaForSegment через API");
}

export async function generateVideoFromImage(imageBase64: string, prompt: string): Promise<string> {
  // Deprecated: используйте generateMediaForSegment
  throw new Error("Используйте generateMediaForSegment через API");
}

export async function generateSpeech(text: string): Promise<string> {
  // Deprecated: используйте generateMediaForSegment
  throw new Error("Используйте generateMediaForSegment через API");
}
