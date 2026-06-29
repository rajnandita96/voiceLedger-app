/**
 * useTranscription — lightweight hook: handles recording only.
 * The upload + polling pipeline runs in the global TranscriptionJobs store
 * so it survives closing the record modal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import { useTranscriptionJobs } from '@/lib/transcription-jobs';

export type ProcessState =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'done';

interface UseTranscriptionReturn {
  state: ProcessState;
  errorMessage: string;
  recordingDuration: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resultText: string;
  reset: () => void;
}

function formatDuration(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Android: record at 16kHz mono AAC — whisper expects 16kHz, and ffmpeg
// resampling from 44.1kHz can introduce artifacts on some Android encoders.
// iOS: HIGH_QUALITY preset (iOS AAC encoder is reliable at any sample rate).
const recordingOptions = Platform.select({
  android: {
    extension: '.m4a',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    android: {
      outputFormat: 'mpeg4' as const,
      audioEncoder: 'aac' as const,
    },
    ios: RecordingPresets.HIGH_QUALITY.ios,
    web: RecordingPresets.HIGH_QUALITY.web,
  },
  default: {
    ...RecordingPresets.HIGH_QUALITY,
    numberOfChannels: 1,
  },
})!

export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<ProcessState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingDuration, setRecordingDuration] = useState('0:00');
  const [resultText, setResultText] = useState('');
  const { submitJob } = useTranscriptionJobs();

  const startTimeRef = useRef<number>(0);

  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 100);

  useEffect(() => {
    if (state === 'recording' && recorderState.isRecording) {
      setRecordingDuration(formatDuration(recorderState.durationMillis));
    }
  }, [recorderState.durationMillis, recorderState.isRecording, state]);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage('');
      setResultText('');
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Microphone permission required');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
      startTimeRef.current = Date.now();
      setRecordingDuration('0:00');
      setState('recording');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      setState('uploading');
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording URI');
      const elapsed = Date.now() - startTimeRef.current;
      const duration = formatDuration(elapsed);
      logger.info('Recording stopped, dispatching to job queue', { uri, duration });
      const fileName = `recording_${Date.now()}.m4a`;
      // Fire-and-forget: the job runs in the global store
      submitJob(uri, fileName, duration);
      setResultText('');
      setState('done');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to stop recording');
    }
  }, [recorder, submitJob]);

  const reset = useCallback(() => {
    setState('idle');
    setErrorMessage('');
    setResultText('');
    setRecordingDuration('0:00');
  }, []);

  return { state, errorMessage, recordingDuration, startRecording, stopRecording, resultText, reset };
}
