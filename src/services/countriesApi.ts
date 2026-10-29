import snapshot from '../data/country-snapshot.json';
import capitalCoordinates from '../data/capital-coordinates.json';
import type { Country, ContinentName, CurrencyInfo, EntityCategory } from '../types';
import { flagUrl } from '../utils/flag';
import { normalizeSearch } from '../utils/text';

interface RawCountry {
  name: {
    common: string;
    official: string;
    nativeName: string | null;
  };
  cca2: string | null;
  cca3: string;
  ccn3: string | null;
  cioc: string | null;
  independent: boolean | null;
  status: string | null;
  unMember: boolean | null;
  currencies: Record<string, { name: string; symbol?: string }>;
  idd: { root?: string; suffixes?: string[] };
  capital: string[];
  tld?: string[];
  altSpellings: string[];
  region: string | null;
  subregion: string | null;
  languages: Record<string, string>;
  latlng: [number, number] | null;
  landlocked: boolean | null;
  borders: string[];
  area: number | null;
  flagEmoji: string | null;
  population: number | null;
  populationYear: number | null;
  timezones: string[];
}

interface CountrySnapshot {
  generatedAt: string;
  sources: Record<string, unknown>;
  countries: RawCountry[];
}

interface CachedRemoteData {
  fetchedAt: number;
  payload: RawCountry[] | CountrySnapshot;
}

interface CapitalCoordinate {
  name: string;
  lat: number;
  lng: number;
}

export interface CountryDirectoryResult {
  countries: Country[];
  snapshotDate: string;
  warning: string | null;
}

const SNAPSHOT = snapshot as unknown as CountrySnapshot;
const CAPITAL_COORDINATES = capitalCoordinates as Record<string, CapitalCoordinate[]>;
const CACHE_KEY = 'world-atlas:country-api-cache:v1';
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const REQUEST_TIMEOUT_MS = 10_000;

let memoryPromise: Promise<CountryDirectoryResult> | null = null;

function validIso(value: string | null | undefined): value is string {
  return Boolean(value && value !== '-99' && /^[A-Z]{2,3}$/.test(value));
}

function inferContinent(
  region: string | null,
  subregion: string | null,
  latlng: [number, number] | null,
): ContinentName {
  if (region === 'Antarctic' || (latlng && latlng[0] < -60)) return 'Antarctica';
  if (region === 'Africa') return 'Africa';
  if (region === 'Asia') return 'Asia';
  if (region === 'Europe') return 'Europe';
  if (region === 'Oceania') return 'Oceania';
  if (region === 'Americas') {
    if (subregion === 'South America') return 'South America';
    return 'North America';
  }
  if (latlng) {
    if (latlng[0] < -60) return 'Antarctica';
    if (latlng[1] > -30 && latlng[1] < 60 && latlng[0] < 35) return 'Africa';
  }
  return 'Europe';
}

function classify(raw: RawCountry): EntityCategory {
  if (raw.independent === false) return 'territory';
  if (raw.independent === true) return 'country';
  return 'disputed';
}

function parseCurrencies(raw: RawCountry['currencies']): CurrencyInfo[] {
  return Object.entries(raw ?? {}).map(([code, currency]) => ({
    code,
    name: currency.name,
    symbol: currency.symbol ?? null,
  }));
}

function parseCallingCodes(idd: RawCountry['idd']): string[] {
  const root = idd?.root?.trim() ?? '';
  if (!root) return [];
  const suffixes = (idd?.suffixes ?? []).filter(Boolean);
  if (suffixes.length === 0) return [root];
  // North American numbering plan countries can expose hundreds of area codes.
  if (suffixes.length > 4) return [root];
  return [...new Set(suffixes.map((suffix) => `${root}${suffix}`))];
}

function parseCapitals(raw: RawCountry): Country['capitals'] {
  const coordinateMatches = CAPITAL_COORDINATES[raw.cca3] ?? [];
  return (raw.capital ?? []).map((name) => {
    const match = coordinateMatches.find(
      (coordinate) => normalizeSearch(coordinate.name) === normalizeSearch(name),
    );
    return {
      name,
      lat: match?.lat ?? null,
      lng: match?.lng ?? null,
    };
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeCountry(raw: RawCountry): Country {
  const category = classify(raw);
  const capitals = parseCapitals(raw);
  const aliases = unique([
    raw.name.common,
    raw.name.official,
    raw.name.nativeName ?? '',
    raw.cca2 ?? '',
    raw.cca3,
    raw.ccn3 ?? '',
    ...(raw.altSpellings ?? []),
  ]);
  const lowerCommon = raw.name.common.toLowerCase();
  if (lowerCommon.startsWith('the ')) aliases.push(raw.name.common.slice(4));
  else aliases.push(`the ${raw.name.common}`);

  return {
    id: raw.cca3,
    cca2: validIso(raw.cca2) ? raw.cca2 : null,
    cca3: raw.cca3,
    ccn3: raw.ccn3 || null,
    cioc: raw.cioc || null,
    commonName: raw.name.common,
    officialName: raw.name.official,
    nativeName: raw.name.nativeName,
    flagEmoji: raw.flagEmoji,
    capitalNames: raw.capital ?? [],
    capitals,
    population: raw.population,
    populationYear: raw.populationYear,
    area: raw.area,
    currencies: parseCurrencies(raw.currencies),
    languages: unique(Object.values(raw.languages ?? {})),
    timezones: unique(raw.timezones ?? []),
    callingCodes: parseCallingCodes(raw.idd),
    tlds: unique(raw.tld ?? []),
    region: raw.region,
    subregion: raw.subregion,
    continent: inferContinent(raw.region, raw.subregion, raw.latlng),
    coordinates: raw.latlng ? [raw.latlng[0], raw.latlng[1]] : null,
    borders: unique(raw.borders ?? []),
    independent: raw.independent,
    unMember: raw.unMember,
    landlocked: raw.landlocked,
    category,
    hasGeometry: false,
    codesAreIso: raw.status === 'officially-assigned',
    searchAliases: aliases,
  };
}

function readCache(): CachedRemoteData | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRemoteData;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !parsed.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload: CachedRemoteData['payload']): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ fetchedAt: Date.now(), payload } satisfies CachedRemoteData),
    );
  } catch {
    // A full or unavailable localStorage should never prevent the atlas from loading.
  }
}

function extractRemoteCountries(payload: RawCountry[] | CountrySnapshot): RawCountry[] {
  if (Array.isArray(payload)) return payload as RawCountry[];
  if (Array.isArray(payload?.countries)) return payload.countries;
  return [];
}

function mergeWithBundled(remote: RawCountry[]): RawCountry[] {
  const bundled = new Map(SNAPSHOT.countries.map((country) => [country.cca3, country]));
  return remote.map((country) => {
    const local = bundled.get(country.cca3);
    if (!local) return country;
    return {
      ...local,
      ...country,
      // The configurable remote endpoint may only provide metadata; retain the
      // bundled population and timezone snapshot in that case.
      population: country.population ?? local.population,
      populationYear: country.populationYear ?? local.populationYear,
      timezones:
        Array.isArray(country.timezones) && country.timezones.length > 0
          ? country.timezones
          : local.timezones,
    };
  });
}

async function fetchRemote(url: string, signal?: AbortSignal): Promise<RawCountry[] | CountrySnapshot> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Country data request failed (HTTP ${response.status})`);
    }
    return (await response.json()) as RawCountry[] | CountrySnapshot;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function loadDirectory(signal?: AbortSignal): Promise<CountryDirectoryResult> {
  const remoteUrl = import.meta.env.VITE_COUNTRY_DATA_URL?.trim();
  let rawCountries = SNAPSHOT.countries;
  let warning: string | null = null;

  if (remoteUrl) {
    const cache = readCache();
    const cacheIsFresh = cache && Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS;
    if (cacheIsFresh) {
      rawCountries = mergeWithBundled(extractRemoteCountries(cache.payload));
    } else {
      try {
        const payload = await fetchRemote(remoteUrl, signal);
        rawCountries = mergeWithBundled(extractRemoteCountries(payload));
        writeCache(payload);
      } catch (error) {
        if (signal?.aborted) throw error;
        warning =
          'Live country-reference data could not be refreshed. The bundled snapshot is being used.';
        if (cache) {
          rawCountries = mergeWithBundled(extractRemoteCountries(cache.payload));
        }
      }
    }
  }

  const countries = rawCountries.map(normalizeCountry);
  const deduped = [...new Map(countries.map((country) => [country.cca3, country])).values()];
  return {
    countries: deduped,
    snapshotDate: SNAPSHOT.generatedAt,
    warning,
  };
}

/**
 * Loads and normalizes the country directory. Successful remote responses are
 * cached in localStorage; the shipped snapshot guarantees offline operation.
 */
export function loadCountryDirectory(signal?: AbortSignal): Promise<CountryDirectoryResult> {
  if (!memoryPromise) {
    memoryPromise = loadDirectory(signal).catch((error) => {
      memoryPromise = null;
      throw error;
    });
  }
  return memoryPromise;
}

export function clearCountryCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
  memoryPromise = null;
}

export function getFlagUrl(country: Country, size: 'w80' | 'w320' | 'svg' = 'w80'): string | null {
  return flagUrl(country.cca2, size);
}

export function getCountryCategories(countries: Country[]): {
  countries: Country[];
  territories: Country[];
} {
  return {
    countries: countries.filter((country) => country.category === 'country'),
    territories: countries.filter(
      (country) => country.category === 'territory' || country.category === 'disputed',
    ),
  };
}
