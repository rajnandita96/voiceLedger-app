/**
 * TranscriptionJobs — global store for in-progress transcription jobs.
 * Survives screen navigation so jobs complete even if the record modal is closed.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { deleteAsync, writeAsStringAsync, documentDirectory } from 'expo-file-system/legacy';
import { logger } from '@/lib/logger';
import { submitAudio, pollUntilDone, type JobStatus } from '@/lib/api';
import { addTranscription, updateTranscription, type StoredTranscription } from '@/lib/storage';

export interface ActiveJob {
  id: string;
  localId: string;
  jobId: string;
  fileName: string;
  duration: string;
  status: JobStatus | 'submitting';
  error?: string;
  text?: string;
  createdAt: string;
}

interface TranscriptionJobsContextType {
  jobs: ActiveJob[];
  /** Start a transcription job. Returns the local ID to track progress. */
  submitJob: (fileUri: string, fileName: string, duration: string) => Promise<string>;
  /** Call when the flow is done (result or error) to clean up the job from the active list */
  removeJob: (localId: string) => void;
  /** Replace all entries for a job with updated data */
  updateJob: (localId: string, updates: Partial<ActiveJob>) => void;
}

const TranscriptionJobsContext = createContext<TranscriptionJobsContextType | null>(null);

export function TranscriptionJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const updateJob = useCallback((localId: string, updates: Partial<ActiveJob>) => {
    setJobs((prev) => prev.map((j) => (j.localId === localId ? { ...j, ...updates } : j)));
  }, []);

  const removeJob = useCallback((localId: string) => {
    setJobs((prev) => prev.filter((j) => j.localId !== localId));
  }, []);

  const submitJob = useCallback(
    async (fileUri: string, fileName: string, duration: string): Promise<string> => {
      const localId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Create local pending entry so dashboard shows it
      const stored = await addTranscription({
        jobId: '',
        text: '',
        fileName,
        duration,
        status: 'queued',
      });

      const activeJob: ActiveJob = {
        id: stored.id,
        localId,
        jobId: '',
        fileName,
        duration,
        status: 'submitting',
        createdAt: new Date().toISOString(),
      };

      setJobs((prev) => [...prev, activeJob]);

      // Run the full pipeline in the background
      (async () => {
        try {
          // Expo Go: copy file to writable location
          let uploadUri = fileUri;
          if (Platform.OS === 'android' && fileUri.includes('host.exp.exponent')) {
            try {
              const destDir = documentDirectory;
              if (destDir) {
                const response = await fetch(fileUri);
                const buffer = await response.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                const destUri = `${destDir}upload_${Date.now()}.m4a`;
                await writeAsStringAsync(destUri, btoa(binary), { encoding: 'base64' });
                uploadUri = destUri;
              }
            } catch (e) {
              logger.warn('Expo Go copy fallback failed, trying direct upload', e);
            }
          }

          updateJob(localId, { status: 'queued' });
          const submitResult = await submitAudio(uploadUri, fileName);
          const jobId = submitResult.job_id;
          updateJob(localId, { jobId, status: 'processing' });
          await updateTranscription(stored.id, { jobId, status: 'processing' });

          // Clean up files
          deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          if (uploadUri !== fileUri) deleteAsync(uploadUri, { idempotent: true }).catch(() => {});

          const job = await pollUntilDone(jobId, (status) => {
            updateJob(localId, { status });
            updateTranscription(stored.id, { status }).catch(() => {});
          });

          if (job.status === 'done' && job.result?.text) {
            updateJob(localId, { status: 'done', text: job.result.text });
            await updateTranscription(stored.id, { text: job.result.text, status: 'done' });
          } else if (job.status === 'failed') {
            updateJob(localId, { status: 'failed', error: job.error || undefined });
            await updateTranscription(stored.id, {
              status: 'failed',
              error: job.error || undefined,
            });
          }

          // Keep completed jobs visible for a few seconds, then remove
          setTimeout(() => removeJob(localId), 5_000);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          logger.error('Background transcription failed', err);
          updateJob(localId, { status: 'failed', error: msg });
          await updateTranscription(stored.id, { status: 'failed', error: msg });
          setTimeout(() => removeJob(localId), 5_000);
        }
      })();

      return localId;
    },
    [updateJob, removeJob],
  );

  return (
    <TranscriptionJobsContext.Provider value={{ jobs, submitJob, removeJob, updateJob }}>
      {children}
    </TranscriptionJobsContext.Provider>
  );
}

export function useTranscriptionJobs() {
  const ctx = useContext(TranscriptionJobsContext);
  if (!ctx) throw new Error('useTranscriptionJobs must be used within TranscriptionJobsProvider');
  return ctx;
}
