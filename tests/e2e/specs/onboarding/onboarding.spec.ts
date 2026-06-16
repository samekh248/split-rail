import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';
const WEB_BASE_URL = process.env.WEB_BASE_URL;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerAndLogin(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const register = await request.post('/api/auth/register', {
    data: { email, password },
  });
  expect(register.status()).toBe(201);

  const login = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  return (await login.json()) as { accessToken: string; refreshToken: string };
}

async function completeOnboarding(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
  orgName: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { accessToken, refreshToken } = await registerAndLogin(request, email, password);

  const createOrg = await request.post('/api/organizations', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name: orgName },
  });
  expect(createOrg.status()).toBe(201);

  const refresh = await request.post('/api/auth/refresh', {
    data: { refreshToken },
  });
  expect(refresh.ok()).toBeTruthy();
  return (await refresh.json()) as { accessToken: string; refreshToken: string };
}

test.describe('Onboarding flow (API)', () => {
  test('new user registers, creates organization, and becomes Admin with empty venues', async ({
    request,
  }) => {
    const email = uniqueEmail('onboard');
    const password = 'Password1';
    const orgName = 'Test Org';

    const { accessToken } = await completeOnboarding(request, email, password, orgName);

    const profile = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(profile.ok()).toBeTruthy();
    const profileBody = (await profile.json()) as {
      organization?: { name?: string | null } | null;
      role?: { roleName?: string | null } | null;
    };
    expect(profileBody.organization?.name).toBe(orgName);
    expect(profileBody.role?.roleName).toBe('Admin');

    const venues = await request.get('/api/venues', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(venues.ok()).toBeTruthy();
    expect(await venues.json()).toEqual([]);
  });

  test('duplicate email returns 409', async ({ request }) => {
    const email = uniqueEmail('duplicate');
    const password = 'Password1';

    const first = await request.post('/api/auth/register', {
      data: { email, password },
    });
    expect(first.status()).toBe(201);

    const second = await request.post('/api/auth/register', {
      data: { email, password },
    });
    expect(second.status()).toBe(409);
  });

  test('returning user login loads existing organization profile', async ({ request }) => {
    const email = uniqueEmail('returning');
    const password = 'Password1';
    const orgName = 'Returning Org';

    await completeOnboarding(request, email, password, orgName);

    const login = await request.post('/api/auth/login', {
      data: { email, password },
    });
    expect(login.ok()).toBeTruthy();
    const { accessToken } = (await login.json()) as { accessToken: string };

    const profile = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(profile.ok()).toBeTruthy();
    const profileBody = (await profile.json()) as {
      organization?: { name?: string | null } | null;
      role?: { roleName?: string | null } | null;
    };
    expect(profileBody.organization?.name).toBe(orgName);
    expect(profileBody.role?.roleName).toBe('Admin');
  });

  test('org-less account can create organization after login', async ({ request }) => {
    const email = uniqueEmail('orgless');
    const password = 'Password1';
    const orgName = 'Recovery Org';

    const { accessToken, refreshToken } = await registerAndLogin(request, email, password);

    const createOrg = await request.post('/api/organizations', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: orgName },
    });
    expect(createOrg.status()).toBe(201);

    const refresh = await request.post('/api/auth/refresh', {
      data: { refreshToken },
    });
    expect(refresh.ok()).toBeTruthy();
    const refreshed = (await refresh.json()) as { accessToken: string };

    const profileAfter = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${refreshed.accessToken}` },
    });
    expect(profileAfter.ok()).toBeTruthy();
    const after = (await profileAfter.json()) as {
      organization?: { name?: string | null } | null;
      role?: { roleName?: string | null } | null;
    };
    expect(after.organization?.name).toBe(orgName);
    expect(after.role?.roleName).toBe('Admin');
  });

  test('refresh token restores authenticated access', async ({ request }) => {
    const email = uniqueEmail('refresh');
    const password = 'Password1';
    const orgName = 'Refresh Org';

    const { refreshToken } = await completeOnboarding(request, email, password, orgName);

    const refresh = await request.post('/api/auth/refresh', {
      data: { refreshToken },
    });
    expect(refresh.ok()).toBeTruthy();
    const { accessToken } = (await refresh.json()) as { accessToken: string };

    const profile = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(profile.ok()).toBeTruthy();
    const profileBody = (await profile.json()) as {
      organization?: { name?: string | null } | null;
    };
    expect(profileBody.organization?.name).toBe(orgName);
  });
});

test.describe('Onboarding flow (UI)', () => {
  test.skip(!WEB_BASE_URL, 'WEB_BASE_URL required for UI onboarding scenarios');

  test('authenticated bootstrap lands in empty dashboard', async ({ page, request }) => {
    const email = uniqueEmail('ui-bootstrap');
    const password = 'Password1';
    const orgName = 'UI Bootstrap Org';

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
    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();
  });
});
