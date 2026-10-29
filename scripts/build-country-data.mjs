#!/usr/bin/env node
/**
 * Builds the bundled reference snapshot used by World Atlas.
 *
 * Sources
 * - Country metadata: https://github.com/mledoze/countries (ODbL-1.0)
 *   The same underlying community dataset historically used by REST Countries.
 * - Population: World Bank World Development Indicators, SP.POP.TOTL (CC BY 4.0)
 * - Time zones: https://github.com/dr5hn/countries-states-cities-database (ODbL-1.0)
 * - Capital coordinates: Natural Earth 1:10m Populated Places (public domain)
 * - Country boundaries: Natural Earth 1:110m Admin 0 Countries (public domain)
 *
 * Run with: npm run data:build
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = {
  metadata: {
    name: 'mledoze/countries',
    url: 'https://github.com/mledoze/countries',
    license: 'ODbL-1.0',
  },
  population: {
    name: 'World Bank World Development Indicators (SP.POP.TOTL)',
    url: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
    license: 'CC BY 4.0',
    year: '2024',
  },
  timezones: {
    name: 'Countries States Cities Database',
    url: 'https://github.com/dr5hn/countries-states-cities-database',
    license: 'ODbL-1.0',
  },
  capitalCoordinates: {
    name: 'Natural Earth 1:10m Populated Places',
    url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/',
    license: 'Public domain',
  },
  boundaries: {
    name: 'Natural Earth 1:110m Admin 0 Countries',
    url: 'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/',
    license: 'Public domain',
  },
};

const URLS = {
  countries: 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
  population:
    'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&date=2024',
  timezones:
    'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json',
  populatedPlaces:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson',
  boundaries:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
};

const CAPITAL_ALIASES = {
  AND: { 'andorra la vella': 'andorra' },
  DNK: { copenhagen: 'kobenhavn' },
  GRD: { "st. george's": "saint george's" },
  GUM: { 'hagatna': 'agana' },
  KAZ: { astana: 'nur-sultan' },
  KIR: { 'south tarawa': 'tarawa' },
  MNG: { 'ulan bator': 'ulaanbaatar' },
  MNP: { saipan: 'capitol hill' },
  PLW: { ngerulmud: 'melekeok' },
  SMR: { 'city of san marino': 'san marino' },
  TCA: { 'cockburn town': 'grand turk' },
};

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

async function fetchJson(url, { retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'world-atlas-data-builder/1.0' },
      });
      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}: ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 800 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function pickNativeName(name) {
  const natives = name?.native ? Object.values(name.native) : [];
  return natives[0]?.common ?? null;
}

async function main() {
  console.log('Fetching reference datasets…');
  const [countries, populationData, timezoneData, places, boundaries] = await Promise.all([
    fetchJson(URLS.countries),
    fetchJson(URLS.population),
    fetchJson(URLS.timezones),
    fetchJson(URLS.populatedPlaces),
    fetchJson(URLS.boundaries),
  ]);

  const populationRows = populationData?.[1] ?? [];
  const population = new Map();
  for (const row of populationRows) {
    if (!row?.countryiso3code || row.value == null) continue;
    population.set(row.countryiso3code, {
      value: Number(row.value),
      year: Number(row.date),
    });
  }
  // World Bank uses XKX for Kosovo; the metadata snapshot uses UNK.
  if (population.has('XKX') && !population.has('UNK')) {
    population.set('UNK', population.get('XKX'));
  }

  const timezonesByIso3 = new Map();
  for (const row of timezoneData) {
    if (!row?.iso3) continue;
    const zones = [...new Set((row.timezones ?? []).map((tz) => tz.zoneName).filter(Boolean))];
    timezonesByIso3.set(row.iso3, zones);
  }
  // The timezone dataset uses XKX for Kosovo; the metadata snapshot uses UNK.
  if (timezonesByIso3.has('XKX') && !timezonesByIso3.has('UNK')) {
    timezonesByIso3.set('UNK', timezonesByIso3.get('XKX'));
  }

  // Capital coordinates: Natural Earth 1:10m populated places.
  const placesByCountry = new Map();
  for (const feature of places.features) {
    const props = feature.properties;
    if (!props?.ADM0_A3 || !/capital/i.test(props.FEATURECLA ?? '')) continue;
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const list = placesByCountry.get(props.ADM0_A3) ?? [];
    list.push({
      name: props.NAME,
      lat: Number(coords[1]),
      lng: Number(coords[0]),
    });
    placesByCountry.set(props.ADM0_A3, list);
  }

  const capitalCoordinates = {};
  const unmatchedCapitalNames = [];

  const snapshotCountries = countries.map((country) => {
    const iso3 = country.cca3;
    const matched = [];
    for (const capitalName of country.capital ?? []) {
      const candidates = placesByCountry.get(iso3) ?? [];
      const alias = CAPITAL_ALIASES[iso3]?.[normalize(capitalName)];
      const key = alias ?? normalize(capitalName);
      const match = candidates.find((candidate) => normalize(candidate.name) === key);
      if (match) {
        matched.push({
          name: capitalName,
          lat: match.lat,
          lng: match.lng,
        });
      } else if (capitalName) {
        unmatchedCapitalNames.push(`${iso3}: ${capitalName}`);
      }
    }
    if (matched.length > 0) {
      capitalCoordinates[iso3] = matched;
    }

    const populationEntry = population.get(iso3);
    return {
      name: {
        common: country.name.common,
        official: country.name.official,
        nativeName: pickNativeName(country.name),
      },
      cca2: country.cca2 || null,
      cca3: iso3,
      ccn3: country.ccn3 || null,
      cioc: country.cioc || null,
      independent: country.independent ?? null,
      status: country.status ?? null,
      unMember: country.unMember ?? null,
      currencies: country.currencies ?? {},
      idd: country.idd ?? { root: '', suffixes: [] },
      capital: country.capital ?? [],
      tld: country.tld ?? [],
      altSpellings: country.altSpellings ?? [],
      region: country.region || null,
      subregion: country.subregion || null,
      languages: country.languages ?? {},
      latlng: country.latlng ?? null,
      landlocked: country.landlocked ?? null,
      borders: country.borders ?? [],
      area: country.area ?? null,
      flagEmoji: country.flag || null,
      population: populationEntry?.value ?? null,
      populationYear: populationEntry?.year ?? null,
      timezones: timezonesByIso3.get(iso3) ?? [],
    };
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sources: SOURCES,
    countries: snapshotCountries,
  };

  const metadataDir = resolve(root, 'src/data');
  const publicDataDir = resolve(root, 'public/data');
  await mkdir(metadataDir, { recursive: true });
  await mkdir(publicDataDir, { recursive: true });

  await writeFile(
    resolve(metadataDir, 'country-snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    resolve(metadataDir, 'capital-coordinates.json'),
    `${JSON.stringify(capitalCoordinates, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    resolve(publicDataDir, 'ne_110m_admin_0_countries.geojson'),
    `${JSON.stringify(boundaries)}\n`,
    'utf8',
  );

  console.log(`Wrote ${snapshotCountries.length} country records.`);
  console.log(`Wrote capital coordinates for ${Object.keys(capitalCoordinates).length} countries.`);
  console.log(`Unmatched capital names: ${unmatchedCapitalNames.length}`);
  console.log(`Boundary features: ${boundaries.features.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
