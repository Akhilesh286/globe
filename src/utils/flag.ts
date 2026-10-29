export function flagUrl(cca2: string | null, size: 'w80' | 'w160' | 'w320' | 'svg' = 'w80'): string | null {
  if (!cca2 || !/^[a-z]{2}$/i.test(cca2)) return null;
  const code = cca2.toLowerCase();
  return size === 'svg'
    ? `https://flagcdn.com/${code}.svg`
    : `https://flagcdn.com/${size}/${code}.png`;
}
