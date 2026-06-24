import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createShellWrapper } from '../shell/shellTestUtils';

describe('AppShell theme', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders branded vertical sidebar with logo', async () => {
    render(
      <div data-testid="page-content">Dashboard</div>,
      { wrapper: createShellWrapper() },
    );

    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-brand').querySelector('img')).toHaveAttribute(
      'src',
      '/brand/sr-text.png',
    );
    expect(screen.getByTestId('top-bar-brand')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('top-bar-org-name')).toHaveTextContent('Acme Org');
    });
  });

  it('wraps content in cream canvas app shell', () => {
    const { container } = render(
      <div data-testid="page-content">Dashboard</div>,
      { wrapper: createShellWrapper() },
    );

    expect(container.querySelector('.app-shell')).toBeInTheDocument();
  });
});
