/**
 * useTranscription — manages the full record → upload → poll lifecycle.
 * Uses expo-audio (SDK 56) for recording.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteAsync } from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  type AudioRecorder,
} from 'expo-audio';
import { submitAudio, pollUntilDone, type JobResult, type JobStatus, ApiError } from '@/lib/api';
import { addTranscription, type StoredTranscription } from '@/lib/storage';

export type ProcessState =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'polling'
  | 'done'
  | 'error';

interface UseTranscriptionReturn {
  state: ProcessState;
  jobStatus: JobStatus | null;
  errorMessage: string;
  recordingDuration: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  result: StoredTranscription | null;
  reset: () => void;
}

function formatDuration(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
};

export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<ProcessState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingDuration, setRecordingDuration] = useState('0:00');
  const [result, setResult] = useState<StoredTranscription | null>(null);

  const abortRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 100);

  // Track recording duration from recorder state
  useEffect(() => {
    if (state === 'recording' && recorderState.isRecording) {
      setRecordingDuration(formatDuration(recorderState.durationMillis));
    }
  }, [recorderState.durationMillis, recorderState.isRecording, state]);

  const startRecording = useCallback(async () => {
    try {
      abortRef.current = false;
      setErrorMessage('');
      setResult(null);

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Microphone permission required');
        setState('error');
        return;
      }

      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
      startTimeRef.current = Date.now();
      setRecordingDuration('0:00');
      setState('recording');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start recording');
      setState('error');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      setState('uploading');
      await recorder.stop();

      const uri = recorder.uri;
      if (!uri) {
        throw new Error('No recording URI');
      }

      const fileName = `recording_${Date.now()}.m4a`;
      const elapsed = Date.now() - startTimeRef.current;
      const duration = formatDuration(elapsed);

      // Submit to API
      setJobStatus('queued');
      const { job_id } = await submitAudio(uri, fileName);

      // Clean up recording file
      deleteAsync(uri, { idempotent: true }).catch(() => {});

      // Poll for result
      setState('polling');
      const job = await pollUntilDone(job_id, (status) => {
        if (abortRef.current) return;
        setJobStatus(status);
      });

      if (abortRef.current) return;

      if (job.status === 'done' && job.result?.text) {
        const stored = await addTranscription({
          jobId: job.job_id,
          text: job.result.text,
          fileName: job.filename,
          duration,
          status: 'done',
        });
        setResult(stored);
        setState('done');
      } else if (job.status === 'failed') {
        setErrorMessage(job.error || 'Transcription failed');
        setState('error');
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setErrorMessage(msg);
        setState('error');
      }
    }
  }, [recorder]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState('idle');
    setJobStatus(null);
    setErrorMessage('');
    setResult(null);
    setRecordingDuration('0:00');
  }, []);

  return {
    state,
    jobStatus,
    errorMessage,
    recordingDuration,
    startRecording,
    stopRecording,
    result,
    reset,
  };
}
