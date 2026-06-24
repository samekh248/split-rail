import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? process.env.PREVIEW_BASE_URL;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function completeOnboarding(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
  orgName: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const register = await request.post('/api/auth/register', {
    data: { email, password },
  });
  expect(register.status()).toBe(201);

  const login = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  const tokens = (await login.json()) as { accessToken: string; refreshToken: string };

  const createOrg = await request.post('/api/organizations', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    data: { name: orgName },
  });
  expect(createOrg.status()).toBe(201);

  const refresh = await request.post('/api/auth/refresh', {
    data: { refreshToken: tokens.refreshToken },
  });
  expect(refresh.ok()).toBeTruthy();
  return (await refresh.json()) as { accessToken: string; refreshToken: string };
}

test.describe('Session refresh (UI)', () => {
  test.skip(!WEB_BASE_URL, 'WEB_BASE_URL or PREVIEW_BASE_URL required for UI session refresh scenarios');

  test('transparently refreshes expired access token and continues session', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('session-refresh');
    const password = 'Password1';
    const orgName = 'Refresh UI Org';

    const { accessToken, refreshToken } = await completeOnboarding(
      request,
      email,
      password,
      orgName,
    );

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    let venuesCallCount = 0;
    await page.route('**/api/venues', async (route) => {
      venuesCallCount += 1;
      if (venuesCallCount === 1) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    let refreshObserved = false;
    await page.route('**/api/auth/refresh', async (route) => {
      refreshObserved = true;
      await route.continue();
    });

    await page.goto(`${WEB_BASE_URL}/`);
    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();
    expect(refreshObserved).toBe(true);
    expect(venuesCallCount).toBeGreaterThanOrEqual(2);
  });

  test('concurrent 401s trigger exactly one refresh', async ({ page, request }) => {
    const email = uniqueEmail('session-burst');
    const password = 'Password1';
    const orgName = 'Burst Org';

    const { accessToken, refreshToken } = await completeOnboarding(
      request,
      email,
      password,
      orgName,
    );

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    await page.goto(`${WEB_BASE_URL}/`);
    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible({
      timeout: 15_000,
    });

    let protectedCallCount = 0;
    await page.route('**/api/users/me', async (route) => {
      protectedCallCount += 1;
      if (protectedCallCount <= 3) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    let refreshCount = 0;
    await page.route('**/api/auth/refresh', async (route) => {
      refreshCount += 1;
      await route.continue();
    });

    await page.waitForFunction(() => window.__splitRail?.apiFetch != null);

    await Promise.all([
      page.evaluate(() => window.__splitRail!.apiFetch('/users/me')),
      page.evaluate(() => window.__splitRail!.apiFetch('/users/me')),
      page.evaluate(() => window.__splitRail!.apiFetch('/users/me')),
    ]);

    await expect.poll(() => refreshCount, { timeout: 10_000 }).toBe(1);
  });

  test('unrecoverable session shows login with session-expired notice', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('session-expired');
    const password = 'Password1';
    const orgName = 'Expired Org';

    const { accessToken, refreshToken } = await completeOnboarding(
      request,
      email,
      password,
      orgName,
    );

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
      },
      { access: accessToken, refresh: refreshToken },
    );

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/users/me') && route.request().method() === 'GET') {
        await route.continue();
        return;
      }
      if (url.includes('/auth/refresh')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid refresh token' }),
        });
        return;
      }
      if (!url.includes('/auth/logout')) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    });

    await page.goto(`${WEB_BASE_URL}/`);

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(
      'Your session expired — please sign in again.',
    );
  });
});

test.describe('Session refresh (API)', () => {
  test('refresh endpoint remains reachable at API base', async ({ request }) => {
    const email = uniqueEmail('api-refresh');
    const password = 'Password1';
    const { refreshToken } = await completeOnboarding(request, email, password, 'API Org');

    const refresh = await request.post(`${API_BASE}/api/auth/refresh`, {
      data: { refreshToken },
    });
    expect(refresh.ok()).toBeTruthy();
  });
});
