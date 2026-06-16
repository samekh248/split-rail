import { test, expect } from '@playwright/test';
import { resetSeed, seedLifecycleEvent } from '../../fixtures/seed';

const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const validSignature = btoa('[[{"x":10,"y":20},{"x":30,"y":40}]]');

test.describe('Full lifecycle state machine', () => {
  test('planning → budget lock → settlement → finalize → read-only → variance', async ({ request, page }) => {
    const seed = await resetSeed();
    const lifecycle = await seedLifecycleEvent(seed.orgA.organizationId, seed.orgA.inScopeVenueId);
    const token = await login(seed.orgA.adminEmail, seed.orgA.adminPassword);
    const headers = authHeaders(token);
    const base = `/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}`;

    const ledgerPre = await request.get(`${base}/ledger`, { headers });
    expect(ledgerPre.ok()).toBeTruthy();
    const pre = (await ledgerPre.json()) as { editability: { proforma: string; settlement: string } };
    expect(pre.editability.proforma).toBe('editable');
    expect(pre.editability.settlement).not.toBe('editable');

    const lock = await request.post(`${base}/lock-budget`, { headers });
    expect(lock.ok()).toBeTruthy();

    const ledgerPostLock = await request.get(`${base}/ledger`, { headers });
    const postLock = (await ledgerPostLock.json()) as { editability: { proforma: string; settlement: string } };
    expect(postLock.editability.proforma).not.toBe('editable');
    expect(postLock.editability.settlement).toBe('editable');

    const recalc = await request.post(`${base}/recalculate`, { headers });
    expect(recalc.ok()).toBeTruthy();
    const calcBody = (await recalc.json()) as { artists: Array<{ calculatedNetPayout: string }> };
    expect(calcBody.artists[0]?.calculatedNetPayout).toBe(lifecycle.expectedSettlement.computedNetPayout);

    const settle = await request.post(`${base}/settle`, {
      headers,
      data: { signatureData: validSignature, confirmed: true },
    });
    expect(settle.ok()).toBeTruthy();

    const ledgerSettled = await request.get(`${base}/ledger`, { headers });
    const settled = (await ledgerSettled.json()) as { editability: { proforma: string; settlement: string; notes: string } };
    expect(settled.editability.proforma).toBe('read-only');
    expect(settled.editability.settlement).toBe('read-only');

    const pdfLink = await request.get(`${base}/settlement-pdf`, { headers });
    expect(pdfLink.ok()).toBeTruthy();

    const sync = await request.post(`${base}/sync`, { headers });
    expect(sync.ok()).toBeTruthy();

    const ledgerVariance = await request.get(`${base}/ledger`, { headers });
    const withVariance = (await ledgerVariance.json()) as {
      blocks: Array<{ rows: Array<{ qboActualValue?: string | null }> }>;
    };
    const rows = withVariance.blocks.flatMap((b) => b.rows);
    const expenseRow = rows.find((r) => r.qboActualValue);
    expect(expenseRow?.qboActualValue).toBeTruthy();

    if (process.env.WEB_BASE_URL) {
      await page.goto(
        `${process.env.WEB_BASE_URL}/?venueId=${lifecycle.venueId}&eventId=${lifecycle.eventId}`,
      );
      await expect(page.getByTestId('settlement-locked-banner')).toBeVisible();
    }
  });

  test('touch signature on canvas under mobile viewport', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Touch signature runs on mobile project only');
    test.skip(!process.env.WEB_BASE_URL, 'WEB_BASE_URL required for UI signature test');

    const seed = await resetSeed();
    const lifecycle = await seedLifecycleEvent(seed.orgA.organizationId, seed.orgA.inScopeVenueId);
    const token = await login(seed.orgA.adminEmail, seed.orgA.adminPassword);
    const headers = authHeaders(token);
    const base = `/api/venues/${lifecycle.venueId}/events/${lifecycle.eventId}`;

    await request.post(`${base}/lock-budget`, { headers: authHeaders(token) });

    await page.addInitScript((t) => localStorage.setItem('accessToken', t), token);
    await page.goto(
      `${process.env.WEB_BASE_URL}/?venueId=${lifecycle.venueId}&eventId=${lifecycle.eventId}`,
    );

    const canvas = page.getByTestId('signature-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.touchscreen.tap(box.x + 20, box.y + 20);
    await page.touchscreen.tap(box.x + 60, box.y + 40);

    await page.getByTestId('finalize-confirm-checkbox').check();
    await page.getByTestId('finalize-settlement-btn').click();
    await expect(page.getByTestId('settlement-locked-banner')).toBeVisible({ timeout: 30_000 });
  });
});
