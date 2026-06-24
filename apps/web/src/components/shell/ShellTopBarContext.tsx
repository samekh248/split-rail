import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

interface ShellTopBarContextValue {
  setTopBarContent: (content: ReactNode) => void;
}

export const ShellTopBarContext = createContext<ShellTopBarContextValue | null>(null);

export function useShellTopBar(content: ReactNode) {
  const context = useContext(ShellTopBarContext);

  useEffect(() => {
    if (!context) {
      return;
    }
    context.setTopBarContent(content);
    return () => context.setTopBarContent(null);
  }, [context, content]);
}

export function useShellTopBarContextValue(setTopBarContent: (content: ReactNode) => void) {
  return useMemo(() => ({ setTopBarContent }), [setTopBarContent]);
}
