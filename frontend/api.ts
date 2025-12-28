import { AnalysisResult, AnalysisInput, ScriptSegment, AnalysisStatus } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Преобразует ответ API в формат AnalysisResult
 */
function transformAnalysisResponse(data: any): AnalysisResult {
  return {
    id: data.id,
    timestamp: new Date(data.created_at).getTime(),
    sources: data.sources.map((s: any) => ({
      type: s.source_type,
      value: s.source_type === 'url' ? s.url : { data: '', mimeType: s.file_mime_type || 'video/mp4' },
      label: s.label,
    })),
    status: data.status.toUpperCase() as AnalysisStatus,
    transcript: data.transcript || [],
    stylePassport: data.style_passport || {},
    patterns: data.patterns || [],
    groundingSources: data.grounding_sources || [],
    generatedScripts: data.scripts?.map((script: any) => ({
      scriptId: script.id,
      topic: script.topic,
      content: script.segments.map((s: any) => ({
        id: s.id,
        timeframe: s.timeframe,
        visual: s.visual,
        audio: s.audio,
        media: s.media,
      })),
    })) || [],
  };
}

/**
 * Создание нового анализа
 */
export async function createAnalysis(inputs: AnalysisInput[]): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/analyses/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sources: inputs }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка создания анализа' }));
    throw new Error(error.error || error.detail || 'Ошибка создания анализа');
  }

  const data = await response.json();
  return transformAnalysisResponse(data);
}

/**
 * Получение анализа по ID
 */
export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/analyses/${id}/`);

  if (!response.ok) {
    throw new Error('Ошибка загрузки анализа');
  }

  const data = await response.json();
  return transformAnalysisResponse(data);
}

/**
 * Получение истории анализов
 */
export async function getHistory(): Promise<AnalysisResult[]> {
  const response = await fetch(`${API_BASE_URL}/analyses/history/`);

  if (!response.ok) {
    throw new Error('Ошибка загрузки истории');
  }

  const data = await response.json();
  return data.map(transformAnalysisResponse);
}

/**
 * Создание сценария
 */
export async function createScript(analysisId: string, topic: string): Promise<{
  scriptId: string;
  segments: ScriptSegment[];
}> {
  const response = await fetch(`${API_BASE_URL}/scripts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysis_id: analysisId,
      topic: topic,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка генерации сценария' }));
    throw new Error(error.error || error.detail || 'Ошибка генерации сценария');
  }

  const data = await response.json();
  return {
    scriptId: data.id,
    segments: data.segments.map((s: any) => ({
      id: s.id,
      timeframe: s.timeframe,
      visual: s.visual,
      audio: s.audio,
      media: s.media || { status: 'idle' },
    })),
  };
}

/**
 * Генерация медиа для сегмента
 */
export async function generateMediaForSegment(
  scriptId: string,
  segmentId: string
): Promise<ScriptSegment> {
  const response = await fetch(`${API_BASE_URL}/scripts/${scriptId}/generate_media/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ segment_id: segmentId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка генерации медиа' }));
    throw new Error(error.error || error.detail || 'Ошибка генерации медиа');
  }

  const data = await response.json();
  return {
    timeframe: data.timeframe,
    visual: data.visual,
    audio: data.audio,
    media: data.media || { status: 'idle' },
  };
}

