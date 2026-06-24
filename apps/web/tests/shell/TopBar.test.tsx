import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BRAND_LOGO_TEXT } from '@/brand/assets';
import { TopBar } from '@/components/shell/TopBar';
import { createSidebarTestWrapper } from './shellTestUtils';

describe('TopBar', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('shows wordmark in leading slot when showMobileMenu is true', () => {
    render(<TopBar showMobileMenu />, { wrapper: createSidebarTestWrapper() });

    const leading = document.querySelector('.top-bar__leading');
    const brandSlot = screen.getByTestId('top-bar-brand');
    expect(leading).toContainElement(brandSlot);
    const img = brandSlot.querySelector('img');
    expect(img).toHaveAttribute('src', BRAND_LOGO_TEXT);
    expect(img).toHaveClass('brand-logo--text');
  });

  it('places organization name in trailing slot on mobile', () => {
    render(<TopBar showMobileMenu />, { wrapper: createSidebarTestWrapper() });

    const trailing = screen.getByTestId('top-bar-trailing');
    expect(trailing).toContainElement(screen.getByTestId('top-bar-org-name'));
    expect(document.querySelector('.top-bar__leading')).not.toContainElement(
      screen.getByTestId('top-bar-org-name'),
    );
  });

  it('hides brand slot when showMobileMenu is false', () => {
    render(<TopBar showMobileMenu={false} />, { wrapper: createSidebarTestWrapper() });

    expect(screen.queryByTestId('top-bar-brand')).not.toBeInTheDocument();
  });

  it('renders Font Awesome bars icon for the mobile menu button', () => {
    render(<TopBar showMobileMenu />, { wrapper: createSidebarTestWrapper() });

    const menuButton = screen.getByTestId('mobile-nav-open');
    expect(menuButton.querySelector('svg[data-icon="bars"]')).toBeInTheDocument();
  });
});
