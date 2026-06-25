export type LoadingPlaceholderVariant = 'page' | 'card' | 'banner' | 'zone' | 'inline';

export interface LoadingPlaceholderProps {
  variant?: LoadingPlaceholderVariant;
  label?: string;
  className?: string;
  'data-testid'?: string;
}

function PlaceholderLines({ rows = 3 }: { rows?: number }) {
  const widths = ['long', 'medium', 'short'] as const;
  return (
    <div className="loading-placeholder__lines" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className={`loading-placeholder__line loading-placeholder__line--${widths[index % widths.length]}`}
        />
      ))}
    </div>
  );
}

export function LoadingPlaceholder({
  variant = 'inline',
  label = 'Loading',
  className,
  'data-testid': testId = 'loading-placeholder',
}: LoadingPlaceholderProps) {
  const rows = variant === 'banner' ? 1 : variant === 'zone' ? 2 : 3;

  return (
    <div
      className={['loading-placeholder', `loading-placeholder--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid={testId}
    >
      <PlaceholderLines rows={rows} />
      {variant === 'page' ? (
        <p className="loading-placeholder__label">{label}</p>
      ) : null}
    </div>
  );
}

export interface DashboardZoneLoadingProps {
  title: string;
  'data-testid'?: string;
  className?: string;
}

export function DashboardZoneLoading({
  title,
  'data-testid': testId,
  className,
}: DashboardZoneLoadingProps) {
  return (
    <section
      className={['dashboard-zone', className].filter(Boolean).join(' ')}
      data-testid={testId}
      aria-busy="true"
    >
      <div className="dashboard-zone__header">
        <h2 className="dashboard-zone__heading">{title}</h2>
      </div>
      <LoadingPlaceholder variant="zone" label={`Loading ${title.toLowerCase()}`} />
    </section>
  );
}
