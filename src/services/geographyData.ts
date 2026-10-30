import type {
  AtlasData,
  CapitalEntry,
  ContinentInfo,
  ContinentName,
  Country,
  CountryFeature,
  GeoRawFeatureCollection,
  GeoRawProperties,
  OceanId,
  OceanInfo,
} from '../types';
import { loadCountryDirectory } from './countriesApi';
import { flagUrl } from '../utils/flag';
import { normalizeSearch } from '../utils/text';

export const DATA_SOURCES = [
  {
    name: 'Natural Earth 1:110m Admin 0 Countries',
    detail: 'Country boundary geometry. Public domain. Natural Earth uses a de facto, compromise representation; disputed boundaries are not universally accepted.',
    url: 'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/',
  },
  {
    name: 'mledoze/countries',
    detail: 'Country names, capitals, currencies, languages, borders and ISO codes. ODbL-1.0. This is the community dataset historically used by REST Countries.',
    url: 'https://github.com/mledoze/countries',
  },
  {
    name: 'World Bank — SP.POP.TOTL',
    detail: 'Population estimates (2024) from the World Development Indicators. CC BY 4.0.',
    url: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
  },
  {
    name: 'Countries States Cities Database',
    detail: 'IANA timezone reference data. ODbL-1.0.',
    url: 'https://github.com/dr5hn/countries-states-cities-database',
  },
  {
    name: 'Natural Earth 1:10m Populated Places',
    detail: 'Capital-city coordinates. Public domain.',
    url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
  },
  {
    name: 'FlagCDN',
    detail: 'Flag images. If a flag cannot be loaded, a text fallback is shown.',
    url: 'https://flagcdn.com/',
  },
];

export const CONTINENTS: ContinentInfo[] = [
  {
    name: 'Africa',
    description:
      'The second-largest continent by land area, stretching from the Mediterranean coast to the Cape of Good Hope and across the Sahara, the Congo Basin and the Great Rift Valley.',
    center: [3, 20],
    altitude: 2.05,
  },
  {
    name: 'Antarctica',
    description:
      'The southernmost continent, governed through the Antarctic Treaty System rather than by a sovereign state. Ice covers almost all of its land surface.',
    center: [-72, 10],
    altitude: 2.35,
  },
  {
    name: 'Asia',
    description:
      'The largest and most populous continent, extending from the Arctic to the Indian Ocean and from the Urals and Caucasus to the Pacific.',
    center: [30, 90],
    altitude: 2.2,
  },
  {
    name: 'Europe',
    description:
      'A peninsula-shaped continent bounded by the Arctic, Atlantic and Mediterranean seas, with a dense network of states, languages and regional identities.',
    center: [50, 15],
    altitude: 1.85,
  },
  {
    name: 'North America',
    description:
      'Spanning Canada, the United States, Mexico, Central America and the Caribbean, from the Arctic Archipelago to the Isthmus of Panama.',
    center: [45, -100],
    altitude: 2.05,
  },
  {
    name: 'Oceania',
    description:
      'A vast Pacific region of island nations and territories, including Australia, Aotearoa New Zealand, Melanesia, Micronesia and Polynesia.',
    center: [-20, 145],
    altitude: 2.25,
  },
  {
    name: 'South America',
    description:
      'The fourth-largest continent, running from the Caribbean coast to Tierra del Fuego and containing the Amazon basin and the Andes.',
    center: [-18, -60],
    altitude: 2.05,
  },
];

export const OCEANS: OceanInfo[] = [
  {
    id: 'pacific',
    name: 'Pacific Ocean',
    description:
      'The largest and deepest ocean, between Asia and Australia to the west and the Americas to the east. It contains the deepest known point on Earth, Challenger Deep.',
    areaApproxKm2: 165_250_000,
    averageDepthM: 4_280,
    maxDepthM: 10_935,
    maxDepthName: 'Challenger Deep',
    coordinates: [0, -155],
    note: 'Approximate area. Ocean boundaries vary by convention and the globe marks a representative point, not a boundary.',
  },
  {
    id: 'atlantic',
    name: 'Atlantic Ocean',
    description:
      'The second-largest ocean, separating the Americas from Europe and Africa and extending from the Arctic to the Southern Ocean.',
    areaApproxKm2: 106_460_000,
    averageDepthM: 3_646,
    maxDepthM: 8_376,
    maxDepthName: 'Puerto Rico Trench',
    coordinates: [10, -35],
    note: 'Approximate area. Ocean boundaries vary by convention and the globe marks a representative point, not a boundary.',
  },
  {
    id: 'indian',
    name: 'Indian Ocean',
    description:
      'The third-largest ocean, bounded by Africa, Asia, Australia and the Southern Ocean. It is the warmest ocean on average.',
    areaApproxKm2: 70_560_000,
    averageDepthM: 3_741,
    maxDepthM: 7_290,
    maxDepthName: 'Java Trench',
    coordinates: [-20, 80],
    note: 'Approximate area. Ocean boundaries vary by convention and the globe marks a representative point, not a boundary.',
  },
  {
    id: 'southern',
    name: 'Southern Ocean',
    description:
      'The circumpolar ocean surrounding Antarctica, generally considered to extend south of 60°S. Its northern limit is defined differently by different organizations.',
    areaApproxKm2: 20_327_000,
    averageDepthM: 3_270,
    maxDepthM: 7_434,
    maxDepthName: 'South Sandwich Trench',
    coordinates: [-62, 20],
    note: 'Its extent is defined differently by different conventions. The globe marks a representative point, not a boundary.',
  },
  {
    id: 'arctic',
    name: 'Arctic Ocean',
    description:
      'The smallest and shallowest ocean, centered on the North Pole and bordered by North America, Europe and Asia. Much of its surface is covered by sea ice.',
    areaApproxKm2: 14_056_000,
    averageDepthM: 1_205,
    maxDepthM: 5_550,
    maxDepthName: 'Molloy Deep',
    coordinates: [85, 0],
    note: 'Approximate area. Ocean boundaries vary by convention and the globe places a representative marker near the North Pole.',
  },
];

const CONTINENT_LOOKUP = new Map(CONTINENTS.map((continent) => [continent.name, continent]));
const OCEAN_LOOKUP = new Map(OCEANS.map((ocean) => [ocean.id, ocean]));

/**
 * Broad ocean-basin membership used for globe highlighting. A country can
 * belong to more than one ocean. Major marginal seas are grouped with their
 * parent basin, so this is an orientation aid rather than a hydrographic or
 * legal boundary.
 */
export const OCEAN_COUNTRY_CODES: Record<OceanId, ReadonlySet<string>> = {
  pacific: new Set([
    'AUS', 'BRN', 'CAN', 'CHL', 'CHN', 'COL', 'CRI', 'ECU', 'FJI', 'GTM',
    'HND', 'IDN', 'JPN', 'KHM', 'KOR', 'MEX', 'MYS', 'NCL', 'NIC', 'NZL',
    'PAN', 'PER', 'PHL', 'PNG', 'PRK', 'RUS', 'SLB', 'SLV', 'THA', 'TLS',
    'TWN', 'USA', 'VNM', 'VUT',
  ]),
  atlantic: new Set([
    'AGO', 'ALB', 'ARG', 'BEL', 'BEN', 'BGR', 'BHS', 'BIH', 'BLZ', 'BRA',
    'CAN', 'CIV', 'CMR', 'COD', 'COG', 'COL', 'CRI', 'CUB', 'CYN',
    'CYP', 'DEU', 'DNK', 'DOM', 'DZA', 'EGY', 'ESH', 'ESP', 'EST', 'FIN',
    'FLK', 'FRA', 'GAB', 'GBR', 'GEO', 'GHA', 'GIN', 'GMB', 'GNB', 'GNQ',
    'GRC', 'GRL', 'GTM', 'GUY', 'HND', 'HRV', 'HTI', 'IRL', 'ISL', 'ISR',
    'ITA', 'JAM', 'LBN', 'LBR', 'LBY', 'LTU', 'LVA', 'MAR', 'MEX', 'MNE',
    'MRT', 'NAM', 'NGA', 'NIC', 'NLD', 'NOR', 'PAN', 'POL', 'PRI', 'PRT',
    'PSE', 'ROU', 'RUS', 'SEN', 'SLE', 'SUR', 'SVN', 'SWE', 'SYR', 'TGO',
    'TTO', 'TUN', 'TUR', 'UKR', 'URY', 'USA', 'VEN', 'ZAF',
  ]),
  indian: new Set([
    'ARE', 'ATF', 'AUS', 'BGD', 'DJI', 'EGY', 'ERI', 'IDN', 'IND', 'IRN',
    'IRQ', 'ISR', 'JOR', 'KEN', 'KWT', 'LKA', 'MDG', 'MMR', 'MOZ', 'MYS',
    'OMN', 'PAK', 'QAT', 'SAU', 'SDN', 'SOL', 'SOM', 'THA', 'TLS', 'TZA',
    'YEM', 'ZAF',
  ]),
  southern: new Set(['ATA']),
  arctic: new Set(['CAN', 'GRL', 'NOR', 'RUS', 'USA']),
};

const CONTINENT_NAMES = new Set<ContinentName>([
  'Africa',
  'Antarctica',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
]);

const FEATURE_CODE_OVERRIDES: Record<string, string> = {
  KOS: 'UNK',
};

function validCode(value: string | null | undefined): value is string {
  return Boolean(value && value !== '-99' && /^[A-Z0-9]{2,4}$/.test(value));
}

function firstValidCode(...values: Array<string | null | undefined>): string | null {
  return values.find(validCode) ?? null;
}

function normalizeContinent(value: string | null | undefined): ContinentName | null {
  if (!value) return null;
  if (CONTINENT_NAMES.has(value as ContinentName)) return value as ContinentName;
  return null;
}

function featureContinent(
  properties: GeoRawProperties,
  fallback: ContinentName,
): ContinentName {
  return normalizeContinent(properties.CONTINENT) ?? fallback;
}

function createFeatureOnlyCountry(
  properties: GeoRawProperties,
  iso3: string,
  continent: ContinentName,
): Country {
  const name = properties.NAME_LONG || properties.NAME || properties.ADMIN;
  const category = properties.TYPE === 'Dependency' ? 'territory' : 'disputed';
  const labelLat = Number.isFinite(properties.LABEL_Y) ? properties.LABEL_Y : null;
  const labelLng = Number.isFinite(properties.LABEL_X) ? properties.LABEL_X : null;
  return {
    id: iso3,
    cca2: null,
    cca3: iso3,
    ccn3: null,
    cioc: null,
    commonName: name,
    officialName: name,
    nativeName: null,
    flagEmoji: null,
    capitalNames: [],
    capitals: [],
    population: null,
    populationYear: null,
    area: null,
    currencies: [],
    languages: [],
    timezones: [],
    callingCodes: [],
    tlds: [],
    region: properties.CONTINENT ?? null,
    subregion: properties.SUBREGION ?? null,
    continent,
    coordinates:
      labelLat != null && labelLng != null ? [labelLat, labelLng] : null,
    borders: [],
    independent: null,
    unMember: null,
    landlocked: null,
    category,
    hasGeometry: true,
    codesAreIso: false,
    searchAliases: [
      name,
      properties.ADMIN,
      properties.NAME,
      properties.BRK_NAME,
      properties.SOVEREIGNT,
      iso3,
    ].filter(Boolean),
  };
}

function findCountryForFeature(
  properties: GeoRawProperties,
  countries: Country[],
  byCode: Map<string, Country>,
): Country | null {
  const rawIso = firstValidCode(properties.ISO_A3, properties.ISO_A3_EH, properties.ADM0_A3);
  if (rawIso) {
    const overridden = FEATURE_CODE_OVERRIDES[rawIso] ?? rawIso;
    const exact = byCode.get(overridden);
    if (exact) return exact;
  }

  // Name fallback is only used when the ISO codes are absent or inconsistent.
  const names = new Set(
    [properties.NAME, properties.NAME_LONG, properties.ADMIN, properties.BRK_NAME]
      .filter(Boolean)
      .map((value) => normalizeSearch(value)),
  );
  for (const country of countries) {
    if (country.searchAliases.some((alias) => names.has(normalizeSearch(alias)))) {
      return country;
    }
  }
  return null;
}

function buildFeatures(raw: GeoRawFeatureCollection, countries: Country[], byCode: Map<string, Country>) {
  const features: CountryFeature[] = [];

  raw.features.forEach((feature, index) => {
    const properties = feature.properties;
    const iso = firstValidCode(properties.ISO_A3, properties.ISO_A3_EH, properties.ADM0_A3);
    let country = findCountryForFeature(properties, countries, byCode);
    const continent = featureContinent(properties, country?.continent ?? 'Europe');

    if (!country) {
      const code = iso ? (FEATURE_CODE_OVERRIDES[iso] ?? iso) : `NE${index}`;
      country = createFeatureOnlyCountry(properties, code, continent);
      if (!byCode.has(code)) {
        countries.push(country);
        byCode.set(code, country);
      } else {
        country = byCode.get(code) as Country;
      }
    }

    country.hasGeometry = true;
    country.continent = continent;

    const labelLat = Number(properties.LABEL_Y);
    const labelLng = Number(properties.LABEL_X);
    const labelIsUsable =
      Number.isFinite(labelLat) &&
      Number.isFinite(labelLng) &&
      labelLat >= -90 &&
      labelLat <= 90 &&
      labelLng >= -180 &&
      labelLng <= 180;
    const fallback = country.coordinates ?? [0, 0];

    const normalizedFeature: CountryFeature = {
      type: 'Feature',
      id: `${country.cca3}-${index}`,
      properties: {
        name: country.commonName,
        iso2: country.cca2,
        iso3: country.cca3,
        featureCode: properties.ADM0_A3,
        continent,
        subregion: properties.SUBREGION ?? country.subregion,
        labelRank: Number(properties.LABELRANK) || 6,
        labelLat: labelIsUsable ? labelLat : fallback[0],
        labelLng: labelIsUsable ? labelLng : fallback[1],
        area: country.area,
        entityType: properties.TYPE ?? null,
        note: properties.NOTE_ADM0 ?? null,
      },
      geometry: feature.geometry,
      country,
    };
    features.push(normalizedFeature);
  });

  return features;
}

function buildCapitals(countries: Country[]): CapitalEntry[] {
  const entries: CapitalEntry[] = [];
  for (const country of countries) {
    country.capitals.forEach((capital, index) => {
      if (!capital.name) return;
      entries.push({
        id: `${country.cca3}-capital-${index}`,
        name: capital.name,
        countryCode: country.cca3,
        countryName: country.commonName,
        countryCca2: country.cca2,
        countryCategory: country.category,
        flagEmoji: country.flagEmoji,
        flagUrl: flagUrl(country.cca2),
        lat: capital.lat,
        lng: capital.lng,
        continent: country.continent,
      });
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

function validateFeatureCollection(value: unknown): value is GeoRawFeatureCollection {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GeoRawFeatureCollection>;
  return candidate.type === 'FeatureCollection' && Array.isArray(candidate.features);
}

async function loadGeoJson(signal?: AbortSignal): Promise<GeoRawFeatureCollection> {
  const url =
    import.meta.env.VITE_COUNTRY_GEOJSON_URL?.trim() ||
    `${import.meta.env.BASE_URL}data/ne_110m_admin_0_countries.geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Boundary data could not be loaded (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!validateFeatureCollection(data)) {
    throw new Error('Boundary data has an unexpected format.');
  }
  return data;
}

let atlasPromise: Promise<AtlasData> | null = null;

async function loadAtlas(signal?: AbortSignal): Promise<AtlasData> {
  const [directory, boundaries] = await Promise.all([
    loadCountryDirectory(signal),
    loadGeoJson(signal),
  ]);

  const countries = directory.countries.map((country) => ({
    ...country,
    hasGeometry: false,
  }));
  const byCode = new Map(countries.map((country) => [country.cca3, country]));
  const features = buildFeatures(boundaries, countries, byCode);
  const capitals = buildCapitals(countries);

  return {
    countries,
    features,
    countriesByCode: byCode,
    continents: CONTINENTS,
    oceans: OCEANS,
    capitals,
    snapshotDate: directory.snapshotDate,
    sourceWarning: directory.warning,
  };
}

export function loadAtlasData(signal?: AbortSignal): Promise<AtlasData> {
  if (!atlasPromise) {
    atlasPromise = loadAtlas(signal).catch((error) => {
      atlasPromise = null;
      throw error;
    });
  }
  return atlasPromise;
}

export function getContinent(name: ContinentName): ContinentInfo {
  return CONTINENT_LOOKUP.get(name) ?? CONTINENTS[0];
}

export function getOcean(id: OceanId): OceanInfo {
  return OCEAN_LOOKUP.get(id) ?? OCEANS[0];
}

export function getCountriesForContinent(data: AtlasData, name: ContinentName): Country[] {
  return data.countries
    .filter((country) => country.continent === name)
    .sort((a, b) => a.commonName.localeCompare(b.commonName, 'en'));
}

export function getNeighbourCountries(country: Country, data: AtlasData): Country[] {
  return country.borders
    .map((code) => data.countriesByCode.get(code))
    .filter((neighbour): neighbour is Country => Boolean(neighbour))
    .sort((a, b) => a.commonName.localeCompare(b.commonName, 'en'));
}
