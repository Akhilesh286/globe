import {
  AlertTriangle,
  Database,
  Globe2,
  Info,
  PanelLeftClose,
  RotateCcw,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  AtlasData,
  BrowseCategory,
  CapitalEntry,
  ContinentInfo,
  Country,
  OceanInfo,
  SearchResult,
  SidebarView,
} from '../../types';
import { EmptyList } from '../ui/EmptyList';
import { SearchBar } from './SearchBar';
import { CategoryBrowser } from './CategoryBrowser';
import { CountryDetails } from '../CountryDetails/CountryDetails';
import { ContinentDetails } from '../ContinentDetails/ContinentDetails';
import { OceanDetails } from '../OceanDetails/OceanDetails';

interface SidebarProps {
  data: AtlasData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  view: SidebarView;
  backLabel: string;
  expandedCategory: BrowseCategory | null;
  onExpandedCategoryChange: (category: BrowseCategory | null) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectResult: (result: SearchResult) => void;
  onSelectCountry: (country: Country, origin: 'list' | 'search' | 'neighbour') => void;
  onSelectContinent: (continent: ContinentInfo) => void;
  onSelectOcean: (ocean: OceanInfo) => void;
  onSelectCapital: (capital: CapitalEntry) => void;
  onBack: () => void;
  onBackToBrowse: () => void;
  onResetSelection: () => void;
  onLocateCountry: (country: Country) => void;
  onLocateContinent: (continent: ContinentInfo) => void;
  onLocateOcean: (ocean: OceanInfo) => void;
  onOpenAbout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <div className="sidebar-skeleton__category" key={index}>
          <span className="skeleton skeleton--icon" />
          <span className="skeleton skeleton--line" style={{ width: `${40 + index * 6}%` }} />
          <span className="skeleton skeleton--count" />
        </div>
      ))}
      <span className="skeleton skeleton--note" />
      <div className="sidebar-skeleton__rows">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div className="sidebar-skeleton__row" key={index}>
            <span className="skeleton skeleton--flag" />
            <span className="skeleton skeleton--line" style={{ width: `${48 + (index % 3) * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sidebar({
  data,
  loading,
  error,
  onRetry,
  view,
  backLabel,
  expandedCategory,
  onExpandedCategoryChange,
  query,
  onQueryChange,
  onSelectResult,
  onSelectCountry,
  onSelectContinent,
  onSelectOcean,
  onSelectCapital,
  onBack,
  onBackToBrowse,
  onResetSelection,
  onLocateCountry,
  onLocateContinent,
  onLocateOcean,
  onOpenAbout,
  mobileOpen,
  onMobileClose,
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
}: SidebarProps) {
  const sidebarHidden = isMobile ? !mobileOpen : sidebarCollapsed;
  const country =
    data && view.kind === 'country' ? data.countriesByCode.get(view.code) ?? null : null;

  let content: ReactNode = null;
  if (error) {
    content = (
      <div className="sidebar-error">
        <span className="sidebar-error__icon" aria-hidden="true">
          <AlertTriangle size={20} strokeWidth={1.8} />
        </span>
        <h2>Unable to load the atlas</h2>
        <p>{error}</p>
        <button type="button" className="button button--primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  } else if (loading || !data) {
    content = <SidebarSkeleton />;
  } else if (view.kind === 'country') {
    content = country ? (
      <CountryDetails
        country={country}
        data={data}
        backLabel={backLabel}
        focusCapital={view.focusCapital}
        onBack={onBack}
        onSelectCountry={(neighbour) => onSelectCountry(neighbour, 'neighbour')}
        onLocate={() => onLocateCountry(country)}
      />
    ) : (
      <div className="view-enter">
        <EmptyList
          title="Country not found"
          description="This profile is not present in the current reference snapshot."
        />
        <button type="button" className="button button--secondary button--full" onClick={onBackToBrowse}>
          Return to browse
        </button>
      </div>
    );
  } else if (view.kind === 'continent') {
    const continent = data.continents.find((item) => item.name === view.continent);
    content = continent ? (
      <ContinentDetails
        continent={continent}
        data={data}
        backLabel={backLabel}
        onBack={onBack}
        onSelectCountry={(selected) => onSelectCountry(selected, 'list')}
        onLocate={() => onLocateContinent(continent)}
      />
    ) : null;
  } else if (view.kind === 'ocean') {
    const ocean = data.oceans.find((item) => item.id === view.oceanId);
    content = ocean ? (
      <OceanDetails
        ocean={ocean}
        backLabel={backLabel}
        onBack={onBack}
        onLocate={() => onLocateOcean(ocean)}
      />
    ) : null;
  } else {
    content = (
      <CategoryBrowser
        data={data}
        query={query}
        expandedCategory={expandedCategory}
        onExpandedCategoryChange={onExpandedCategoryChange}
        selectedCode={null}
        onSelectCountry={(selected) => onSelectCountry(selected, 'list')}
        onSelectContinent={onSelectContinent}
        onSelectOcean={onSelectOcean}
        onSelectCapital={onSelectCapital}
      />
    );
  }

  return (
    <aside
      className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}
      id="atlas-sidebar"
      aria-label="Atlas navigation"
      aria-hidden={sidebarHidden ? true : undefined}
      inert={sidebarHidden ? true : undefined}
    >
      <div className="sidebar__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <Globe2 size={20} strokeWidth={1.6} />
            <span className="brand__orbit" />
          </span>
          <span className="brand__copy">
            <span className="brand__title">WORLD ATLAS</span>
            <span className="brand__subtitle">Political geography</span>
          </span>
        </div>
        <div className="sidebar__header-actions">
          <button
            type="button"
            className="icon-button sidebar__collapse"
            onClick={onToggleSidebar}
            aria-label="Hide sidebar"
            aria-controls="atlas-sidebar"
            title="Hide sidebar"
          >
            <PanelLeftClose size={17} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            className="icon-button sidebar__close"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="sidebar__search">
        <SearchBar
          data={data}
          value={query}
          onChange={onQueryChange}
          onSelectResult={onSelectResult}
        />
      </div>

      <div className="sidebar__content" id="sidebar-content">
        {content}
      </div>

      <footer className="sidebar__footer">
        <div className="footer-actions">
          {view.kind !== 'browse' ? (
            <button type="button" className="footer-action" onClick={onResetSelection}>
              <RotateCcw size={14} strokeWidth={1.9} aria-hidden="true" />
              Reset selection
            </button>
          ) : null}
          <button type="button" className="footer-action" onClick={onOpenAbout}>
            <Database size={14} strokeWidth={1.9} aria-hidden="true" />
            Data & credits
          </button>
        </div>
        <div className="footer-meta">
          <span className="footer-meta__status" aria-hidden="true" />
          <span>
            {data
              ? data.sourceWarning
                ? 'Bundled snapshot · live refresh unavailable'
                : 'Natural Earth · reference snapshot'
              : 'Loading reference data…'}
          </span>
          <span className="footer-meta__version">
            <Info size={12} strokeWidth={2} aria-hidden="true" />
            1:110m
          </span>
        </div>
      </footer>
    </aside>
  );
}
