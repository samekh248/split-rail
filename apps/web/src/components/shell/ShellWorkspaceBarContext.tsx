import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

interface ShellWorkspaceBarContextValue {
  setWorkspaceBarContent: (content: ReactNode) => void;
}

export const ShellWorkspaceBarContext = createContext<ShellWorkspaceBarContextValue | null>(null);

export function useShellWorkspaceBar(content: ReactNode) {
  const context = useContext(ShellWorkspaceBarContext);

  useEffect(() => {
    if (!context) {
      return;
    }
    context.setWorkspaceBarContent(content);
    return () => context.setWorkspaceBarContent(null);
  }, [context, content]);
}

export function useShellWorkspaceBarContextValue(
  setWorkspaceBarContent: (content: ReactNode) => void,
) {
  return useMemo(() => ({ setWorkspaceBarContent }), [setWorkspaceBarContent]);
}
