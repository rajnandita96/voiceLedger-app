/**
 * Local persistence for transcription history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredTranscription {
  id: string;
  jobId: string;
  text: string;
  fileName: string;
  duration: string;
  status: 'done' | 'failed';
  error?: string;
  createdAt: string;
}

const HISTORY_KEY = '@voiceledger_history';
const ID_COUNTER_KEY = '@voiceledger_id_counter';

async function getNextId(): Promise<string> {
  const raw = await AsyncStorage.getItem(ID_COUNTER_KEY);
  const next = (parseInt(raw ?? '0', 10) + 1).toString();
  await AsyncStorage.setItem(ID_COUNTER_KEY, next);
  return next;
}

export async function getHistory(): Promise<StoredTranscription[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // Sort newest first
    return parsed.sort(
      (a: StoredTranscription, b: StoredTranscription) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

export async function addTranscription(data: {
  jobId: string;
  text: string;
  fileName: string;
  duration: string;
  status: 'done' | 'failed';
  error?: string;
}): Promise<StoredTranscription> {
  const id = await getNextId();
  const entry: StoredTranscription = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
  };

  const history = await getHistory();
  history.unshift(entry);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  return entry;
}

export async function deleteTranscription(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((t) => t.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}
