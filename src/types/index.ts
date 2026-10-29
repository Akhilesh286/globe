export type EntityCategory = 'country' | 'territory' | 'disputed';

export type ContinentName =
  | 'Africa'
  | 'Antarctica'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America';

export type OceanId = 'pacific' | 'atlantic' | 'indian' | 'southern' | 'arctic';

export type BrowseCategory =
  | 'countries'
  | 'continents'
  | 'oceans'
  | 'capitals'
  | 'territories';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string | null;
}

export interface CapitalInfo {
  name: string;
  lat: number | null;
  lng: number | null;
}

export interface Country {
  /** Stable internal identifier: ISO alpha-3 where available. */
  id: string;
  cca2: string | null;
  cca3: string;
  ccn3: string | null;
  cioc: string | null;
  commonName: string;
  officialName: string;
  nativeName: string | null;
  flagEmoji: string | null;
  capitalNames: string[];
  capitals: CapitalInfo[];
  population: number | null;
  populationYear: number | null;
  area: number | null;
  currencies: CurrencyInfo[];
  languages: string[];
  timezones: string[];
  callingCodes: string[];
  tlds: string[];
  region: string | null;
  subregion: string | null;
  continent: ContinentName;
  coordinates: [number, number] | null;
  borders: string[];
  independent: boolean | null;
  unMember: boolean | null;
  landlocked: boolean | null;
  category: EntityCategory;
  hasGeometry: boolean;
  /** Some Natural Earth codes are dataset codes rather than assigned ISO codes. */
  codesAreIso: boolean;
  searchAliases: string[];
}

export interface CountryFeatureProperties {
  name: string;
  iso2: string | null;
  iso3: string;
  featureCode: string;
  continent: ContinentName;
  subregion: string | null;
  labelRank: number;
  labelLat: number;
  labelLng: number;
  area: number | null;
  entityType: string | null;
  note: string | null;
}

export interface CountryFeature {
  type: 'Feature';
  id: string;
  properties: CountryFeatureProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  country: Country;
}

export interface CapitalEntry {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  countryCca2: string | null;
  countryCategory: EntityCategory;
  flagEmoji: string | null;
  flagUrl: string | null;
  lat: number | null;
  lng: number | null;
  continent: ContinentName;
}

export interface ContinentInfo {
  name: ContinentName;
  description: string;
  center: [number, number];
  altitude: number;
}

export interface OceanInfo {
  id: OceanId;
  name: string;
  description: string;
  areaApproxKm2: number;
  averageDepthM: number;
  maxDepthM: number;
  maxDepthName: string;
  coordinates: [number, number];
  note: string;
}

export interface AtlasData {
  countries: Country[];
  features: CountryFeature[];
  countriesByCode: Map<string, Country>;
  continents: ContinentInfo[];
  oceans: OceanInfo[];
  capitals: CapitalEntry[];
  snapshotDate: string;
  sourceWarning: string | null;
}

export type SearchResult =
  | {
      kind: 'country';
      id: string;
      score: number;
      country: Country;
    }
  | {
      kind: 'capital';
      id: string;
      score: number;
      capital: CapitalEntry;
    }
  | {
      kind: 'continent';
      id: string;
      score: number;
      continent: ContinentInfo;
    }
  | {
      kind: 'ocean';
      id: string;
      score: number;
      ocean: OceanInfo;
    };

export type SidebarView =
  | { kind: 'browse' }
  | { kind: 'country'; code: string; focusCapital?: string }
  | { kind: 'continent'; continent: ContinentName }
  | { kind: 'ocean'; oceanId: OceanId };

export interface GlobeFocusRequest {
  lat: number;
  lng: number;
  altitude: number;
  key: number;
  label?: string;
  subtitle?: string;
}

export interface LayerSettings {
  borders: boolean;
  labels: boolean;
  capitals: boolean;
  highlightSelected: boolean;
  autoRotate: boolean;
  atmosphere: boolean;
}

export const DEFAULT_LAYERS: LayerSettings = {
  borders: true,
  labels: true,
  capitals: false,
  highlightSelected: true,
  autoRotate: false,
  atmosphere: true,
};

export interface GeoRawProperties {
  ADMIN: string;
  NAME: string;
  NAME_LONG: string;
  BRK_NAME: string;
  SOVEREIGNT: string;
  ADM0_A3: string;
  ISO_A2: string;
  ISO_A2_EH: string;
  ISO_A3: string;
  ISO_A3_EH: string;
  ISO_N3: string;
  CONTINENT: string;
  SUBREGION: string | null;
  LABELRANK: number;
  LABEL_X: number;
  LABEL_Y: number;
  TYPE: string;
  NOTE_ADM0: string | null;
  POP_EST: number;
  [key: string]: unknown;
}

export interface GeoRawFeature {
  type: 'Feature';
  id?: string;
  properties: GeoRawProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  bbox?: GeoJSON.BBox;
}

export interface GeoRawFeatureCollection {
  type: 'FeatureCollection';
  features: GeoRawFeature[];
}
