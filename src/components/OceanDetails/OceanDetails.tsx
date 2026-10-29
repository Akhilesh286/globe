import { ArrowLeft, Compass, LocateFixed, Ruler, Waves } from 'lucide-react';
import type { OceanInfo } from '../../types';
import { formatCoordinates, formatNumber } from '../../utils/format';

interface OceanDetailsProps {
  ocean: OceanInfo;
  backLabel: string;
  onBack: () => void;
  onLocate: () => void;
}

export function OceanDetails({ ocean, backLabel, onBack, onLocate }: OceanDetailsProps) {
  return (
    <div className="view-enter">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {backLabel}
      </button>

      <header className="feature-hero">
        <span className="feature-hero__glyph feature-hero__glyph--ocean" aria-hidden="true">
          <Waves size={24} strokeWidth={1.5} />
        </span>
        <p className="feature-hero__eyebrow">Ocean</p>
        <h1 className="feature-hero__title">{ocean.name}</h1>
        <p className="feature-hero__description">{ocean.description}</p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__label">
            <Ruler size={13} strokeWidth={1.8} aria-hidden="true" /> Approx. area
          </span>
          <strong className="stat-card__value stat-card__value--area">
            {formatNumber(ocean.areaApproxKm2)} km²
          </strong>
          <span className="stat-card__detail">Commonly cited figure</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">
            <Waves size={13} strokeWidth={1.8} aria-hidden="true" /> Average depth
          </span>
          <strong className="stat-card__value">{formatNumber(ocean.averageDepthM)} m</strong>
          <span className="stat-card__detail">Approximate</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section__header">
          <h2 className="detail-section__title">Oceanography</h2>
        </div>
        <div className="info-row">
          <span className="info-row__icon" aria-hidden="true">
            <Waves size={15} strokeWidth={1.8} />
          </span>
          <div className="info-row__content">
            <span className="info-row__label">Maximum depth</span>
            <span className="info-row__value">
              {formatNumber(ocean.maxDepthM)} m · {ocean.maxDepthName}
            </span>
          </div>
        </div>
        <div className="info-row">
          <span className="info-row__icon" aria-hidden="true">
            <Compass size={15} strokeWidth={1.8} />
          </span>
          <div className="info-row__content">
            <span className="info-row__label">Representative point</span>
            <span className="info-row__value">{formatCoordinates(ocean.coordinates)}</span>
          </div>
        </div>
      </div>

      <div className="notice notice--muted">
        <Waves size={15} strokeWidth={1.9} aria-hidden="true" />
        <p>{ocean.note}</p>
      </div>

      <button type="button" className="button button--primary button--full" onClick={onLocate}>
        <LocateFixed size={15} strokeWidth={1.9} aria-hidden="true" />
        Show representative point
      </button>

      <p className="feature-note">
        Ocean areas and depths are approximate and are presented for orientation, not as legal or
        hydrographic boundaries.
      </p>
    </div>
  );
}
