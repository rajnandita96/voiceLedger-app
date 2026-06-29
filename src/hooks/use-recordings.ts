/**
 * useRecordings — manages the local transcription history.
 */

import { useCallback, useEffect, useState } from 'react';
import { getHistory, deleteTranscription, type StoredTranscription } from '@/lib/storage';

export function useRecordings() {
  const [recordings, setRecordings] = useState<StoredTranscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const history = await getHistory();
    setRecordings(history);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteTranscription(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    },
    [],
  );

  return { recordings, loading, refresh, remove };
}
