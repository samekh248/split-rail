import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo } from '@/components/brand/BrandLogo';

describe('BrandLogo', () => {
  it('renders text variant with sr-text.png', () => {
    render(<BrandLogo variant="text" />);
    const img = screen.getByRole('img', { name: 'Split-Rail' });
    expect(img).toHaveAttribute('src', '/sr-text.png');
    expect(img).toHaveClass('brand-logo--text');
  });

  it('renders badge variant with sr-badge.png', () => {
    render(<BrandLogo variant="badge" />);
    const img = screen.getByRole('img', { name: 'Split-Rail' });
    expect(img).toHaveAttribute('src', '/sr-badge.png');
    expect(img).toHaveClass('brand-logo--badge');
  });

  it('renders auth variant with sr-auth-logo.png', () => {
    render(<BrandLogo variant="auth" />);
    const img = screen.getByRole('img', { name: 'Split-Rail' });
    expect(img).toHaveAttribute('src', '/sr-auth-logo.png');
    expect(img).toHaveClass('brand-logo--auth');
  });

  it('uses custom alt text when provided', () => {
    render(<BrandLogo variant="text" alt="Split Rail Logo" />);
    expect(screen.getByRole('img', { name: 'Split Rail Logo' })).toBeInTheDocument();
  });

  it('applies className to wrapper', () => {
    const { container } = render(<BrandLogo variant="text" className="custom-wrapper" />);
    expect(container.querySelector('.brand-logo-wrapper.custom-wrapper')).toBeInTheDocument();
  });
});
