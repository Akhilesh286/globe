# World Atlas

An interactive political world atlas built on a 3D globe. Explore countries, capitals, continents and oceans; search local reference data; and switch map layers while the globe keeps its position.

![Stack](https://img.shields.io/badge/React-19-61dafb) ![Stack](https://img.shields.io/badge/TypeScript-5.9-3178c6) ![Stack](https://img.shields.io/badge/Vite-7-646cff) ![Stack](https://img.shields.io/badge/Globe.gl-2.46-0b0f1a)

## Features

- **3D political globe** rendered with Globe.gl / Three.js, including atmosphere, country polygons, hover tooltips, labels and smooth camera moves.
- **Five browse categories**: Countries (194 sovereign states), Continents, Oceans, Capitals and Territories (55 dependent territories plus Kosovo, Northern Cyprus and Somaliland).
- **Local ranked search** across country names and aliases, capitals, ISO codes, territories, continents and oceans. Flag suggestions, keyboard navigation and empty-result handling are included.
- **Country details**: flag, common/official/native names, ISO codes, continent/region, capital(s), population, area, currencies, languages, time zones, calling code, internet TLD, independence, UN membership, coordinates, landlocked/coastal status and clickable neighbours.
- **Country-name pronunciation**: a speaker control beside the country name reads the English common name using the browser’s installed speech-synthesis voices. Compact controls switch between female/male voices and slow/normal/fast speed, with a stop action while speaking.
- **Clickable navigation history** with a contextual back button. Opening a neighbour or capital pushes a new view; the globe camera state is preserved.
- **Group highlighting**: selecting a continent highlights every mapped country and territory in it; selecting an ocean highlights the countries and territories with a coastline on that ocean. The selected fill, border and raised-polygon transition match the single-country highlight.
- **Map layers** for borders, labels, capital markers, selected-country highlight, auto-rotation and atmosphere. Each setting is saved in `localStorage` and can be reset from the layer panel.
- **Deep links** for countries, capitals, continents and oceans.
- **Responsive layout**: a fixed sidebar on desktop that can be hidden with the header control and restored from the edge tab, plus an off-canvas drawer with a backdrop on mobile. Hidden navigation is removed from the accessibility tree.
- **Error and empty states** for data loading, WebGL failure, missing flags, missing IDs and no search matches.
- **About panel** documenting data sources, attribution, cache controls and known limitations.

## Requirements

- Node.js **20.19+** or **22.12+** (required by Vite 7)
- npm 10+
- A WebGL-capable browser for the globe

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server also listens on `0.0.0.0:5173`, so it can be opened from another device on the same network.

### Other commands

```bash
npm run typecheck   # TypeScript, no emit
npm run build       # typecheck + production build to dist/
npm run preview     # serve dist/ at http://localhost:4173
npm run data:build  # regenerate the bundled reference snapshot
```

`npm run build` currently produces a single JavaScript chunk of roughly 2.4 MB (about 690 kB gzip) because Globe.gl, Three.js and the country snapshot are bundled together. There is no runtime API dependency by default.

## Using the atlas

| Action | How |
| --- | --- |
| Focus search | Press `/` anywhere outside a form control, or click the search field |
| Move through suggestions | `↑` / `↓` |
| Open a suggestion | `Enter` |
| Close suggestions | `Escape` |
| Select a country | Click its polygon or label on the globe, a search result, a list row or a neighbour chip |
| Hear a country name | Open a country and press the speaker button beside its name. Press it again to stop |
| Change pronunciation style | Use the **Voice** (Female/Male) and **Speed** (Slow/Normal/Fast) controls below the country name; both choices are remembered |
| Highlight a continent or ocean | Open **Continents** or **Oceans** in the atlas index and select a row |
| Rotate / zoom | Drag and scroll on the globe, or use the zoom controls |
| Reset the view | Use the reset button below the zoom controls |
| Toggle auto-rotation | Use the auto-rotate action in the stage toolbar |
| Open map layers | Use the **Layers** button in the stage toolbar |
| Open data credits | Click the attribution strip at the bottom of the globe |

On mobile, open the drawer with the menu button. Selecting a place closes it automatically.

### Deep links

The URL is kept in sync with the current view using `replaceState`, so links can be shared or bookmarked:

```text
/?country=JPN
/?country=FRA&capital=Paris
/?continent=Asia
/?ocean=pacific
```

- `country` accepts an ISO alpha-3 code first. Alpha-2 codes are resolved after data loads, and alpha-3 becomes the canonical value in the URL.
- `capital` is matched against the selected country's capital names and focuses that capital.
- `continent` accepts a continent name, for example `Africa`, `North America` or `Oceania`.
- `ocean` accepts an ocean id (`pacific`, `atlantic`, `indian`, `southern`, `arctic`) or a full name.

## Data sources

The app ships with a generated snapshot so it works offline and needs no API key.

| Data | Source | Licence / notes |
| --- | --- | --- |
| Country metadata (names, capitals, currencies, languages, borders, ISO codes, TLDs) | [mledoze/countries](https://github.com/mledoze/countries) | ODbL-1.0; the community dataset historically used by REST Countries |
| Population, 2024 | [World Bank WDI `SP.POP.TOTL`](https://data.worldbank.org/indicator/SP.POP.TOTL) | CC BY 4.0 |
| IANA time zones | [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database) | ODbL-1.0 |
| Capital coordinates | [Natural Earth 1:10m Populated Places](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/) | Public domain |
| Country boundaries | [Natural Earth 1:110m Admin 0 Countries](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/) | Public domain; de facto compromise representation |
| Flags | [FlagCDN](https://flagcdn.com/) | Images loaded at display time; text fallback when unavailable |

### Bundled snapshot contents

The current snapshot (`src/data/country-snapshot.json`, generated 29 October 2026) contains:

- **250 metadata records**: 194 sovereign states, 55 dependent territories and Kosovo.
- **177 boundary features** in `public/data/ne_110m_admin_0_countries.geojson`.
- **203 countries with matched capital coordinates** in `src/data/capital-coordinates.json`.
- 34 records without a 2024 World Bank population value and 5 without a listed capital; these render “Data unavailable” instead of estimates.

Two boundary-only entities, **Northern Cyprus** and **Somaliland**, are added from Natural Earth when the atlas loads. Together with Kosovo they make up the three disputed/special entries in the Territories category.

### Regenerating the data

```bash
npm run data:build
```

The script fetches all five upstream datasets, matches capitals, applies a small set of documented name aliases (for example `Copenhagen` → `København`), and rewrites the three files above. It requires network access and may fail if an upstream URL, schema or rate limit changes. Review the diff before committing regenerated data.

### Optional live refresh

Copy `.env.example` to `.env` and set these variables, or define them in the build environment:

```bash
# A JSON endpoint returning either a flat array of country records
# or an object with a `countries` array. CORS must allow the app origin.
VITE_COUNTRY_DATA_URL=https://example.com/countries.json

# Override the country boundary GeoJSON endpoint.
VITE_COUNTRY_GEOJSON_URL=https://example.com/countries.geojson
```

Notes:

- `VITE_COUNTRY_DATA_URL` is read at runtime from the built bundle, so rebuild after changing it.
- Responses are cached in `localStorage` for **7 days**. If refresh fails, the atlas falls back to a cached response and then to the bundled snapshot, and displays a warning.
- The compatible remote shape matches the bundled snapshot. Missing population, time-zone or other fields are merged from the bundled record where possible.
- REST Countries **v5 requires an API key**, and the legacy unauthenticated endpoint is deprecated. `countries.dev` was checked during development and returned 404. No API key is shipped or proxied by this project.

## Project structure

```text
src/
  App.tsx                     app state, view stack, URL sync, layout, overlays
  components/
    AboutModal/               sources, limitations, cache reset
    GlobeView/                Globe.gl setup, polygon/label/point styling, layer panel
    Sidebar/                  browse/search/details orchestration, category browser
    CountryList/              country and territory rows
    CountryDetails/           country metadata, capitals, neighbours
    CapitalList/              capital rows
    ContinentList/            continent rows
    ContinentDetails/         continent view
    OceanList/                ocean rows
    OceanDetails/             ocean view
    ui/                       flag, toggle, info row and empty-state primitives
  services/
    countriesApi.ts           snapshot loading, optional remote fetch and cache
    geographyData.ts          boundary merge, continents, oceans, neighbours
    searchIndex.ts            local ranked search index
  hooks/                      data/search/media-query/local-storage hooks
  data/                       bundled metadata and capital coordinates
  styles/                     base, layout, sidebar, details, globe, modal, responsive
public/data/                  Natural Earth boundary GeoJSON
scripts/build-country-data.mjs reproducible snapshot builder
```

State is kept in a capped view stack (six entries). The globe instance is created once and is not remounted when navigating, so the camera position carries across views. `React.StrictMode` is intentionally not used to avoid double WebGL initialisation in development.

### Persistence keys

| Key | Purpose |
| --- | --- |
| `world-atlas:map-layers:v1` | Layer toggles and auto-rotation state (`localStorage`) |
| `world-atlas:view-stack:v1` | Per-tab navigation history, so Back still steps through the previous view after a reload (`sessionStorage`) |
| `world-atlas:sidebar-collapsed:v1` | Desktop sidebar visibility (`localStorage`) |
| `world-atlas:speech-gender:v1` | Preferred pronunciation voice: `female` or `male` (`localStorage`) |
| `world-atlas:speech-speed:v1` | Pronunciation speed: `slow`, `normal` or `fast` (`localStorage`) |
| `world-atlas:country-api-cache:v1` | Optional remote country-data cache, seven-day lifetime (`localStorage`) |

The About panel can clear the cached reference data and reload the page. Layer settings can be reset from the Layers panel.

## Limitations and data caveats

- **No fabricated values.** Missing population, capital, area, currency, language, time-zone, calling-code or flag data is shown as “Data unavailable” or omitted with a fallback.
- **Boundaries are not legal statements.** Natural Earth uses a de facto, compromise representation. Disputed areas and maritime boundaries may not match every national or international convention. The app does not draw its own borders.
- **Natural Earth 1:110m omits small states and many island territories.** Those entities remain searchable and listable, but they do not have a separate polygon. Selecting one focuses a coordinate marker/ring instead; the globe tooltip notes that no separate polygon exists at this scale.
- **Country count reflects the source classification.** “Countries” means the 194 records marked independent in the metadata. Territories and disputed/special entities are listed separately.
- **One continent per country.** Transcontinental states appear under a single continent, following the source metadata. Continental assignments are not inferred from geometry.
- **Capital coordinates are best-effort matches.** Some capitals, especially renamed or multi-capital cases, may lack coordinates. The details panel still lists the name.
- **Population is a 2024 World Bank estimate where available** and is not a live census. Some small territories are not covered by the indicator.
- **Ocean extents are conventional.** Oceans are represented by a centre point and approximate figures; the app does not draw ocean boundaries. Ocean highlighting uses broad coastal membership, groups major marginal seas with their parent ocean, and may include or exclude a country depending on the convention used.
- **Group highlights cover mapped polygons.** A continent or ocean selects all matching codes, but Natural Earth 1:110m does not provide a separate polygon for every small state or island territory. Those places remain selected in the data and are listed in the sidebar, but only mapped features can be coloured on the globe.
- **Flags come from an external CDN.** Offline use or blocked requests fall back to an emoji/text treatment; flags are decorative and are not required for identification.
- **Pronunciation depends on the browser.** Country names are read in English using the operating system/browser speech-synthesis voices. Browsers do not expose voice gender, so Female/Male is inferred from installed voice names and voice URIs; if no matching English voice is found, the app uses a fallback voice and shows a note. Availability, accent and audio quality vary by platform. Speed is applied through the speech rate. Unsupported browsers hide the pronunciation controls rather than showing a broken action.
- **The globe needs WebGL.** If WebGL cannot start, the app shows an error in the stage while the sidebar remains usable.
- **Very large territories and antimeridian wrapping** are rendered from the source geometry. Labels and camera framing use Natural Earth label points and may be imperfect at extreme zoom levels.
- **No server-side rendering.** The app is a static client-side build; deep links work through query parameters after JavaScript loads.

## Attribution

Natural Earth (public domain), mledoze/countries (ODbL-1.0), World Bank WDI (CC BY 4.0), Countries States Cities Database (ODbL-1.0), and FlagCDN. Full links and licence notes are available in the in-app **Data & credits** panel.

This is an educational visualisation, not an authoritative source for borders, sovereignty or current population statistics.
