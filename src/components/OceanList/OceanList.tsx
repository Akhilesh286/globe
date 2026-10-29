import { useMemo } from 'react';
import { ChevronRight, Waves } from 'lucide-react';
import type { OceanInfo } from '../../types';
import { formatCompactNumber } from '../../utils/format';
import { normalizeSearch } from '../../utils/text';
import { EmptyList } from '../ui/EmptyList';

interface OceanListProps {
  oceans: OceanInfo[];
  query: string;
  onSelect: (ocean: OceanInfo) => void;
}

export function OceanList({ oceans, query, onSelect }: OceanListProps) {
  const rows = useMemo(() => {
    const normalized = normalizeSearch(query);
    return oceans.filter(
      (ocean) =>
        !normalized ||
        normalizeSearch(ocean.name).includes(normalized) ||
        normalizeSearch(ocean.description).includes(normalized),
    );
  }, [oceans, query]);

  if (rows.length === 0) {
    return (
      <EmptyList
        title="No matching oceans"
        description={query ? `Nothing matches “${query}”.` : undefined}
      />
    );
  }

  return (
    <div className="stack-list">
      {rows.map((ocean) => (
        <button
          type="button"
          className="place-row place-row--roomy"
          key={ocean.id}
          onClick={() => onSelect(ocean)}
        >
          <span className="row-glyph row-glyph--ocean" aria-hidden="true">
            <Waves size={16} strokeWidth={1.7} />
          </span>
          <span className="place-row__copy">
            <span className="place-row__name">{ocean.name}</span>
            <span className="place-row__meta">
              Approx. {formatCompactNumber(ocean.areaApproxKm2)} km² · representative point
            </span>
          </span>
          <ChevronRight className="place-row__chevron" size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
