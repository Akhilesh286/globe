import { SearchX } from 'lucide-react';

interface EmptyListProps {
  title: string;
  description?: string;
  icon?: typeof SearchX;
}

export function EmptyList({ title, description, icon: Icon = SearchX }: EmptyListProps) {
  return (
    <div className="empty-list">
      <span className="empty-list__icon" aria-hidden="true">
        <Icon size={17} strokeWidth={1.7} />
      </span>
      <div>
        <p className="empty-list__title">{title}</p>
        {description ? <p className="empty-list__description">{description}</p> : null}
      </div>
    </div>
  );
}
