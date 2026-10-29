import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowUpRight, Globe2, Search, SearchX, Waves, X } from 'lucide-react';
import type { AtlasData, SearchResult } from '../../types';
import { useSearch } from '../../hooks/useSearch';
import { categoryLabel } from '../ui/InfoRow';
import { EmptyList } from '../ui/EmptyList';
import { Flag } from '../ui/Flag';

interface SearchBarProps {
  data: AtlasData | null;
  value: string;
  onChange: (value: string) => void;
  onSelectResult: (result: SearchResult) => void;
}

function resultLabel(result: SearchResult): string {
  if (result.kind === 'country') return result.country.commonName;
  if (result.kind === 'capital') return result.capital.name;
  if (result.kind === 'continent') return result.continent.name;
  return result.ocean.name;
}

function resultMeta(result: SearchResult): string {
  if (result.kind === 'country') {
    return `${result.country.subregion || result.country.region || result.country.continent}`;
  }
  if (result.kind === 'capital') return `Capital of ${result.capital.countryName}`;
  if (result.kind === 'continent') return 'Continent';
  return 'Ocean · representative point';
}

function resultType(result: SearchResult): string {
  if (result.kind === 'country') {
    return result.country.category === 'country' ? 'Country' : categoryLabel(result.country.category);
  }
  if (result.kind === 'capital') return 'Capital';
  if (result.kind === 'continent') return 'Continent';
  return 'Ocean';
}

function ResultGlyph({ result }: { result: SearchResult }) {
  if (result.kind === 'country') {
    return (
      <Flag
        cca2={result.country.cca2}
        emoji={result.country.flagEmoji}
        name={result.country.commonName}
        size="xs"
      />
    );
  }
  if (result.kind === 'capital') {
    return (
      <Flag
        cca2={result.capital.countryCca2}
        emoji={result.capital.flagEmoji}
        name={result.capital.countryName}
        size="xs"
      />
    );
  }
  return (
    <span className="search-result__glyph" aria-hidden="true">
      {result.kind === 'continent' ? (
        <Globe2 size={15} strokeWidth={1.7} />
      ) : (
        <Waves size={15} strokeWidth={1.7} />
      )}
    </span>
  );
}

export function SearchBar({ data, value, onChange, onSelectResult }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useSearch(data, value, 14);
  const hasQuery = value.trim().length > 0;
  const isVisible = open && hasQuery;

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results.length, value]);

  useEffect(() => {
    if (!isVisible || activeIndex < 0) return;
    const node = document.getElementById(`${listId}-${activeIndex}`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isVisible, listId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const select = (result: SearchResult) => {
    onSelectResult(result);
    onChange('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isVisible && hasQuery) {
        setOpen(true);
        return;
      }
      if (results.length > 0) {
        setActiveIndex((index) => (index + 1) % results.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      }
    } else if (event.key === 'Enter') {
      if (isVisible && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        select(results[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="search" ref={containerRef}>
      <div className={`search__field ${isVisible ? 'search__field--open' : ''}`}>
        <Search className="search__icon" size={17} strokeWidth={1.8} aria-hidden="true" />
        <input
          ref={inputRef}
          id="atlas-search"
          type="text"
          className="search__input"
          placeholder="Search countries, capitals…"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (hasQuery) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label="Search the atlas"
          aria-autocomplete="list"
          aria-expanded={isVisible}
          aria-controls={isVisible ? listId : undefined}
          aria-activedescendant={
            isVisible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          disabled={!data}
        />
        {hasQuery ? (
          <button
            type="button"
            className="search__clear"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              setOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        ) : (
          <kbd className="search__shortcut" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      {isVisible ? (
        <div className="search-results" role="listbox" id={listId} aria-label="Search results">
          {results.length === 0 ? (
            <div className="search-results__empty">
              <EmptyList
                icon={SearchX}
                title="No places found"
                description={`Nothing in the atlas matches “${value.trim()}”.`}
              />
            </div>
          ) : (
            <>
              <div className="search-results__list">
                {results.map((result, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`search-result ${index === activeIndex ? 'search-result--active' : ''}`}
                    key={result.id}
                    id={`${listId}-${index}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(result)}
                  >
                    <ResultGlyph result={result} />
                    <span className="search-result__copy">
                      <span className="search-result__label">{resultLabel(result)}</span>
                      <span className="search-result__meta">{resultMeta(result)}</span>
                    </span>
                    <span className="search-result__type">{resultType(result)}</span>
                    <ArrowUpRight className="search-result__arrow" size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="search-results__footer">
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> to navigate
                </span>
                <span>
                  <kbd>↵</kbd> to open
                </span>
                <span>
                  <kbd>esc</kbd> to close
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
