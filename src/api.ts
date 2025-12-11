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
  remove_background?: boolean;  // Şeffaf arka plan
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
        remove_background: params.remove_background || false,
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
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean; can_rate: boolean }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/job/${jobId}/cancel`, {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, can_rate: data.can_rate };
    }
    return { success: false, can_rate: false };
  } catch {
    return { success: false, can_rate: false };
  }
}

/**
 * Get low score reasons list
 */
export async function getLowScoreReasons(): Promise<{
  reasons: Array<{ id: string; tr: string; en: string }>;
  note: string;
} | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback/low-score-reasons`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
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
  prompt_accuracy?: number;
  emotion_accuracy?: number;
  composition_score?: number;
  issues?: Record<string, boolean>;
  notes?: string;
  low_score_reasons?: string[];  // Düşük puan nedenleri
  low_score_details?: string;    // Detaylı açıklama
  was_cancelled?: boolean;       // İptal edildi mi
}): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: params.job_id,
        overall_score: params.overall_score,
        prompt_accuracy: params.prompt_accuracy || 3,
        emotion_accuracy: params.emotion_accuracy || 3,
        composition_score: params.composition_score || 3,
        issues: params.issues || {},
        notes: params.notes || '',
        low_score_reasons: params.low_score_reasons || [],
        low_score_details: params.low_score_details || '',
        was_cancelled: params.was_cancelled || false,
      }),
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
