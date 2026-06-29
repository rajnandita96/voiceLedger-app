/**
 * useTranscription — manages the full record → upload → poll lifecycle.
 */

import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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

export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<ProcessState>('idle');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingDuration, setRecordingDuration] = useState('0:00');
  const [result, setResult] = useState<StoredTranscription | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortRef = useRef(false);

  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      abortRef.current = false;
      setErrorMessage('');
      setResult(null);

      // Request permissions
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Microphone permission required');
        setState('error');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setState('recording');

      // Update duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(formatDuration(elapsed));
      }, 200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start recording');
      setState('error');
    }
  }, [formatDuration]);

  const stopRecording = useCallback(async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!recordingRef.current) return;

      setState('uploading');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) {
        throw new Error('No recording URI');
      }

      const fileName = `recording_${Date.now()}.m4a`;
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const duration = formatDuration(elapsed);

      // Submit to API
      setJobStatus('queued');
      const { job_id } = await submitAudio(uri, fileName);

      // Clean up recording file
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

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
        const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Unknown error');
        setErrorMessage(msg);
        setState('error');
      }
    } finally {
      recordingRef.current = null;
    }
  }, [formatDuration]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState('idle');
    setJobStatus(null);
    setErrorMessage('');
    setResult(null);
    setRecordingDuration('0:00');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
