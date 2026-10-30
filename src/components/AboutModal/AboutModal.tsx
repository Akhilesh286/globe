import { useEffect, useId, useRef } from 'react';
import { Database, ExternalLink, Info, RefreshCw, X } from 'lucide-react';
import { DATA_SOURCES } from '../../services/geographyData';
import { clearCountryCache } from '../../services/countriesApi';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  snapshotDate: string | null;
  sourceWarning: string | null;
}

function formatSnapshotDate(value: string | null): string {
  if (!value) return 'Bundled reference snapshot';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Bundled reference snapshot';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function AboutModal({ open, onClose, snapshotDate, sourceWarning }: AboutModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal__header">
          <span className="modal__glyph" aria-hidden="true">
            <Database size={18} strokeWidth={1.8} />
          </span>
          <div className="modal__heading">
            <p className="modal__eyebrow">Reference & attribution</p>
            <h2 className="modal__title" id={titleId}>
              Data & credits
            </h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="icon-button modal__close"
            aria-label="Close data and credits"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="modal__body">
          <section className="modal__section">
            <div className="modal__status">
              <span className="modal__status-dot" aria-hidden="true" />
              <div>
                <p className="modal__status-title">Offline-first reference snapshot</p>
                <p className="modal__status-detail">
                  Snapshot generated {formatSnapshotDate(snapshotDate)}. The atlas loads bundled
                  data and does not send a country-data request by default.
                </p>
              </div>
            </div>
            {sourceWarning ? (
              <div className="notice notice--info modal__warning">
                <Info size={15} strokeWidth={1.9} aria-hidden="true" />
                <p>{sourceWarning}</p>
              </div>
            ) : null}
          </section>

          <section className="modal__section">
            <h3 className="modal__section-title">Sources</h3>
            <ul className="source-list">
              {DATA_SOURCES.map((source) => (
                <li className="source" key={source.name}>
                  <a
                    className="source__name"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {source.name}
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </a>
                  <p className="source__detail">{source.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="modal__section">
            <h3 className="modal__section-title">Live refresh</h3>
            <p className="modal__paragraph">
              Set <code>VITE_COUNTRY_DATA_URL</code> before building to refresh the country
              directory from a compatible JSON endpoint. Responses are cached locally for seven
              days, and the bundled snapshot remains the fallback. REST Countries v5 requires an
              API key; the legacy unauthenticated endpoint is deprecated. No API key is shipped
              with this project.
            </p>
          </section>

          <section className="modal__section">
            <h3 className="modal__section-title">Known limitations</h3>
            <ul className="limitation-list">
              <li>
                Natural Earth 1:110m omits small states and many island territories. Those entities
                remain searchable and are located with a coordinate marker.
              </li>
              <li>
                Boundaries follow Natural Earth&apos;s de facto, compromise representation. They are
                not legal or diplomatic statements, and disputed areas may not match every
                convention.
              </li>
              <li>
                Population is a 2024 World Bank estimate where available. Capital coordinates,
                time zones and flags can be missing; the interface says “Data unavailable” rather
                than estimating values.
              </li>
              <li>
                Continental assignments and border lists follow the source metadata. Transcontinental
                states appear under one continent only.
              </li>
              <li>
                Country-name pronunciation uses the browser&apos;s installed speech-synthesis voices
                and reads English common names. Female/Male is inferred from voice names because
                browsers do not expose gender. The voice and speed choices are saved in local
                storage.
              </li>
            </ul>
          </section>

          <section className="modal__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                clearCountryCache();
                window.location.reload();
              }}
            >
              <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
              Clear cached reference data
            </button>
            <span className="modal__cache-note">Reloads the page after clearing local cache.</span>
          </section>
        </div>

        <footer className="modal__footer">
          <p>
            World Atlas · political geography visualisation. Flag images courtesy of FlagCDN.
          </p>
          <button type="button" className="button button--primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
