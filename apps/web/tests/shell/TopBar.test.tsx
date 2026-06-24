import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BRAND_LOGO_TEXT } from '@/brand/assets';
import { TopBar } from '@/components/shell/TopBar';
import { createSidebarTestWrapper } from './shellTestUtils';

describe('TopBar', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('shows centered wordmark when showMobileMenu is true', () => {
    render(<TopBar showMobileMenu />, { wrapper: createSidebarTestWrapper() });

    const brandSlot = screen.getByTestId('top-bar-brand');
    const img = brandSlot.querySelector('img');
    expect(img).toHaveAttribute('src', BRAND_LOGO_TEXT);
    expect(img).toHaveClass('brand-logo--text');
  });

  it('hides brand slot when showMobileMenu is false', () => {
    render(<TopBar showMobileMenu={false} />, { wrapper: createSidebarTestWrapper() });

    expect(screen.queryByTestId('top-bar-brand')).not.toBeInTheDocument();
  });
});
