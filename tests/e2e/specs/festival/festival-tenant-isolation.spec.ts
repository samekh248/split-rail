import { test, expect } from '@playwright/test';
import { setupTwoOrgSessions } from '../../fixtures/auth';
import { apiRequestWithToken } from '../../fixtures/api-intercept';

test.describe('Festival tenant isolation', () => {
  test('second organization cannot reach festival endpoints of the first', async ({ browser, request }) => {
    const { orgA, orgB } = await setupTwoOrgSessions(browser);

    const createResponse = await request.post(
      `${process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL}/api/venues/${orgA.inScopeVenueId}/festivals`,
      {
        headers: { Authorization: `Bearer ${orgA.accessToken}`, 'Content-Type': 'application/json' },
        data: { title: 'Private Fest', startDate: '2026-08-14', endDate: '2026-08-15' },
      },
    );
    expect(createResponse.ok()).toBeTruthy();
    const festival = (await createResponse.json()) as { eventId: string; stages: { id: string }[] };

    const blockResponse = await request.post(
      `${process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL}/api/venues/${orgA.inScopeVenueId}/festivals/${festival.eventId}/blocks`,
      {
        headers: { Authorization: `Bearer ${orgA.accessToken}`, 'Content-Type': 'application/json' },
        data: {
          title: 'Secret Act',
          dayDate: '2026-08-14',
          stageZoneId: festival.stages[0].id,
          startTime: '20:00',
          endTime: '21:00',
          category: 'MUSIC',
          requiresSettlement: true,
        },
      },
    );
    expect(blockResponse.ok()).toBeTruthy();
    const block = (await blockResponse.json()) as { id: string };

    const deniedPaths = [
      `/api/venues/${orgA.inScopeVenueId}/festivals/${festival.eventId}`,
      `/api/venues/${orgA.inScopeVenueId}/festivals/${festival.eventId}/blocks/${block.id}/settlement`,
      `/api/venues/${orgA.inScopeVenueId}/festivals/${festival.eventId}/my-blocks`,
    ];

    for (const path of deniedPaths) {
      const attempt = await apiRequestWithToken(request, 'GET', path, orgB.accessToken);
      expect([403, 404]).toContain(attempt.status);
    }
  });
});
