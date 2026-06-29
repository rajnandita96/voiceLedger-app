/**
 * VoiceLedger API Client
 * Communicates with the whisper-gateway transcription backend
 */

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

/** Submit an audio file for transcription. Uses XMLHttpRequest because
 * React Native's fetch Blob support is broken on Android (ArrayBuffer not
 * supported) while XHR handles FormData + file URIs natively on both platforms. */
export function submitAudio(fileUri: string, fileName: string): Promise<JobSubmitResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}/jobs`;

    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = () => {
      if (xhr.status === 429) {
        const retryAfter = parseInt(xhr.getResponseHeader('Retry-After') ?? '60', 10);
        reject(new ApiError(`Rate limited. Retry after ${retryAfter}s.`, 429));
        return;
      }
      if (!xhr.responseText) {
        reject(new ApiError('Empty response', xhr.status));
        return;
      }
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new ApiError(json.error ?? 'Upload failed', xhr.status));
        }
      } catch {
        reject(new ApiError('Invalid JSON response', xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network error', 0));
    xhr.ontimeout = () => reject(new ApiError('Upload timed out', 408));
    xhr.timeout = 120_000; // 2 minutes for large files

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'audio/m4a',
    } as any);

    xhr.send(formData);
  });
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
