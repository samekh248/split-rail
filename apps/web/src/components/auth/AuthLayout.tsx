import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <div className="auth-layout__card">
        <h1 className="auth-layout__title">{title}</h1>
        {subtitle ? <p className="auth-layout__subtitle">{subtitle}</p> : null}
        {children}
        {footer ? <div className="auth-layout__footer">{footer}</div> : null}
      </div>
    </main>
  );
}
