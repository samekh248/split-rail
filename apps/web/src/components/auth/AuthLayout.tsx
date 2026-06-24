import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, showLogo, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__card">
        {showLogo ? (
          <BrandLogo variant="auth" className="auth-layout__logo" alt="Split Rail" />
        ) : null}
        <h1 className="auth-layout__title">{title}</h1>
        {subtitle ? <p className="auth-layout__subtitle">{subtitle}</p> : null}
        {children}
        {footer ? <div className="auth-layout__footer">{footer}</div> : null}
      </div>
    </main>
  );
}
