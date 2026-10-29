import { useCallback, useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import type { GlobeInstance } from 'globe.gl';
import * as THREE from 'three';
import { AlertTriangle, LoaderCircle, Minus, Plus, RotateCcw } from 'lucide-react';
import type {
  AtlasData,
  CapitalEntry,
  ContinentName,
  Country,
  CountryFeature,
  GlobeFocusRequest,
  LayerSettings,
} from '../../types';
import { escapeHtml } from '../../utils/text';

interface GlobeViewProps {
  data: AtlasData;
  layers: LayerSettings;
  selectedCode: string | null;
  focus: GlobeFocusRequest | null;
  onSelectCountry: (country: Country) => void;
}

interface GlobePoint {
  id: string;
  kind: 'capital' | 'focus';
  lat: number;
  lng: number;
  label: string;
  detail: string;
}

const CONTINENT_COLORS: Record<ContinentName, string> = {
  Africa: '#8E6350',
  Antarctica: '#687C91',
  Asia: '#9B7B4E',
  Europe: '#4F7FA7',
  'North America': '#4C837C',
  'South America': '#75648F',
  Oceania: '#98647A',
};

const INITIAL_POV = { lat: 18, lng: 6, altitude: 2.45 };
const MIN_ALTITUDE = 0.35;
const MAX_ALTITUDE = 3.8;

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function categoryLabel(feature: CountryFeature): string {
  const category = feature.country.category;
  if (category === 'territory') return 'Territory';
  if (category === 'disputed') return 'Disputed / special';
  return 'Sovereign state';
}

function featureColor(
  feature: CountryFeature,
  selectedCode: string | null,
  hovered: CountryFeature | null,
  highlightSelected: boolean,
): string {
  const { country } = feature;
  if (highlightSelected && selectedCode === country.cca3) return '#6BB5FF';
  if (hovered && hovered.country.cca3 === country.cca3) return '#A8D4FF';

  const base = CONTINENT_COLORS[country.continent] ?? '#54718D';
  if (country.category !== 'country') return hexToRgba(base, 0.58);
  return base;
}

function featureTooltip(feature: CountryFeature): string {
  const country = feature.country;
  const capital = country.capitalNames[0];
  const detail = [country.continent, capital ? `Capital: ${capital}` : null]
    .filter(Boolean)
    .join(' · ');
  const geometryNote = country.hasGeometry
    ? ''
    : '<span class="globe-tooltip__note">No separate polygon at 1:110m</span>';

  return [
    '<div class="globe-tooltip">',
    `<span class="globe-tooltip__eyebrow">${escapeHtml(categoryLabel(feature))}</span>`,
    `<strong class="globe-tooltip__title">${escapeHtml(country.commonName)}</strong>`,
    `<span class="globe-tooltip__meta">${escapeHtml(detail)}</span>`,
    geometryNote,
    '<span class="globe-tooltip__hint">Click to explore</span>',
    '</div>',
  ].join('');
}

function pointTooltip(point: GlobePoint): string {
  return [
    '<div class="globe-tooltip">',
    `<span class="globe-tooltip__eyebrow">${point.kind === 'focus' ? 'Selected location' : 'Capital city'}</span>`,
    `<strong class="globe-tooltip__title">${escapeHtml(point.label)}</strong>`,
    `<span class="globe-tooltip__meta">${escapeHtml(point.detail)}</span>`,
    '</div>',
  ].join('');
}

function maxLabelRank(altitude: number): number {
  if (altitude > 2.05) return 2;
  if (altitude > 1.5) return 3;
  if (altitude > 1.0) return 4;
  return 6;
}

export function GlobeView({
  data,
  layers,
  selectedCode,
  focus,
  onSelectCountry,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const hoveredRef = useRef<CountryFeature | null>(null);
  const altitudeRef = useRef(INITIAL_POV.altitude);
  const selectedRef = useRef(selectedCode);
  const layersRef = useRef(layers);
  const dataRef = useRef(data);
  const focusRef = useRef(focus);
  const lastLabelKeyRef = useRef<string>('');
  const onSelectCountryRef = useRef(onSelectCountry);
  const reducedMotionRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [globeError, setGlobeError] = useState<string | null>(null);

  selectedRef.current = selectedCode;
  layersRef.current = layers;
  dataRef.current = data;
  focusRef.current = focus;
  onSelectCountryRef.current = onSelectCountry;

  const capColorAccessor = useCallback((item: object) => {
    return featureColor(
      item as CountryFeature,
      selectedRef.current,
      hoveredRef.current,
      layersRef.current.highlightSelected,
    );
  }, []);

  const altitudeAccessor = useCallback((item: object) => {
    const feature = item as CountryFeature;
    const isSelected =
      layersRef.current.highlightSelected && selectedRef.current === feature.country.cca3;
    const isHovered = hoveredRef.current?.country.cca3 === feature.country.cca3;
    if (isSelected) return 0.018;
    if (isHovered) return 0.012;
    return 0.006;
  }, []);

  const strokeColorAccessor = useCallback((item: object) => {
    const feature = item as CountryFeature;
    if (
      layersRef.current.highlightSelected &&
      selectedRef.current === feature.country.cca3
    ) {
      return '#C7E4FF';
    }
    return '#31506E';
  }, []);

  const refreshLabels = useCallback((force = false) => {
    const globe = globeRef.current;
    if (!globe) return;

    if (!layersRef.current.labels) {
      if (lastLabelKeyRef.current !== 'off') {
        lastLabelKeyRef.current = 'off';
        globe.labelsData([]);
      }
      return;
    }

    const rank = maxLabelRank(altitudeRef.current);
    const key = `${rank}:${selectedRef.current ?? ''}`;
    if (!force && key === lastLabelKeyRef.current) return;
    lastLabelKeyRef.current = key;

    const features = dataRef.current.features.filter(
      (feature) =>
        feature.properties.labelRank <= rank ||
        feature.country.cca3 === selectedRef.current,
    );
    globe.labelsData(features);
  }, []);

  const refreshMarkers = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const points: GlobePoint[] = [];
    if (layersRef.current.capitals) {
      dataRef.current.capitals.forEach((capital: CapitalEntry) => {
        if (capital.lat == null || capital.lng == null) return;
        points.push({
          id: capital.id,
          kind: 'capital',
          lat: capital.lat,
          lng: capital.lng,
          label: capital.name,
          detail: `Capital of ${capital.countryName}`,
        });
      });
    }

    const activeFocus = focusRef.current;
    if (activeFocus) {
      points.push({
        id: `focus-${activeFocus.key}`,
        kind: 'focus',
        lat: activeFocus.lat,
        lng: activeFocus.lng,
        label: activeFocus.label ?? 'Selected location',
        detail: activeFocus.subtitle ?? 'Focused location',
      });
    }

    globe.pointsData(points);
    globe.ringsData(activeFocus && !reducedMotionRef.current ? [activeFocus] : []);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let globe: GlobeInstance;
    try {
      globe = new Globe(container, {
        rendererConfig: { antialias: true, alpha: true },
      });
    } catch {
      setGlobeError(
        'The 3D globe could not start. Your browser or graphics driver may not support WebGL.',
      );
      return;
    }

    globeRef.current = globe;

    const globeMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#0A1B30'),
      emissive: new THREE.Color('#040B15'),
      shininess: 4,
      specular: new THREE.Color('#0E2946'),
    });

    globe
      .backgroundColor('#080D18')
      .globeMaterial(globeMaterial)
      .showAtmosphere(true)
      .atmosphereColor('#4D8ED8')
      .atmosphereAltitude(0.18)
      .showPointerCursor(true)
      .polygonsData(dataRef.current.features)
      .polygonGeoJsonGeometry(
        (item) =>
          (item as CountryFeature).geometry as unknown as {
            type: string;
            coordinates: number[];
          },
      )
      .polygonCapColor(capColorAccessor)
      .polygonSideColor('rgba(5, 12, 23, 0.9)')
      .polygonStrokeColor(strokeColorAccessor)
      .polygonAltitude(altitudeAccessor)
      .polygonCapCurvatureResolution(3)
      .polygonsTransitionDuration(240)
      .polygonLabel((item) => featureTooltip(item as CountryFeature))
      .onPolygonHover((item) => {
        hoveredRef.current = item as CountryFeature | null;
        globe.polygonCapColor(capColorAccessor);
      })
      .onPolygonClick((item) => {
        const feature = item as CountryFeature;
        onSelectCountryRef.current(feature.country);
      })
      .labelsData([])
      .labelLat((item) => (item as CountryFeature).properties.labelLat)
      .labelLng((item) => (item as CountryFeature).properties.labelLng)
      .labelText((item) => (item as CountryFeature).country.commonName)
      .labelColor((item) => {
        const feature = item as CountryFeature;
        if (selectedRef.current === feature.country.cca3) return '#D9EDFF';
        return feature.country.category === 'country' ? '#DCE8F6' : '#9DB2C8';
      })
      .labelAltitude(0.012)
      .labelSize((item) => {
        const feature = item as CountryFeature;
        return selectedRef.current === feature.country.cca3 ? 0.72 : 0.52;
      })
      .labelIncludeDot(false)
      .labelDotRadius(0)
      .labelResolution(2)
      .labelsTransitionDuration(0)
      .onLabelClick((item) => {
        const feature = item as CountryFeature;
        onSelectCountryRef.current(feature.country);
      })
      .pointsData([])
      .pointLat((item) => (item as GlobePoint).lat)
      .pointLng((item) => (item as GlobePoint).lng)
      .pointColor((item) => ((item as GlobePoint).kind === 'focus' ? '#65AFFF' : '#E8C37A'))
      .pointAltitude((item) => ((item as GlobePoint).kind === 'focus' ? 0.015 : 0.008))
      .pointRadius((item) => ((item as GlobePoint).kind === 'focus' ? 0.5 : 0.2))
      .pointResolution(10)
      .pointLabel((item) => pointTooltip(item as GlobePoint))
      .pointsTransitionDuration(250)
      .ringsData([])
      .ringLat((item) => (item as GlobeFocusRequest).lat)
      .ringLng((item) => (item as GlobeFocusRequest).lng)
      .ringColor(() => ['rgba(101, 175, 255, 0.62)', 'rgba(101, 175, 255, 0)'])
      .ringAltitude(0.012)
      .ringMaxRadius(3.8)
      .ringPropagationSpeed(1.9)
      .ringRepeatPeriod(1400)
      .pointOfView(INITIAL_POV, 0)
      .onZoom((pov) => {
        altitudeRef.current = pov.altitude;
        refreshLabels();
      })
      .onGlobeReady(() => setReady(true));

    const controls = globe.controls();
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 125;
    controls.maxDistance = 520;
    controls.autoRotateSpeed = 0.45;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width > 0 && height > 0) {
        globe.width(width).height(height);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const readyTimer = window.setTimeout(() => setReady(true), 2500);

    return () => {
      window.clearTimeout(readyTimer);
      observer.disconnect();
      globe._destructor();
      container.replaceChildren();
      globeRef.current = null;
    };
  }, [altitudeAccessor, capColorAccessor, refreshLabels, strokeColorAccessor]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.polygonsData(data.features);
    refreshLabels(true);
    refreshMarkers();
  }, [data, refreshLabels, refreshMarkers]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.polygonCapColor(capColorAccessor);
    globe.polygonAltitude(altitudeAccessor);
    globe.polygonStrokeColor(layers.borders ? strokeColorAccessor : () => null);
    globe.showAtmosphere(layers.atmosphere);
    globe.controls().autoRotate = layers.autoRotate;
    refreshLabels(true);
    refreshMarkers();
  }, [
    altitudeAccessor,
    capColorAccessor,
    layers,
    refreshLabels,
    refreshMarkers,
    selectedCode,
    strokeColorAccessor,
  ]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !focus) return;

    altitudeRef.current = focus.altitude;
    globe.pointOfView(
      { lat: focus.lat, lng: focus.lng, altitude: focus.altitude },
      950,
    );
    refreshMarkers();
    refreshLabels(true);
  }, [focus, refreshLabels, refreshMarkers]);

  const zoom = (factor: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    const altitude = Math.min(
      MAX_ALTITUDE,
      Math.max(MIN_ALTITUDE, pov.altitude * factor),
    );
    globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude }, 320);
  };

  const resetCamera = () => {
    globeRef.current?.pointOfView(INITIAL_POV, 900);
  };

  return (
    <div
      className="globe-stage"
      data-globe-ready={ready ? 'true' : 'false'}
      aria-busy={!ready && !globeError}
    >
      <div
        className="globe-stage__canvas"
        ref={containerRef}
        role="img"
        aria-label="Interactive 3D political globe. Use the sidebar or search to explore countries. Drag to rotate and scroll to zoom."
      />

      <div className="globe-stage__shade" aria-hidden="true" />

      {!ready && !globeError ? (
        <div className="stage-loading" role="status">
          <LoaderCircle className="stage-loading__spinner" size={22} aria-hidden="true" />
          <span>Rendering the globe…</span>
        </div>
      ) : null}

      {globeError ? (
        <div className="stage-error" role="alert">
          <span className="stage-error__icon" aria-hidden="true">
            <AlertTriangle size={20} strokeWidth={1.9} />
          </span>
          <div>
            <h2>3D view unavailable</h2>
            <p>{globeError}</p>
          </div>
        </div>
      ) : null}

      {ready && !globeError ? (
        <div className="zoom-controls" aria-label="Globe zoom and view controls">
          <button
            type="button"
            className="zoom-button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => zoom(0.78)}
          >
            <Plus size={17} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="zoom-button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoom(1.28)}
          >
            <Minus size={17} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="zoom-button"
            aria-label="Reset globe view"
            title="Reset globe view"
            onClick={resetCamera}
          >
            <RotateCcw size={16} strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
