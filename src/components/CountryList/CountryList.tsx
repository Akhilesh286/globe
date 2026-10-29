import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { Country } from '../../types';
import { categoryLabel } from '../ui/InfoRow';
import { EmptyList } from '../ui/EmptyList';
import { Flag } from '../ui/Flag';
import { normalizeSearch } from '../../utils/text';

interface CountryListProps {
  countries: Country[];
  query: string;
  selectedCode: string | null;
  onSelect: (country: Country) => void;
  showCategory?: boolean;
  emptyTitle?: string;
}

export function CountryList({
  countries,
  query,
  selectedCode,
  onSelect,
  showCategory = false,
  emptyTitle = 'No matching countries',
}: CountryListProps) {
  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query);
    const sorted = countries
      .filter((country) => {
        if (!normalized) return true;
        return (
          normalizeSearch(country.commonName).includes(normalized) ||
          normalizeSearch(country.officialName).includes(normalized) ||
          normalizeSearch(country.cca2 ?? '').includes(normalized) ||
          normalizeSearch(country.cca3).includes(normalized) ||
          country.searchAliases.some((alias) => normalizeSearch(alias).includes(normalized))
        );
      })
      .sort((a, b) => a.commonName.localeCompare(b.commonName, 'en'));
    return sorted;
  }, [countries, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Country[]>();
    for (const country of filtered) {
      const letter = country.commonName[0]?.toUpperCase() ?? '#';
      const list = map.get(letter) ?? [];
      list.push(country);
      map.set(letter, list);
    }
    return [...map.entries()];
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <EmptyList
        title={emptyTitle}
        description={query ? `Nothing matches “${query}” in this list.` : undefined}
      />
    );
  }

  return (
    <div className="letter-list">
      {groups.map(([letter, list]) => (
        <div className="letter-group" key={letter}>
          <div className="letter-heading" aria-hidden="true">
            {letter}
          </div>
          {list.map((country) => {
            const selected = selectedCode === country.id;
            return (
              <button
                type="button"
                key={country.id}
                className={`place-row ${selected ? 'place-row--selected' : ''}`}
                onClick={() => onSelect(country)}
                aria-current={selected ? 'true' : undefined}
              >
                <Flag cca2={country.cca2} emoji={country.flagEmoji} name={country.commonName} size="xs" />
                <span className="place-row__copy">
                  <span className="place-row__name">{country.commonName}</span>
                  {showCategory ? (
                    <span className="place-row__meta">
                      {categoryLabel(country.category)} · {country.continent}
                    </span>
                  ) : (
                    <span className="place-row__meta">
                      {country.subregion || country.region || country.continent}
                    </span>
                  )}
                </span>
                <span className="place-row__code">
                  {country.cca2 || country.cca3}
                </span>
                {selected ? <Check className="place-row__check" size={14} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
