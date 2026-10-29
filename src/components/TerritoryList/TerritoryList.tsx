import type { Country } from '../../types';
import { CountryList } from '../CountryList/CountryList';

interface TerritoryListProps {
  territories: Country[];
  query: string;
  selectedCode: string | null;
  onSelect: (country: Country) => void;
}

export function TerritoryList({
  territories,
  query,
  selectedCode,
  onSelect,
}: TerritoryListProps) {
  return (
    <CountryList
      countries={territories}
      query={query}
      selectedCode={selectedCode}
      onSelect={onSelect}
      showCategory
      emptyTitle="No matching territories"
    />
  );
}
