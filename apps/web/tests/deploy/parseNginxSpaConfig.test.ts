import { describe, expect, it } from 'vitest';
import {
  assertSpaFallback,
  assertStaticRoot,
  parseListenPort,
} from '../../src/deploy/parseNginxSpaConfig';

const validConfig = `
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
`;

describe('parseNginxSpaConfig', () => {
  it('assertSpaFallback accepts valid config', () => {
    expect(() => assertSpaFallback(validConfig)).not.toThrow();
  });

  it('assertSpaFallback rejects missing fallback', () => {
    expect(() => assertSpaFallback('location / { }')).toThrow(/SPA fallback/);
  });

  it('assertStaticRoot accepts valid config', () => {
    expect(() => assertStaticRoot(validConfig)).not.toThrow();
  });

  it('assertStaticRoot rejects missing root', () => {
    expect(() => assertStaticRoot('index index.html;')).toThrow(/static root/);
  });

  it('assertStaticRoot rejects missing index', () => {
    expect(() => assertStaticRoot('root /usr/share/nginx/html;')).toThrow(/index index.html/);
  });

  it('parseListenPort returns configured port', () => {
    expect(parseListenPort(validConfig)).toBe(8080);
  });

  it('parseListenPort rejects missing listen directive', () => {
    expect(() => parseListenPort('server { root /html; }')).toThrow(/listen port/);
  });
});
