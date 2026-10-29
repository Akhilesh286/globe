import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored == null) return initialValue;
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private-mode or constrained environments.
    }
  }, [value]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      // Ignore.
    }
    setValue(initialValue);
  }, [initialValue]);

  return [value, setValue, reset] as const;
}
