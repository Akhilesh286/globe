import type { LucideIcon } from 'lucide-react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

export function Toggle({ checked, onChange, label, description, icon: Icon }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="layer-toggle"
      onClick={() => onChange(!checked)}
    >
      <span className="layer-toggle__identity">
        {Icon ? (
          <span className="layer-toggle__icon" aria-hidden="true">
            <Icon size={16} strokeWidth={1.8} />
          </span>
        ) : null}
        <span className="layer-toggle__copy">
          <span className="layer-toggle__label">{label}</span>
          {description ? <span className="layer-toggle__description">{description}</span> : null}
        </span>
      </span>
      <span className={`switch ${checked ? 'switch--on' : ''}`} aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  );
}
