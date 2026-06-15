import { test as base, type BrowserContext, type Page } from '@playwright/test';

export interface OrgSession {
  context: BrowserContext;
  page: Page;
  accessToken: string;
  organizationId: string;
  adminEmail: string;
  adminPassword: string;
  inScopeVenueId: string;
  outOfScopeVenueId: string;
}

export interface TwoOrgFixtures {
  orgA: OrgSession;
  orgB: OrgSession;
  sentinelsA: string[];
  sentinelsB: string[];
}

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

async function loginViaApi(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Login failed for ${email}: ${response.status}`);
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

async function injectToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('accessToken', t);
  }, token);
}

export const test = base.extend<TwoOrgFixtures>({
  orgA: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use({ context, page, accessToken: '', organizationId: '', adminEmail: '', adminPassword: '', inScopeVenueId: '', outOfScopeVenueId: '' });
    await context.close();
  },
  orgB: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await use({ context, page, accessToken: '', organizationId: '', adminEmail: '', adminPassword: '', inScopeVenueId: '', outOfScopeVenueId: '' });
    await context.close();
  },
  sentinelsA: async ({}, use) => { await use([]); },
  sentinelsB: async ({}, use) => { await use([]); },
});

export async function setupTwoOrgSessions(
  browser: import('@playwright/test').Browser,
): Promise<TwoOrgFixtures> {
  const resetResponse = await fetch(`${API_BASE}/api/test-seed/reset`, { method: 'POST' });
  if (!resetResponse.ok) throw new Error(`Seed reset failed: ${resetResponse.status}`);
  const seed = (await resetResponse.json()) as {
    orgA: { organizationId: string; adminEmail: string; adminPassword: string; inScopeVenueId: string; outOfScopeVenueId: string };
    orgB: { organizationId: string; adminEmail: string; adminPassword: string; inScopeVenueId: string; outOfScopeVenueId: string };
    sentinels: { orgAString: string[]; orgBStrings: string[] };
  };

  async function buildSession(org: typeof seed.orgA): Promise<OrgSession> {
    const token = await loginViaApi(org.adminEmail, org.adminPassword);
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectToken(page, token);
    return {
      context,
      page,
      accessToken: token,
      organizationId: org.organizationId,
      adminEmail: org.adminEmail,
      adminPassword: org.adminPassword,
      inScopeVenueId: org.inScopeVenueId,
      outOfScopeVenueId: org.outOfScopeVenueId,
    };
  }

  return {
    orgA: await buildSession(seed.orgA),
    orgB: await buildSession(seed.orgB),
    sentinelsA: seed.sentinels.orgAString,
    sentinelsB: seed.sentinels.orgBStrings,
  };
}

export { expect } from '@playwright/test';
