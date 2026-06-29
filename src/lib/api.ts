/**
 * VoiceLedger API Client
 * Communicates with the whisper-gateway transcription backend
 */

import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

const API_BASE = 'https://abhisheks-mac-mini.tail4b195e.ts.net';

export interface JobSubmitResponse {
  job_id: string;
  status: 'queued';
}

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface JobResult {
  job_id: string;
  status: JobStatus;
  filename: string;
  result: { text: string } | null;
  error: string;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10);
    throw new ApiError(`Rate limited. Retry after ${retryAfter}s.`, 429);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? 'Unknown error', res.status);
  }

  return res.json();
}

/** Check if the API is reachable */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await apiFetch<{ status: string }>('/health');
    return res.status === 'ok';
  } catch {
    return false;
  }
}

/** Submit an audio file for transcription. Uses expo-file-system's legacy
 * uploadAsync which is battle-tested on both platforms. Unlike React Native's
 * FormData (broken on Android), FileSystem.uploadAsync uses the platform's
 * native networking stack directly. */
export async function submitAudio(fileUri: string, _fileName: string): Promise<JobSubmitResponse> {
  const result = await uploadAsync(`${API_BASE}/jobs`, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'audio/m4a',
  });

  if (result.status === 429) {
    throw new ApiError('Rate limited. Retry after 60s.', 429);
  }

  if (result.status < 200 || result.status >= 300) {
    const body = JSON.parse(result.body);
    throw new ApiError(body.error ?? `Upload failed (${result.status})`, result.status);
  }

  return JSON.parse(result.body);
}

/** Poll a job until it completes */
export async function getJobStatus(jobId: string): Promise<JobResult> {
  return apiFetch<JobResult>(`/jobs/${jobId}`);
}

/** Poll with exponential backoff until done or failed */
export async function pollUntilDone(
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  maxRetries = 90,
): Promise<JobResult> {
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    const job = await getJobStatus(jobId);
    onProgress?.(job.status);

    if (job.status === 'done' || job.status === 'failed') {
      return job;
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 10_000);
  }

  throw new ApiError('Polling timed out', 408);
}
