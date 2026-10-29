import { useMemo } from 'react';
import type { AtlasData, SearchResult } from '../types';
import { SearchIndex } from '../services/searchIndex';

export function useSearch(data: AtlasData | null, query: string, limit = 14): SearchResult[] {
  const index = useMemo(() => (data ? new SearchIndex(data) : null), [data]);
  return useMemo(() => {
    if (!index) return [];
    return index.search(query, limit);
  }, [index, query, limit]);
}
