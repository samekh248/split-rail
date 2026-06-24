export interface BrandLogoProps {
  variant: 'text' | 'badge' | 'auth';
  className?: string;
  alt?: string;
}

const ASSETS = {
  text: '/sr-text.png',
  badge: '/sr-badge.png',
  auth: '/sr-auth-logo.png',
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
