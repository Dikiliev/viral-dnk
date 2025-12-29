
export enum AnalysisStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  DOWNLOADING = 'DOWNLOADING',
  TRANSCRIBING = 'TRANSCRIBING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface TranscriptSegment {
  start: string;
  end: string;
  text: string;
}

export interface StylePassport {
  structure: {
    segment: string;
    start: string;
    end: string;
    description: string;
  }[];
  speech_rate_wpm: number;
  catchphrases: string[];
  fillers: string[];
  sentiment: string;
  tone_tags: string[];
  visual_context: string[];
}

export interface ContentPattern {
  name: string;
  description: string;
  impact: 'Высокий' | 'Средний' | 'Низкий';
  evidence_segments: string[];
}

export interface ScriptSegment {
  id?: string;
  timeframe: string;
  visual: string;
  audio: string;
  media?: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    status: 'idle' | 'generating_image' | 'generating_video' | 'generating_audio' | 'done' | 'error';
    kieTaskId?: string;
    kieModel?: string;
  };
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface AnalysisInput {
  type: 'url' | 'file';
  value: string | { data: string; mimeType: string };
  label: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  sources: AnalysisInput[];
  status: AnalysisStatus;
  transcript: TranscriptSegment[]; // Combined or representative transcript
  stylePassport: StylePassport;
  patterns: ContentPattern[];
  groundingSources?: GroundingSource[];
  generatedScripts: {
    scriptId?: string;
    topic: string;
    content: ScriptSegment[];
  }[];
}
