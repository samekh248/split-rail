import { expect, test } from '@playwright/test';

const profileWithOrg = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'newuser@example.com',
  organization: { id: '00000000-0000-0000-0000-000000000010', name: 'Test Org' },
  role: { roleName: 'Admin', permissions: {} },
  venueScopes: [],
};

const profileWithoutOrg = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'orgless@example.com',
  organization: null,
  role: null,
  venueScopes: [],
};

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

test.describe('Onboarding flow', () => {
  test('new user registers, lands in empty dashboard with welcome modal', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith('/api/auth/register') && method === 'POST') {
        return route.fulfill(jsonResponse({ id: 'u1', email: 'newuser@example.com', createdAt: '2026-01-01T00:00:00Z' }, 201));
      }
      if (url.endsWith('/api/auth/login') && method === 'POST') {
        return route.fulfill(jsonResponse({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 }));
      }
      if (url.endsWith('/api/organizations') && method === 'POST') {
        return route.fulfill(jsonResponse({ id: 'org-1', name: 'Test Org', createdAt: '2026-01-01T00:00:00Z' }, 201));
      }
      if (url.endsWith('/api/auth/refresh') && method === 'POST') {
        return route.fulfill(jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 3600 }));
      }
      if (url.endsWith('/api/users/me') && method === 'GET') {
        return route.fulfill(jsonResponse(profileWithOrg));
      }
      if (url.endsWith('/api/venues') && method === 'GET') {
        return route.fulfill(jsonResponse([]));
      }
      return route.continue();
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('Password1');
    await page.getByLabel('Organization name').fill('Test Org');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Test Org')).toBeVisible();

    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('returning user login skips welcome modal', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith('/api/auth/login') && method === 'POST') {
        return route.fulfill(jsonResponse({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 }));
      }
      if (url.endsWith('/api/users/me') && method === 'GET') {
        return route.fulfill(jsonResponse(profileWithOrg));
      }
      if (url.endsWith('/api/venues') && method === 'GET') {
        return route.fulfill(jsonResponse([]));
      }
      return route.continue();
    });

    await page.goto('/');
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('Password1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('org-less login routes to organization creation step', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith('/api/auth/login') && method === 'POST') {
        return route.fulfill(jsonResponse({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 }));
      }
      if (url.endsWith('/api/users/me') && method === 'GET') {
        return route.fulfill(jsonResponse(profileWithoutOrg));
      }
      return route.continue();
    });

    await page.goto('/');
    await page.getByLabel('Email').fill('orgless@example.com');
    await page.getByLabel('Password').fill('Password1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Set up your organization' })).toBeVisible();
  });

  test('session persists across reload with bootstrap', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'stored-access');
      localStorage.setItem('refreshToken', 'stored-refresh');
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.endsWith('/api/users/me')) {
        return route.fulfill(jsonResponse(profileWithOrg));
      }
      if (url.endsWith('/api/venues')) {
        return route.fulfill(jsonResponse([]));
      }
      return route.continue();
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'No venues yet' })).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
