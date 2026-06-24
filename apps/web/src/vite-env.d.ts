/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_E2E_HOOKS?: string;
}

interface Window {
  __splitRail?: {
    apiFetch: (path: string, init?: import('@/api/client').ApiFetchInit) => Promise<unknown>;
  };
}
