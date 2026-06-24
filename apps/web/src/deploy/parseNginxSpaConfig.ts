const SPA_FALLBACK = 'try_files $uri $uri/ /index.html';
const STATIC_ROOT = 'root /usr/share/nginx/html';
const INDEX_HTML = 'index index.html';

export function assertSpaFallback(configText: string): void {
  if (!configText.includes(SPA_FALLBACK)) {
    throw new Error(`nginx config must include SPA fallback: ${SPA_FALLBACK}`);
  }
}

export function assertStaticRoot(configText: string): void {
  if (!configText.includes(STATIC_ROOT)) {
    throw new Error(`nginx config must include static root: ${STATIC_ROOT}`);
  }
  if (!configText.includes(INDEX_HTML)) {
    throw new Error(`nginx config must include ${INDEX_HTML}`);
  }
}

export function parseListenPort(configText: string): number {
  const match = configText.match(/listen\s+(\d+)/);
  if (!match) {
    throw new Error('nginx config must declare a listen port');
  }
  return Number.parseInt(match[1], 10);
}
