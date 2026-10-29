const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatPopulation(value: number | null, compact = false): string {
  if (value == null) return 'Data unavailable';
  return compact ? formatCompactNumber(value) : formatNumber(value);
}

export function formatArea(value: number | null): string {
  if (value == null) return 'Data unavailable';
  return `${formatNumber(Math.round(value))} km²`;
}

export function formatAreaCompact(value: number | null): string {
  if (value == null) return 'Data unavailable';
  return `${formatCompactNumber(value)} km²`;
}

export function formatCoordinate(value: number, axis: 'lat' | 'lng'): string {
  const direction = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

export function formatCoordinates(coordinates: [number, number] | null): string {
  if (!coordinates) return 'Data unavailable';
  const [lat, lng] = coordinates;
  return `${formatCoordinate(lat, 'lat')}, ${formatCoordinate(lng, 'lng')}`;
}

export function formatList(values: string[], fallback = 'Data unavailable'): string {
  return values.length > 0 ? values.join(' · ') : fallback;
}

export function formatPopulationMeta(year: number | null): string | null {
  if (year == null) return null;
  return `World Bank · ${year}`;
}
