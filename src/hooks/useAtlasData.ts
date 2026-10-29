import { useCallback, useEffect, useRef, useState } from 'react';
import type { AtlasData } from '../types';
import { loadAtlasData } from '../services/geographyData';

interface AtlasDataState {
  data: AtlasData | null;
  loading: boolean;
  error: string | null;
}

export function useAtlasData() {
  const [state, setState] = useState<AtlasDataState>({
    data: null,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loadAtlasData(controller.signal)
      .then((data) => {
        if (!mountedRef.current) return;
        setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'The atlas could not load its geographic reference data.',
        });
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
