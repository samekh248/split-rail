import { test, expect, type Page } from '@playwright/test';
import { resetSeed } from '../../fixtures/seed';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';
const WEB_BASE_URL = process.env.WEB_BASE_URL ?? process.env.PREVIEW_BASE_URL;

async function login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(response.ok).toBeTruthy();
  return (await response.json()) as { accessToken: string; refreshToken: string };
}

async function bootstrapDashboard(
  page: Page,
  tokens: { accessToken: string; refreshToken: string },
): Promise<void> {
  await page.addInitScript(
    ({ access, refresh }) => {
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
    },
    { access: tokens.accessToken, refresh: tokens.refreshToken },
  );

  await page.goto(`${WEB_BASE_URL}/`);
  await expect(page.getByTestId('venue-switcher')).toBeVisible({ timeout: 15_000 });
}

test.describe('Event selection (UI)', () => {
  test.skip(!WEB_BASE_URL, 'WEB_BASE_URL or PREVIEW_BASE_URL required for event selection UI scenarios');

  test('admin can create first event and see ledger workspace (E1)', async ({ page }) => {
    await resetSeed();
    const tokens = await login('alpha-admin@e2e.test', 'E2eTestPass1');
    await bootstrapDashboard(page, tokens);

    await expect(page.getByRole('heading', { name: 'No events yet' })).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('empty-state-create-event').click();
    await page.getByLabel('Event title').fill('E2E Opening Night');
    await page.getByLabel('Event date').fill('2026-10-15');
    await page.getByRole('button', { name: 'Create event' }).click();

    await expect(page.getByTestId('event-ledger-page')).toBeVisible({
      timeout: 15_000,
    });
  });
});
