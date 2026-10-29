import { useEffect, useRef, useState } from 'react';
import {
  Layers3,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  RotateCw,
  Sparkles,
  Sun,
  Tag,
  X,
} from 'lucide-react';
import type { LayerSettings } from '../../types';
import { Toggle } from '../ui/Toggle';

interface LayerControlsProps {
  settings: LayerSettings;
  onChange: (key: keyof LayerSettings, value: boolean) => void;
  onReset: () => void;
}

export function LayerControls({ settings, onChange, onReset }: LayerControlsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="layer-controls" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`stage-tool ${open ? 'stage-tool--active' : ''}`}
        aria-expanded={open}
        aria-controls="layer-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Layers3 size={16} strokeWidth={1.9} aria-hidden="true" />
        <span>Layers</span>
        <span className="stage-tool__dot" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="layer-panel"
          id="layer-panel"
          role="dialog"
          aria-label="Map layers"
        >
          <header className="layer-panel__header">
            <div>
              <p className="layer-panel__eyebrow">Map display</p>
              <h2 className="layer-panel__title">Layers</h2>
            </div>
            <button
              type="button"
              className="icon-button layer-panel__close"
              aria-label="Close layer controls"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <X size={17} strokeWidth={2} />
            </button>
          </header>

          <div className="layer-panel__body">
            <Toggle
              checked={settings.borders}
              onChange={(value) => onChange('borders', value)}
              label="Country borders"
              description="Political outlines at 1:110m"
              icon={MapIcon}
            />
            <Toggle
              checked={settings.labels}
              onChange={(value) => onChange('labels', value)}
              label="Country labels"
              description="More labels appear as you zoom in"
              icon={Tag}
            />
            <Toggle
              checked={settings.capitals}
              onChange={(value) => onChange('capitals', value)}
              label="Capital markers"
              description="Capitals with known coordinates"
              icon={MapPin}
            />
            <Toggle
              checked={settings.highlightSelected}
              onChange={(value) => onChange('highlightSelected', value)}
              label="Selected highlight"
              description="Accent colour and raised outline"
              icon={Sparkles}
            />
            <Toggle
              checked={settings.autoRotate}
              onChange={(value) => onChange('autoRotate', value)}
              label="Auto-rotation"
              description="Slowly spin the globe"
              icon={RotateCw}
            />
            <Toggle
              checked={settings.atmosphere}
              onChange={(value) => onChange('atmosphere', value)}
              label="Atmosphere"
              description="Soft atmospheric glow"
              icon={Sun}
            />
          </div>

          <footer className="layer-panel__footer">
            <button type="button" className="layer-panel__reset" onClick={onReset}>
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
              Reset layers
            </button>
            <span className="layer-panel__note">Saved on this device</span>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
