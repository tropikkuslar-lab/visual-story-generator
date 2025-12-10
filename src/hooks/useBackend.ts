import { useState, useEffect, useCallback } from 'react';
import { checkBackendStatus, loadModel as loadModelApi, getJobStatus, startGeneration } from '../api';
import type { BackendStatus, GenerationJob } from '../types';

interface UseBackendReturn {
  backendStatus: BackendStatus | null;
  isOnline: boolean;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  checkingBackend: boolean;
  refreshStatus: () => Promise<void>;
  loadModel: () => Promise<void>;
  generateImage: (params: {
    prompt: string;
    negative_prompt: string;
    width: number;
    height: number;
    steps?: number;
    guidance_scale?: number;
  }) => Promise<GenerationJob | null>;
  pollJobStatus: (jobId: string, onUpdate: (job: GenerationJob) => void) => () => void;
}

export function useBackend(): UseBackendReturn {
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  const refreshStatus = useCallback(async () => {
    setCheckingBackend(true);
    try {
      const status = await checkBackendStatus();
      setBackendStatus(status ? { ...status, online: true } : null);
    } catch {
      setBackendStatus(null);
    } finally {
      setCheckingBackend(false);
    }
  }, []);

  const loadModel = useCallback(async () => {
    await loadModelApi();
    // Poll until model is loaded
    const pollInterval = setInterval(async () => {
      const status = await checkBackendStatus();
      if (status) {
        setBackendStatus({ ...status, online: true });
        if (status.model.loaded && !status.model.loading) {
          clearInterval(pollInterval);
        }
      }
    }, 2000);
  }, []);

  const generateImage = useCallback(async (params: {
    prompt: string;
    negative_prompt: string;
    width: number;
    height: number;
    steps?: number;
    guidance_scale?: number;
  }): Promise<GenerationJob | null> => {
    const result = await startGeneration(params);
    if (result) {
      return {
        job_id: result.job_id,
        status: 'pending'
      };
    }
    return null;
  }, []);

  const pollJobStatus = useCallback((
    jobId: string,
    onUpdate: (job: GenerationJob) => void
  ): () => void => {
    let active = true;

    const poll = async () => {
      if (!active) return;

      const status = await getJobStatus(jobId);
      if (status && active) {
        onUpdate(status);

        if (status.status === 'pending' || status.status === 'processing') {
          setTimeout(poll, 1000);
        }
      }
    };

    poll();

    return () => {
      active = false;
    };
  }, []);

  // Initial status check and periodic refresh
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    backendStatus,
    isOnline: backendStatus?.online ?? false,
    isModelLoaded: backendStatus?.model.loaded ?? false,
    isModelLoading: backendStatus?.model.loading ?? false,
    checkingBackend,
    refreshStatus,
    loadModel,
    generateImage,
    pollJobStatus
  };
}
