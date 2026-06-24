import { BRAND_LOGO_AUTH, BRAND_LOGO_BADGE, BRAND_LOGO_TEXT } from '@/brand/assets';

export interface BrandLogoProps {
  variant: 'text' | 'badge' | 'auth';
  className?: string;
  alt?: string;
}

const ASSETS = {
  text: BRAND_LOGO_TEXT,
  badge: BRAND_LOGO_BADGE,
  auth: BRAND_LOGO_AUTH,
} as const;

export function BrandLogo({ variant, className, alt = 'Split-Rail' }: BrandLogoProps) {
  const wrapperClass = ['brand-logo-wrapper', className].filter(Boolean).join(' ');
  return (
    <div className={wrapperClass}>
      <img
        src={ASSETS[variant]}
        alt={alt}
        className={`brand-logo brand-logo--${variant}`}
      />
    </div>
  );
}
