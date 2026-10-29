import {
  Building2,
  ChevronDown,
  Globe2,
  LandPlot,
  MapPinned,
  Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { BrowseCategory, CapitalEntry, ContinentInfo, Country, OceanInfo, AtlasData } from '../../types';
import { getCountryCategories } from '../../services/countriesApi';
import { CountryList } from '../CountryList/CountryList';
import { ContinentList } from '../ContinentList/ContinentList';
import { OceanList } from '../OceanList/OceanList';
import { CapitalList } from '../CapitalList/CapitalList';
import { TerritoryList } from '../TerritoryList/TerritoryList';

interface CategoryBrowserProps {
  data: AtlasData;
  query: string;
  expandedCategory: BrowseCategory | null;
  onExpandedCategoryChange: (category: BrowseCategory | null) => void;
  selectedCode: string | null;
  onSelectCountry: (country: Country) => void;
  onSelectContinent: (continent: ContinentInfo) => void;
  onSelectOcean: (ocean: OceanInfo) => void;
  onSelectCapital: (capital: CapitalEntry) => void;
}

interface CategoryDefinition {
  key: BrowseCategory;
  label: string;
  count: number;
  icon: typeof Globe2;
  content: ReactNode;
}

export function CategoryBrowser({
  data,
  query,
  expandedCategory,
  onExpandedCategoryChange,
  selectedCode,
  onSelectCountry,
  onSelectContinent,
  onSelectOcean,
  onSelectCapital,
}: CategoryBrowserProps) {
  const { countries, territories } = getCountryCategories(data.countries);

  const categories: CategoryDefinition[] = [
    {
      key: 'countries',
      label: 'Countries',
      count: countries.length,
      icon: Globe2,
      content: (
        <CountryList
          countries={countries}
          query={query}
          selectedCode={selectedCode}
          onSelect={onSelectCountry}
        />
      ),
    },
    {
      key: 'continents',
      label: 'Continents',
      count: data.continents.length,
      icon: LandPlot,
      content: (
        <ContinentList data={data} query={query} onSelect={onSelectContinent} />
      ),
    },
    {
      key: 'oceans',
      label: 'Oceans',
      count: data.oceans.length,
      icon: Waves,
      content: <OceanList oceans={data.oceans} query={query} onSelect={onSelectOcean} />,
    },
    {
      key: 'capitals',
      label: 'Capitals',
      count: data.capitals.length,
      icon: Building2,
      content: (
        <CapitalList capitals={data.capitals} query={query} onSelect={onSelectCapital} />
      ),
    },
    {
      key: 'territories',
      label: 'Territories',
      count: territories.length,
      icon: MapPinned,
      content: (
        <TerritoryList
          territories={territories}
          query={query}
          selectedCode={selectedCode}
          onSelect={onSelectCountry}
        />
      ),
    },
  ];

  return (
    <div className="category-browser">
      <div className="browse-intro">
        <p className="browse-intro__eyebrow">Atlas index</p>
        <p className="browse-intro__text">
          Browse the political world, or select any country on the globe.
        </p>
      </div>

      <div className="categories">
        {categories.map((category) => {
          const Icon = category.icon;
          const expanded = expandedCategory === category.key;
          return (
            <section
              className={`category ${expanded ? 'category--expanded' : ''}`}
              key={category.key}
            >
              <button
                type="button"
                className="category__header"
                aria-expanded={expanded}
                aria-controls={`category-panel-${category.key}`}
                onClick={() => onExpandedCategoryChange(expanded ? null : category.key)}
              >
                <span className="category__icon" aria-hidden="true">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className="category__label">{category.label}</span>
                <span className="category__count">{category.count}</span>
                <ChevronDown
                  className={`category__chevron ${expanded ? 'category__chevron--open' : ''}`}
                  size={15}
                  aria-hidden="true"
                />
              </button>
              {expanded ? (
                <div className="category__panel" id={`category-panel-${category.key}`}>
                  {category.key === 'countries' ? (
                    <div className="category__hint">
                      <span>Alphabetical</span>
                      <span>{query ? 'Filtered results' : 'Scroll to explore'}</span>
                    </div>
                  ) : null}
                  {category.content}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
