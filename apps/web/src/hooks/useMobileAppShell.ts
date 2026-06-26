import { useEffect, useState } from 'react';

const MOBILE_SHELL_QUERY = '(max-width: 768px)';

function readMobileAppShell(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(MOBILE_SHELL_QUERY).matches;
}

export function useMobileAppShell(): boolean {
  const [isMobile, setIsMobile] = useState(readMobileAppShell);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia(MOBILE_SHELL_QUERY);
    const sync = () => setIsMobile(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
