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

/** Submit an audio file for transcription */
export async function submitAudio(fileUri: string, fileName: string): Promise<JobSubmitResponse> {
  const formData = new FormData();
  // @ts-expect-error — React Native's FormData supports { uri, name, type } objects
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'audio/m4a',
  });

  return apiFetch<JobSubmitResponse>('/jobs', {
    method: 'POST',
    body: formData,
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
