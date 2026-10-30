import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Globe2,
  LoaderCircle,
  Menu,
  MousePointer2,
  PanelLeftOpen,
  RotateCw,
} from 'lucide-react';
import { AboutModal } from './components/AboutModal/AboutModal';
import { GlobeView } from './components/GlobeView/GlobeView';
import { LayerControls } from './components/GlobeView/LayerControls';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useAtlasData } from './hooks/useAtlasData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMediaQuery } from './hooks/useMediaQuery';
import {
  CONTINENTS,
  OCEANS,
  OCEAN_COUNTRY_CODES,
} from './services/geographyData';
import type {
  AtlasData,
  BrowseCategory,
  CapitalEntry,
  ContinentInfo,
  Country,
  GlobeFocusRequest,
  LayerSettings,
  OceanInfo,
  SearchResult,
  SidebarView,
} from './types';
import { DEFAULT_LAYERS } from './types';

const LAYERS_KEY = 'world-atlas:map-layers:v1';
const VIEW_STACK_KEY = 'world-atlas:view-stack:v1';
const MAX_VIEW_STACK = 6;
const NO_HIGHLIGHTED_CODES: ReadonlySet<string> = new Set();

function findCountryByCode(data: AtlasData, code: string): Country | null {
  const normalized = code.trim().toUpperCase();
  return (
    data.countriesByCode.get(normalized) ??
    data.countries.find((country) => country.cca2 === normalized) ??
    null
  );
}

function isSidebarView(value: unknown): value is SidebarView {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === 'browse') return true;
  if (candidate.kind === 'country') {
    return (
      typeof candidate.code === 'string' &&
      candidate.code.trim().length > 0 &&
      (candidate.focusCapital === undefined || typeof candidate.focusCapital === 'string')
    );
  }
  if (candidate.kind === 'continent') {
    return CONTINENTS.some((continent) => continent.name === candidate.continent);
  }
  if (candidate.kind === 'ocean') {
    return OCEANS.some((ocean) => ocean.id === candidate.oceanId);
  }
  return false;
}

function readStoredStack(): SidebarView[] | null {
  try {
    const raw = window.sessionStorage.getItem(VIEW_STACK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const stack = parsed.filter(isSidebarView).slice(-MAX_VIEW_STACK);
    return stack.length > 0 ? stack : null;
  } catch {
    return null;
  }
}

function wasPageReload(): boolean {
  try {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming | undefined;
    return navigation?.type === 'reload';
  } catch {
    return false;
  }
}

function parseInitialState(): { stack: SidebarView[]; category: BrowseCategory | null } {
  if (typeof window === 'undefined') {
    return { stack: [{ kind: 'browse' }], category: null };
  }

  const params = new URLSearchParams(window.location.search);
  const countryCode = params.get('country')?.trim();
  const capital = params.get('capital')?.trim() || undefined;
  const continentParam = params.get('continent')?.trim();
  const oceanParam = params.get('ocean')?.trim();

  let state: { stack: SidebarView[]; category: BrowseCategory | null } = {
    stack: [{ kind: 'browse' }],
    category: null,
  };

  if (countryCode) {
    state = {
      stack: [
        { kind: 'browse' },
        { kind: 'country', code: countryCode.toUpperCase(), focusCapital: capital },
      ],
      category: null,
    };
  } else if (continentParam) {
    const continent = CONTINENTS.find(
      (item) => item.name.toLowerCase() === continentParam.toLowerCase(),
    );
    if (continent) {
      state = {
        stack: [{ kind: 'browse' }, { kind: 'continent', continent: continent.name }],
        category: null,
      };
    }
  } else if (oceanParam) {
    const ocean = OCEANS.find(
      (item) =>
        item.id === oceanParam.toLowerCase() ||
        item.name.toLowerCase() === oceanParam.toLowerCase(),
    );
    if (ocean) {
      state = {
        stack: [{ kind: 'browse' }, { kind: 'ocean', oceanId: ocean.id }],
        category: null,
      };
    }
  }

  // A reload keeps the URL but would otherwise discard the in-memory stack.
  // Restore it only when the stored final view still matches the URL.
  if (wasPageReload()) {
    const stored = readStoredStack();
    const current = state.stack[state.stack.length - 1];
    if (stored && viewsEqual(stored[stored.length - 1], current)) {
      return { stack: stored, category: state.category };
    }
  }

  return state;
}

function viewsEqual(a: SidebarView, b: SidebarView): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'browse') return true;
  if (a.kind === 'country' && b.kind === 'country') {
    return a.code === b.code && a.focusCapital === b.focusCapital;
  }
  if (a.kind === 'continent' && b.kind === 'continent') {
    return a.continent === b.continent;
  }
  return a.kind === 'ocean' && b.kind === 'ocean' && a.oceanId === b.oceanId;
}

export default function App() {
  const { data, loading, error, retry } = useAtlasData();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [initialState] = useState(parseInitialState);
  const [viewStack, setViewStack] = useState<SidebarView[]>(initialState.stack);
  const [expandedCategory, setExpandedCategory] = useState<BrowseCategory | null>(
    initialState.category,
  );
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    'world-atlas:sidebar-collapsed:v1',
    false,
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [focus, setFocus] = useState<GlobeFocusRequest | null>(null);
  const focusKeyRef = useRef(0);
  const initialFocusHandledRef = useRef(false);

  const [storedLayers, setStoredLayers] = useLocalStorage<LayerSettings>(
    LAYERS_KEY,
    DEFAULT_LAYERS,
  );
  const layers = useMemo<LayerSettings>(
    () => ({ ...DEFAULT_LAYERS, ...storedLayers }),
    [storedLayers],
  );

  const view = viewStack[viewStack.length - 1];

  useEffect(() => {
    try {
      window.sessionStorage.setItem(VIEW_STACK_KEY, JSON.stringify(viewStack));
    } catch {
      // Storage can be unavailable; navigation still works in memory.
    }
  }, [viewStack]);

  const highlightedCodes = useMemo<ReadonlySet<string>>(() => {
    if (!data) return NO_HIGHLIGHTED_CODES;
    if (view.kind === 'country') {
      const country = findCountryByCode(data, view.code);
      return country ? new Set([country.cca3]) : NO_HIGHLIGHTED_CODES;
    }
    if (view.kind === 'continent') {
      return new Set(
        data.countries
          .filter((country) => country.continent === view.continent)
          .map((country) => country.cca3),
      );
    }
    if (view.kind === 'ocean') return OCEAN_COUNTRY_CODES[view.oceanId];
    return NO_HIGHLIGHTED_CODES;
  }, [data, view]);

  const highlightedFeatureCount = useMemo(
    () =>
      data
        ? data.features.filter((feature) =>
            highlightedCodes.has(feature.country.cca3),
          ).length
        : 0,
    [data, highlightedCodes],
  );

  const selectionSummary = useMemo(() => {
    if (!data) return null;
    if (view.kind === 'country') {
      return findCountryByCode(data, view.code)?.commonName ?? null;
    }
    if (view.kind === 'continent') {
      return `${view.continent} · ${highlightedFeatureCount} highlighted`;
    }
    if (view.kind === 'ocean') {
      const ocean = data.oceans.find((item) => item.id === view.oceanId);
      return ocean
        ? `${ocean.name} · ${highlightedFeatureCount} coastal places`
        : null;
    }
    return null;
  }, [data, view, highlightedFeatureCount]);

  const requestFocus = useCallback((payload: Omit<GlobeFocusRequest, 'key'>) => {
    focusKeyRef.current += 1;
    setFocus({ ...payload, key: focusKeyRef.current });
  }, []);

  const locateCountry = useCallback(
    (country: Country, capitalName?: string) => {
      if (!data) return;

      const matchedCapital = capitalName
        ? country.capitals.find(
            (capital) =>
              capital.name === capitalName && capital.lat != null && capital.lng != null,
          )
        : undefined;
      const feature = data.features.find(
        (item) => item.country.cca3 === country.cca3,
      );

      let lat: number | null = null;
      let lng: number | null = null;
      if (matchedCapital?.lat != null && matchedCapital.lng != null) {
        lat = matchedCapital.lat;
        lng = matchedCapital.lng;
      } else if (feature) {
        lat = feature.properties.labelLat;
        lng = feature.properties.labelLng;
      } else if (country.coordinates) {
        [lat, lng] = country.coordinates;
      }

      if (lat == null || lng == null) return;

      const sizeAltitude =
        country.area != null && country.area > 5_000_000
          ? 1.9
          : country.area != null && country.area > 1_000_000
            ? 1.5
            : 1.05;
      const altitude = matchedCapital ? 0.72 : sizeAltitude;
      const capitalLabel = matchedCapital?.name;

      requestFocus({
        lat,
        lng,
        altitude,
        label: capitalLabel ?? country.commonName,
        subtitle: capitalLabel
          ? `Capital of ${country.commonName}`
          : `${country.continent}${country.hasGeometry ? '' : ' · coordinate marker'}`,
      });
    },
    [data, requestFocus],
  );

  const locateContinent = useCallback(
    (continent: ContinentInfo) => {
      requestFocus({
        lat: continent.center[0],
        lng: continent.center[1],
        altitude: continent.altitude,
        label: continent.name,
        subtitle: 'Continent · representative centre',
      });
    },
    [requestFocus],
  );

  const locateOcean = useCallback(
    (ocean: OceanInfo) => {
      requestFocus({
        lat: ocean.coordinates[0],
        lng: ocean.coordinates[1],
        altitude: 1.55,
        label: ocean.name,
        subtitle: 'Ocean · representative point',
      });
    },
    [requestFocus],
  );

  const pushView = useCallback((next: SidebarView) => {
    setViewStack((previous) => {
      const current = previous[previous.length - 1];
      if (current && viewsEqual(current, next)) return previous;
      return [...previous, next].slice(-MAX_VIEW_STACK);
    });
    setMobileOpen(false);
  }, []);

  const handleSelectCountry = useCallback(
    (country: Country, origin: 'list' | 'search' | 'neighbour') => {
      pushView({ kind: 'country', code: country.cca3 });
      locateCountry(country);
      if (origin === 'search') setQuery('');
    },
    [locateCountry, pushView],
  );

  const handleSelectCapital = useCallback(
    (capital: CapitalEntry) => {
      if (!data) return;
      const country = data.countriesByCode.get(capital.countryCode);
      if (!country) return;
      pushView({
        kind: 'country',
        code: country.cca3,
        focusCapital: capital.name,
      });
      locateCountry(country, capital.name);
    },
    [data, locateCountry, pushView],
  );

  const handleSelectContinent = useCallback(
    (continent: ContinentInfo) => {
      pushView({ kind: 'continent', continent: continent.name });
      locateContinent(continent);
    },
    [locateContinent, pushView],
  );

  const handleSelectOcean = useCallback(
    (ocean: OceanInfo) => {
      pushView({ kind: 'ocean', oceanId: ocean.id });
      locateOcean(ocean);
    },
    [locateOcean, pushView],
  );

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      if (result.kind === 'country') {
        handleSelectCountry(result.country, 'search');
      } else if (result.kind === 'capital') {
        handleSelectCapital(result.capital);
      } else if (result.kind === 'continent') {
        handleSelectContinent(result.continent);
      } else {
        handleSelectOcean(result.ocean);
      }
    },
    [handleSelectCapital, handleSelectContinent, handleSelectCountry, handleSelectOcean],
  );

  const handleGlobeSelect = useCallback(
    (country: Country) => {
      pushView({ kind: 'country', code: country.cca3 });
    },
    [pushView],
  );

  const handleBack = useCallback(() => {
    setViewStack((previous) =>
      previous.length > 1 ? previous.slice(0, -1) : previous,
    );
    setFocus(null);
    setMobileOpen(false);
  }, []);

  const handleBackToBrowse = useCallback(() => {
    setViewStack([{ kind: 'browse' }]);
    setExpandedCategory(null);
    setFocus(null);
    setMobileOpen(false);
  }, []);

  const handleResetSelection = useCallback(() => {
    setViewStack([{ kind: 'browse' }]);
    setFocus(null);
    setMobileOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => !collapsed);
    setMobileOpen(false);
  }, [setSidebarCollapsed]);

  const previousView = viewStack.length > 1 ? viewStack[viewStack.length - 2] : null;
  let backLabel = 'Back to browse';
  if (previousView) {
    if (previousView.kind === 'country') {
      const country = data ? findCountryByCode(data, previousView.code) : null;
      backLabel = country ? `Back to ${country.commonName}` : 'Back';
    } else if (previousView.kind === 'continent') {
      backLabel = `Back to ${previousView.continent}`;
    } else if (previousView.kind === 'ocean') {
      const ocean = OCEANS.find((item) => item.id === previousView.oceanId);
      backLabel = ocean ? `Back to ${ocean.name}` : 'Back';
    }
  }

  const updateLayer = useCallback(
    (key: keyof LayerSettings, value: boolean) => {
      setStoredLayers((previous) => ({
        ...DEFAULT_LAYERS,
        ...previous,
        [key]: value,
      }));
    },
    [setStoredLayers],
  );

  const resetLayers = useCallback(() => {
    setStoredLayers({ ...DEFAULT_LAYERS });
  }, [setStoredLayers]);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, button, [contenteditable="true"]',
        )
      ) {
        return;
      }
      const input = document.querySelector<HTMLInputElement>('#atlas-search');
      if (input) {
        event.preventDefault();
        input.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('country');
    params.delete('capital');
    params.delete('continent');
    params.delete('ocean');

    if (view.kind === 'country') {
      params.set('country', view.code);
      if (view.focusCapital) params.set('capital', view.focusCapital);
    } else if (view.kind === 'continent') {
      params.set('continent', view.continent);
    } else if (view.kind === 'ocean') {
      params.set('ocean', view.oceanId);
    }

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [view]);

  useEffect(() => {
    if (!data || initialFocusHandledRef.current) return;
    initialFocusHandledRef.current = true;

    const current = viewStack[viewStack.length - 1];
    if (current.kind === 'country') {
      const country = findCountryByCode(data, current.code);
      if (country) {
        if (country.cca3 !== current.code) {
          setViewStack((previous) => [
            ...previous.slice(0, -1),
            { kind: 'country', code: country.cca3, focusCapital: current.focusCapital },
          ]);
        }
        locateCountry(country, current.focusCapital);
      }
    } else if (current.kind === 'continent') {
      const continent = data.continents.find((item) => item.name === current.continent);
      if (continent) locateContinent(continent);
    } else if (current.kind === 'ocean') {
      const ocean = data.oceans.find((item) => item.id === current.oceanId);
      if (ocean) locateOcean(ocean);
    }
    // Initial URL focus should only run once, when the atlas data first arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className={`app${sidebarCollapsed ? ' app--sidebar-collapsed' : ''}`}>
      <Sidebar
        data={data}
        loading={loading}
        error={error}
        onRetry={retry}
        view={view}
        backLabel={backLabel}
        expandedCategory={expandedCategory}
        onExpandedCategoryChange={setExpandedCategory}
        query={query}
        onQueryChange={setQuery}
        onSelectResult={handleSelectResult}
        onSelectCountry={handleSelectCountry}
        onSelectContinent={handleSelectContinent}
        onSelectOcean={handleSelectOcean}
        onSelectCapital={handleSelectCapital}
        onBack={handleBack}
        onBackToBrowse={handleBackToBrowse}
        onResetSelection={handleResetSelection}
        onLocateCountry={locateCountry}
        onLocateContinent={locateContinent}
        onLocateOcean={locateOcean}
        onOpenAbout={() => setAboutOpen(true)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isMobile={isMobile}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <main className="stage">
        {sidebarCollapsed && !isMobile ? (
          <button
            type="button"
            className="sidebar-reveal"
            aria-label="Show sidebar"
            aria-controls="atlas-sidebar"
            title="Show sidebar"
            onClick={toggleSidebar}
          >
            <PanelLeftOpen size={17} strokeWidth={1.9} aria-hidden="true" />
          </button>
        ) : null}

        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-button mobile-topbar__menu"
            aria-label="Open atlas navigation"
            aria-expanded={mobileOpen}
            aria-controls="atlas-sidebar"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={19} strokeWidth={2} />
          </button>
          <span className="mobile-topbar__brand">
            <Globe2 size={17} strokeWidth={1.7} aria-hidden="true" />
            WORLD ATLAS
          </span>
        </header>

        <div className="stage-meta">
          <p className="stage-meta__eyebrow">
            <span className="stage-meta__dot" aria-hidden="true" />
            Interactive political globe
          </p>
          <p className="stage-meta__text">Drag to rotate · Scroll to zoom · Click a country</p>
        </div>

        <div className="stage-tools" aria-label="Globe display tools">
          <button
            type="button"
            className={`stage-tool stage-tool--icon ${layers.autoRotate ? 'stage-tool--active' : ''}`}
            aria-label={layers.autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
            aria-pressed={layers.autoRotate}
            title={layers.autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
            onClick={() => updateLayer('autoRotate', !layers.autoRotate)}
          >
            <RotateCw size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>
          <LayerControls settings={layers} onChange={updateLayer} onReset={resetLayers} />
        </div>

        {data ? (
          <GlobeView
            data={data}
            layers={layers}
            highlightedCodes={highlightedCodes}
            focus={focus}
            onSelectCountry={handleGlobeSelect}
          />
        ) : (
          <div className="stage-placeholder">
            {error ? (
              <>
                <span className="stage-placeholder__icon" aria-hidden="true">
                  <AlertTriangle size={24} strokeWidth={1.8} />
                </span>
                <h1>The globe is unavailable</h1>
                <p>{error}</p>
                <button type="button" className="button button--primary" onClick={retry}>
                  Try again
                </button>
              </>
            ) : (
              <>
                <span className="stage-placeholder__icon" aria-hidden="true">
                  <LoaderCircle className="stage-loading__spinner" size={28} />
                </span>
                <h1>Building the atlas</h1>
                <p>Loading boundary geometry and the country reference snapshot…</p>
              </>
            )}
          </div>
        )}

        {data && view.kind === 'browse' ? (
          <div className="stage-hint">
            <MousePointer2 size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>Select a country on the globe or browse the atlas</span>
          </div>
        ) : null}

        <button
          type="button"
          className="stage-attribution"
          onClick={() => setAboutOpen(true)}
          title="Open data sources and limitations"
        >
          <Database size={13} strokeWidth={1.9} aria-hidden="true" />
          <span>Natural Earth · mledoze/countries · World Bank · FlagCDN</span>
        </button>

        {selectionSummary ? (
          <div className="stage-selection" role="status">
            <span className="stage-selection__label">Selected</span>
            <span className="stage-selection__name">{selectionSummary}</span>
          </div>
        ) : null}
      </main>

      <AboutModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        snapshotDate={data?.snapshotDate ?? null}
        sourceWarning={data?.sourceWarning ?? null}
      />
    </div>
  );
}
