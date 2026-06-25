import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DashboardZoneLoading,
  LoadingPlaceholder,
} from '@/components/shell/LoadingPlaceholder';

describe('LoadingPlaceholder', () => {
  it('renders page variant with status semantics', () => {
    render(<LoadingPlaceholder variant="page" label="Loading workspace…" />);

    const placeholder = screen.getByTestId('loading-placeholder');
    expect(placeholder).toHaveAttribute('role', 'status');
    expect(placeholder).toHaveAttribute('aria-busy', 'true');
    expect(placeholder).toHaveAttribute('aria-label', 'Loading workspace…');
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument();
  });

  it('renders card and banner variants', () => {
    render(
      <>
        <LoadingPlaceholder variant="card" data-testid="card-loading" />
        <LoadingPlaceholder variant="banner" data-testid="banner-loading" />
      </>,
    );

    expect(screen.getByTestId('card-loading')).toHaveClass('loading-placeholder--card');
    expect(screen.getByTestId('banner-loading')).toHaveClass('loading-placeholder--banner');
  });
});

describe('DashboardZoneLoading', () => {
  it('renders zone heading with skeleton body', () => {
    render(
      <DashboardZoneLoading title="Upcoming events" data-testid="dashboard-zone-upcoming-loading" />,
    );

    expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-zone-upcoming-loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('loading-placeholder')).toHaveClass('loading-placeholder--zone');
  });
});
