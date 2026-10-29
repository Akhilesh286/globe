import { useEffect, useState } from 'react';
import { flagUrl } from '../../utils/flag';

interface FlagProps {
  cca2: string | null;
  emoji?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

const FLAG_SIZES = {
  xs: 'w80',
  sm: 'w160',
  md: 'w320',
  lg: 'w320',
  hero: 'svg',
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Flag({ cca2, emoji, name, size = 'sm', className = '' }: FlagProps) {
  const [failed, setFailed] = useState(false);
  const src = flagUrl(cca2, FLAG_SIZES[size]);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={`flag flag--${size} ${className}`.trim()}>
      {src && !failed ? (
        <img
          src={src}
          alt={`Flag of ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flag__fallback" role="img" aria-label={`Flag of ${name}`}>
          {emoji || initials(name)}
        </span>
      )}
    </span>
  );
}
