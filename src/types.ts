// Backend status interface
export interface BackendStatus {
  online: boolean;
  device: {
    mode: string;
    device: string;
    gpu_info: string | null;
    vram_gb: number;
  };
  model: {
    loaded: boolean;
    loading: boolean;
    name: string | null;
  };
  queue: {
    queue_size: number;
    pending: number;
    processing: number;
  };
  recommended_settings: {
    steps: number;
    width: number;
    height: number;
    estimated_time: string;
  };
}

// Generation job interface
export interface GenerationJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_path?: string;
  image_url?: string;
  error?: string;
}

// Character interface
export interface Character {
  id: string;
  name: string;
  appearance: string;
  clothing: string;
  traits: string;
}

// Scene interface
export interface Scene {
  id: string;
  title: string;
  description: string;
  objects: string[];
  mood: string;
  lighting: string;
  environment: string;
  importantDetails: string[];
  faithfulPrompt: string;
  creativePrompt: string;
  negativePrompt: string;
  resolution: { id: string; width: number; height: number };
  // Generation state
  generatingFaithful?: boolean;
  generatingCreative?: boolean;
  faithfulJobId?: string;
  creativeJobId?: string;
  faithfulImageUrl?: string;
  creativeImageUrl?: string;
  generationError?: string;
}

// Style settings interface
export interface StyleSettings {
  style: string;
  colorPalette: string;
  composition: string;
  format: string;
  resolution: string;
  customStyle: string;
}

// Style option interface
export interface StyleOption {
  id: string;
  name: string;
  desc: string;
}

// Color palette interface
export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

// Resolution interface
export interface Resolution {
  id: string;
  name: string;
  width: number;
  height: number;
  desc: string;
  vram: string;
  time: string;
  quality: 'draft' | 'standard' | 'high' | 'ultra';
}

// Quality preset interface
export interface QualityPreset {
  id: string;
  name: string;
  icon: string;
  desc: string;
  resolutions: string[];
  color: string;
}

// Analysis result interfaces
export interface IdiomMatch {
  idiom: string;
  visual: string;
}

export interface MetaphorMatch {
  pattern: string;
  visual: string;
}

export interface AbstractConcept {
  concept: string;
  visual: string;
}

export interface EmotionResult {
  emotion: string;
  intensity: number;
  visual: string;
}

export interface GenreDetection {
  genre: string;
  confidence: number;
  visualStyle: string;
}

export interface ComplexAnalysis {
  intents: string[];
  conditions: string[];
  timeExpressions: string[];
  interactions: string[];
  perspective: string;
  symbols: string[];
  sensoryCues: string[];
  spatialRelations: string[];
}

export interface SceneAnalysis {
  sceneType: string;
  dialogueTone: string | null;
  relationships: string[];
  actionIntensity: number;
  historicalPeriod: string | null;
  artistStyles: string[];
  cameraAngle: string;
  lightingPreset: string;
}
