import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Clock3,
  Coins,
  Compass,
  Globe2,
  Info,
  Languages,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Mountain,
  Phone,
  Ruler,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Country, AtlasData } from '../../types';
import { getNeighbourCountries } from '../../services/geographyData';
import {
  formatCompactNumber,
  formatCoordinates,
  formatList,
  formatNumber,
  formatPopulation,
  formatPopulationMeta,
} from '../../utils/format';
import { Flag } from '../ui/Flag';
import { CategoryBadge, DetailSection, InfoRow, categoryLabel } from '../ui/InfoRow';

interface CountryDetailsProps {
  country: Country;
  data: AtlasData;
  backLabel: string;
  focusCapital?: string;
  onBack: () => void;
  onSelectCountry: (country: Country, origin: 'neighbour') => void;
  onLocate: () => void;
}

function currencyLabel(currency: Country['currencies'][number]): string {
  const symbol = currency.symbol ? `, ${currency.symbol}` : '';
  return `${currency.name} (${currency.code}${symbol})`;
}

function timezoneLabel(country: Country): string {
  if (country.timezones.length === 0) return 'Data unavailable';
  if (country.timezones.length <= 3) return country.timezones.join(' · ');
  return `${country.timezones.length} time zones`;
}

function independenceLabel(country: Country): string {
  if (country.independent === true) {
    return country.unMember ? 'Independent state · UN member' : 'Independent state';
  }
  if (country.independent === false) {
    return country.unMember ? 'Dependent territory · UN member' : 'Dependent territory';
  }
  return 'Special or disputed status';
}

export function CountryDetails({
  country,
  data,
  backLabel,
  focusCapital,
  onBack,
  onSelectCountry,
  onLocate,
}: CountryDetailsProps) {
  const neighbours = getNeighbourCountries(country, data);
  const neighbourCodes = new Set(neighbours.map((neighbour) => neighbour.cca3));
  const missingBorders = country.borders.filter((code) => !neighbourCodes.has(code));
  const focusedCapital = focusCapital
    ? country.capitals.find((capital) => capital.name === focusCapital)
    : null;
  const limitedData =
    country.population == null &&
    country.area == null &&
    country.languages.length === 0 &&
    country.currencies.length === 0;
  const populationMeta = formatPopulationMeta(country.populationYear);

  const populationCompact =
    country.population != null ? formatCompactNumber(country.population) : 'Data unavailable';
  const populationFull = formatPopulation(country.population);
  const areaValue =
    country.area != null ? `${formatNumber(Math.round(country.area))} km²` : 'Data unavailable';

  return (
    <div className="view-enter">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </button>

      <header className="country-hero">
        <Flag
          cca2={country.cca2}
          emoji={country.flagEmoji}
          name={country.commonName}
          size="hero"
          className="country-hero__flag"
        />
        <div className="country-hero__identity">
          <div className="country-hero__eyebrow">
            <CategoryBadge category={country.category} />
            <span className="country-hero__continent">{country.continent}</span>
          </div>
          <h1 className="country-hero__title">{country.commonName}</h1>
          {country.officialName !== country.commonName ? (
            <p className="country-hero__official">{country.officialName}</p>
          ) : null}
          <div className="country-hero__codes">
            {country.cca2 ? <span>{country.cca2}</span> : null}
            <span>{country.cca3}</span>
            {country.ccn3 ? <span>{country.ccn3}</span> : null}
            {!country.codesAreIso ? <span className="code--dataset">dataset code</span> : null}
          </div>
        </div>
      </header>

      {country.category === 'disputed' ? (
        <div className="notice notice--info">
          <Info size={15} strokeWidth={1.9} aria-hidden="true" />
          <p>
            This entity has contested or special status. The profile follows the source dataset and
            does not imply a position on recognition.
          </p>
        </div>
      ) : null}

      {!country.hasGeometry ? (
        <div className="notice notice--muted">
          <Info size={15} strokeWidth={1.9} aria-hidden="true" />
          <p>
            No separate polygon is present in the 1:110m boundary dataset at this scale. The globe
            can still locate its coordinates.
          </p>
        </div>
      ) : null}

      {limitedData ? (
        <div className="notice notice--muted">
          <Info size={15} strokeWidth={1.9} aria-hidden="true" />
          <p>
            Reference metadata is limited for this natural-earth entity. Unavailable fields are not
            estimated.
          </p>
        </div>
      ) : null}

      {focusCapital ? (
        <div className="capital-focus">
          <span className="capital-focus__icon" aria-hidden="true">
            <MapPin size={15} strokeWidth={2} />
          </span>
          <div>
            <p className="capital-focus__title">{focusCapital}</p>
            <p className="capital-focus__description">
              {focusedCapital?.lat != null
                ? 'Capital location highlighted on the globe.'
                : 'Capital marker coordinates are not available in the bundled points dataset.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__label">
            <Users size={13} strokeWidth={1.8} aria-hidden="true" /> Population
          </span>
          <strong className="stat-card__value">{populationCompact}</strong>
          <span className="stat-card__detail">
            {country.population != null
              ? populationFull !== populationCompact
                ? `${populationFull}${populationMeta ? ` · ${populationMeta}` : ''}`
                : populationMeta
              : 'Not available in the source'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">
            <Ruler size={13} strokeWidth={1.8} aria-hidden="true" /> Area
          </span>
          <strong className="stat-card__value stat-card__value--area">{areaValue}</strong>
          <span className="stat-card__detail">
            {country.area != null ? 'Total surface area' : 'Not available in the source'}
          </span>
        </div>
      </div>

      <DetailSection title="Essentials" icon={Compass}>
        <InfoRow icon={Building2} label="Capital">
          {country.capitalNames.length > 0 ? country.capitalNames.join(' · ') : 'Data unavailable'}
        </InfoRow>
        <InfoRow icon={Coins} label="Currency">
          {country.currencies.length > 0
            ? country.currencies.map(currencyLabel).join(' · ')
            : 'Data unavailable'}
        </InfoRow>
        <InfoRow icon={Languages} label="Official languages">
          {formatList(country.languages)}
        </InfoRow>
        <InfoRow
          icon={Clock3}
          label="Time zones"
          title={country.timezones.join(', ') || undefined}
        >
          {timezoneLabel(country)}
        </InfoRow>
        <InfoRow icon={Phone} label="Calling code">
          {formatList(country.callingCodes)}
        </InfoRow>
        <InfoRow icon={Globe2} label="Internet TLD">
          {formatList(country.tlds)}
        </InfoRow>
        <InfoRow icon={ShieldCheck} label="Status">
          {independenceLabel(country)}
        </InfoRow>
      </DetailSection>

      <DetailSection title="Geography" icon={MapIcon}>
        <InfoRow icon={MapPin} label="Coordinates">
          {formatCoordinates(country.coordinates)}
        </InfoRow>
        <InfoRow icon={Mountain} label="Coastline">
          {country.landlocked == null
            ? 'Data unavailable'
            : country.landlocked
              ? 'Landlocked'
              : 'Coastal or island state'}
        </InfoRow>
        <InfoRow icon={Globe2} label="Region">
          {[
            ...new Set(
              [country.continent, country.region, country.subregion].filter(Boolean),
            ),
          ].join(' · ') || 'Data unavailable'}
        </InfoRow>
        <div className="neighbours">
          <div className="neighbours__header">
            <span className="neighbours__label">Bordering countries</span>
            <span className="neighbours__count">{neighbours.length}</span>
          </div>
          {neighbours.length > 0 ? (
            <div className="neighbour-list">
              {neighbours.map((neighbour) => (
                <button
                  type="button"
                  className="neighbour-chip"
                  key={neighbour.cca3}
                  onClick={() => onSelectCountry(neighbour, 'neighbour')}
                >
                  <Flag
                    cca2={neighbour.cca2}
                    emoji={neighbour.flagEmoji}
                    name={neighbour.commonName}
                    size="xs"
                  />
                  <span>{neighbour.commonName}</span>
                </button>
              ))}
            </div>
          ) : country.borders.length === 0 ? (
            <p className="neighbours__empty">
              {country.landlocked === false
                ? 'No land borders are listed; this is a coastal or island state.'
                : 'No bordering countries are listed in the source dataset.'}
            </p>
          ) : null}
          {missingBorders.length > 0 ? (
            <p className="neighbours__empty">
              Unmatched border codes: {missingBorders.join(', ')}
            </p>
          ) : null}
        </div>
      </DetailSection>

      <details className="reference-panel">
        <summary className="reference-panel__summary">
          <span>Reference details</span>
          <ChevronDown size={15} strokeWidth={2} aria-hidden="true" />
        </summary>
        <div className="reference-panel__body">
          {country.nativeName ? (
            <div className="reference-row">
              <span>Native name</span>
              <span>{country.nativeName}</span>
            </div>
          ) : null}
          <div className="reference-row">
            <span>Entity classification</span>
            <span>{categoryLabel(country.category)}</span>
          </div>
          <div className="reference-row">
            <span>ISO alpha-2</span>
            <span>{country.cca2 ?? 'Not assigned'}</span>
          </div>
          <div className="reference-row">
            <span>ISO alpha-3</span>
            <span>{country.cca3}</span>
          </div>
          <div className="reference-row">
            <span>Numeric code</span>
            <span>{country.ccn3 ?? 'Data unavailable'}</span>
          </div>
          <div className="reference-row">
            <span>IOC code</span>
            <span>{country.cioc ?? 'Data unavailable'}</span>
          </div>
          <div className="reference-row">
            <span>UN membership</span>
            <span>
              {country.unMember == null
                ? 'Data unavailable'
                : country.unMember
                  ? 'UN member'
                  : 'Not a UN member'}
            </span>
          </div>
          {country.timezones.length > 0 ? (
            <div className="reference-row reference-row--stack">
              <span>All time zones</span>
              <span className="timezone-list">
                {country.timezones.map((timezone) => (
                  <span key={timezone} className="code-chip">
                    {timezone}
                  </span>
                ))}
              </span>
            </div>
          ) : null}
          <p className="reference-panel__note">
            Names, borders and status follow the bundled reference snapshot. Boundary geometry is
            from Natural Earth and uses its de facto representation.
          </p>
        </div>
      </details>

      <div className="detail-actions">
        <button type="button" className="button button--primary" onClick={onLocate}>
          <LocateFixed size={15} strokeWidth={1.9} aria-hidden="true" />
          Locate on globe
        </button>
      </div>
    </div>
  );
}
