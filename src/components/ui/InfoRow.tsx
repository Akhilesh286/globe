import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EntityCategory } from '../../types';

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  title?: string;
  tone?: 'default' | 'muted';
}

export function InfoRow({ icon: Icon, label, children, title, tone = 'default' }: InfoRowProps) {
  return (
    <div className={`info-row info-row--${tone}`}>
      <span className="info-row__icon" aria-hidden="true">
        <Icon size={15} strokeWidth={1.8} />
      </span>
      <div className="info-row__content">
        <span className="info-row__label">{label}</span>
        <span className="info-row__value" title={title}>
          {children}
        </span>
      </div>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}

export function DetailSection({ title, icon: Icon, children, action }: DetailSectionProps) {
  return (
    <section className="detail-section">
      <div className="detail-section__header">
        <h2 className="detail-section__title">
          {Icon ? <Icon size={14} strokeWidth={2} aria-hidden="true" /> : null}
          {title}
        </h2>
        {action}
      </div>
      <div className="detail-section__body">{children}</div>
    </section>
  );
}

const CATEGORY_LABELS: Record<EntityCategory, string> = {
  country: 'Sovereign state',
  territory: 'Territory',
  disputed: 'Disputed / special status',
};

export function CategoryBadge({
  category,
  compact = false,
}: {
  category: EntityCategory;
  compact?: boolean;
}) {
  return (
    <span className={`category-badge category-badge--${category}`}>
      <span className="category-badge__dot" aria-hidden="true" />
      {compact && category === 'country' ? 'State' : CATEGORY_LABELS[category]}
    </span>
  );
}

export function categoryLabel(category: EntityCategory): string {
  return CATEGORY_LABELS[category];
}
