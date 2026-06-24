import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

const canonicalPolicy =
  "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';";

test.describe('Content-Security-Policy response headers', () => {
  test('API swagger response includes canonical CSP header', async () => {
    const response = await fetch(`${API_BASE}/swagger/index.html`);
    expect(response.ok).toBeTruthy();

    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toBe(canonicalPolicy);
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  test('unauthenticated API response includes canonical CSP header', async () => {
    const response = await fetch(`${API_BASE}/api/organizations`);
    expect(response.status).toBe(401);

    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toBe(canonicalPolicy);
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  test('proxied API response includes CSP header', async ({ request }) => {
    const response = await request.get('/api/organizations');
    expect(response.status()).toBe(401);

    const csp = response.headers()['content-security-policy'];
    expect(csp).toBe(canonicalPolicy);
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });
});
