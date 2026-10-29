import { useMemo } from 'react';
import { ChevronRight, Globe2 } from 'lucide-react';
import type { AtlasData, ContinentInfo } from '../../types';
import { getCountriesForContinent } from '../../services/geographyData';
import { normalizeSearch } from '../../utils/text';
import { EmptyList } from '../ui/EmptyList';

interface ContinentListProps {
  data: AtlasData;
  query: string;
  onSelect: (continent: ContinentInfo) => void;
}

export function ContinentList({ data, query, onSelect }: ContinentListProps) {
  const rows = useMemo(() => {
    const normalized = normalizeSearch(query);
    return data.continents
      .filter((continent) => !normalized || normalizeSearch(continent.name).includes(normalized))
      .map((continent) => {
        const countries = getCountriesForContinent(data, continent.name);
        const sovereign = countries.filter((country) => country.category === 'country').length;
        const other = countries.length - sovereign;
        return { continent, sovereign, other };
      });
  }, [data, query]);

  if (rows.length === 0) {
    return (
      <EmptyList
        title="No matching continents"
        description={query ? `Nothing matches “${query}”.` : undefined}
      />
    );
  }

  return (
    <div className="stack-list">
      {rows.map(({ continent, sovereign, other }) => (
        <button
          type="button"
          className="place-row place-row--roomy"
          key={continent.name}
          onClick={() => onSelect(continent)}
        >
          <span className="row-glyph" aria-hidden="true">
            <Globe2 size={16} strokeWidth={1.7} />
          </span>
          <span className="place-row__copy">
            <span className="place-row__name">{continent.name}</span>
            <span className="place-row__meta">
              {sovereign > 0
                ? `${sovereign} ${sovereign === 1 ? 'state' : 'states'}`
                : 'No sovereign states listed'}
              {other > 0 ? ` · ${other} territories` : ''}
            </span>
          </span>
          <ChevronRight className="place-row__chevron" size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
