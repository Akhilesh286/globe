import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { CapitalEntry } from '../../types';
import { normalizeSearch } from '../../utils/text';
import { EmptyList } from '../ui/EmptyList';
import { Flag } from '../ui/Flag';

interface CapitalListProps {
  capitals: CapitalEntry[];
  query: string;
  onSelect: (capital: CapitalEntry) => void;
}

export function CapitalList({ capitals, query, onSelect }: CapitalListProps) {
  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query);
    return capitals.filter(
      (capital) =>
        !normalized ||
        normalizeSearch(capital.name).includes(normalized) ||
        normalizeSearch(capital.countryName).includes(normalized),
    );
  }, [capitals, query]);

  if (filtered.length === 0) {
    return (
      <EmptyList
        title="No matching capitals"
        description={query ? `Nothing matches “${query}”.` : undefined}
      />
    );
  }

  return (
    <div className="stack-list">
      {filtered.map((capital) => (
        <button
          type="button"
          className="place-row"
          key={capital.id}
          onClick={() => onSelect(capital)}
        >
          <Flag
            cca2={capital.countryCca2}
            emoji={capital.flagEmoji}
            name={capital.countryName}
            size="xs"
          />
          <span className="place-row__copy">
            <span className="place-row__name">{capital.name}</span>
            <span className="place-row__meta">
              Capital of {capital.countryName}
              {capital.lat == null ? ' · no marker coordinates' : ''}
            </span>
          </span>
          {capital.lat != null ? (
            <MapPin className="place-row__pin" size={14} aria-hidden="true" />
          ) : null}
        </button>
      ))}
    </div>
  );
}
