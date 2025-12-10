import { BACKEND_URL } from './constants';
import type { BackendStatus, GenerationJob } from './types';

/**
 * Check backend status
 */
export async function checkBackendStatus(): Promise<BackendStatus | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Load the model
 */
export async function loadModel(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/load-model`, {
      method: 'POST',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start image generation
 */
export async function startGeneration(params: {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps?: number;
  guidance_scale?: number;
}): Promise<{ job_id: string } | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        width: params.width,
        height: params.height,
        steps: params.steps || 25,
        guidance_scale: params.guidance_scale || 7.5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Generation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Generation error:', error);
    return null;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<GenerationJob | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/job/${jobId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Submit feedback for a generation
 */
export async function submitFeedback(params: {
  job_id: string;
  overall_score: number;
  prompt_accuracy: number;
  emotion_accuracy: number;
  has_hand_issues?: boolean;
  has_face_issues?: boolean;
  has_blur_issues?: boolean;
  has_text_issues?: boolean;
  has_composition_issues?: boolean;
  has_anatomy_issues?: boolean;
  user_comment?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/learning/stats`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Analyze emotion
 */
export async function analyzeEmotion(text: string): Promise<{
  primary_emotion: string;
  intensity: number;
  secondary_emotions: Array<[string, number]>;
  confidence: number;
  context_notes: string[];
  visual_cues: Record<string, string>;
} | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze-emotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cleanup old files
 */
export async function cleanupFiles(maxAgeHours: number = 24): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_age_hours: maxAgeHours }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get generated image URL
 */
export function getImageUrl(filename: string): string {
  return `${BACKEND_URL}/generated_images/${filename}`;
}
