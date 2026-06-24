import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';

export interface BottleneckFilterProps {
  active: boolean;
  onToggle: () => void;
  alertedCount?: number;
}

export function BottleneckFilter({ active, onToggle, alertedCount = 0 }: BottleneckFilterProps) {
  const countSuffix = alertedCount > 0 ? ` (${alertedCount})` : '';

  return (
    <button
      type="button"
      className={['bottleneck-filter', active ? 'bottleneck-filter--active' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid="bottleneck-filter-toggle"
      aria-pressed={active}
      onClick={onToggle}
    >
      <FontAwesomeIcon icon={faFilter} className="bottleneck-filter__icon" aria-hidden />
      Needs attention{countSuffix}
    </button>
  );
}
