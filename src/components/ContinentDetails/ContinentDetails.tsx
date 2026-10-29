import { ArrowLeft, Globe2, LocateFixed, MapPinned } from 'lucide-react';
import type { AtlasData, ContinentInfo, Country } from '../../types';
import { getCountriesForContinent } from '../../services/geographyData';
import { formatCoordinates } from '../../utils/format';
import { CountryList } from '../CountryList/CountryList';

interface ContinentDetailsProps {
  continent: ContinentInfo;
  data: AtlasData;
  backLabel: string;
  onBack: () => void;
  onSelectCountry: (country: Country, origin: 'list') => void;
  onLocate: () => void;
}

export function ContinentDetails({
  continent,
  data,
  backLabel,
  onBack,
  onSelectCountry,
  onLocate,
}: ContinentDetailsProps) {
  const countries = getCountriesForContinent(data, continent.name);
  const sovereign = countries.filter((country) => country.category === 'country').length;
  const other = countries.length - sovereign;

  return (
    <div className="view-enter">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </button>

      <header className="feature-hero">
        <span className="feature-hero__glyph" aria-hidden="true">
          <Globe2 size={24} strokeWidth={1.5} />
        </span>
        <p className="feature-hero__eyebrow">Continent</p>
        <h1 className="feature-hero__title">{continent.name}</h1>
        <p className="feature-hero__description">{continent.description}</p>
        <div className="feature-hero__meta">
          <span>{sovereign} sovereign states</span>
          {other > 0 ? <span>{other} territories & special entities</span> : null}
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__label">Representative centre</span>
          <strong className="stat-card__value stat-card__value--small">
            {formatCoordinates(continent.center)}
          </strong>
          <span className="stat-card__detail">Used only for globe navigation</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">
            <MapPinned size={13} strokeWidth={1.8} aria-hidden="true" /> Listed places
          </span>
          <strong className="stat-card__value">{countries.length}</strong>
          <span className="stat-card__detail">Countries and other entities</span>
        </div>
      </div>

      <button type="button" className="button button--primary button--full" onClick={onLocate}>
        <LocateFixed size={15} strokeWidth={1.9} aria-hidden="true" />
        Focus {continent.name} on the globe
      </button>

      <div className="detail-section">
        <div className="detail-section__header">
          <h2 className="detail-section__title">Countries & territories</h2>
        </div>
        <CountryList
          countries={countries}
          query=""
          selectedCode={null}
          onSelect={(country) => onSelectCountry(country, 'list')}
          showCategory
          emptyTitle="No places listed for this continent"
        />
      </div>

      <p className="feature-note">
        Continental groupings follow the reference metadata and Natural Earth's continent field.
        Transcontinental states are listed under one continent only.
      </p>
    </div>
  );
}
