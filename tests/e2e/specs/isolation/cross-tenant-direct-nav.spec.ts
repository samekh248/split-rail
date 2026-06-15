import { test, expect, setupTwoOrgSessions } from '../../fixtures/auth';
import { apiRequestWithToken, bodyContainsSentinel } from '../../fixtures/api-intercept';

test.describe('Cross-tenant direct navigation', () => {
  test('Org A cannot access Org B resources by direct API navigation', async ({ browser, request }) => {
    const { orgA, orgB, sentinelsB } = await setupTwoOrgSessions(browser);

    const lifecycleB = await request.post(`${process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL}/api/test-seed/lifecycle-event`, {
      data: { organizationId: orgB.organizationId, venueId: orgB.inScopeVenueId },
    });
    const eventB = (await lifecycleB.json()) as { eventId: string };

    const venueAttempt = await apiRequestWithToken(
      request,
      'GET',
      `/api/venues/${orgB.inScopeVenueId}`,
      orgA.accessToken,
    );
    expect([403, 404]).toContain(venueAttempt.status);
    expect(bodyContainsSentinel(venueAttempt.body, sentinelsB)).toHaveLength(0);

    const eventAttempt = await apiRequestWithToken(
      request,
      'GET',
      `/api/venues/${orgB.inScopeVenueId}/events/${eventB.eventId}`,
      orgA.accessToken,
    );
    expect([403, 404]).toContain(eventAttempt.status);
    expect(bodyContainsSentinel(eventAttempt.body, sentinelsB)).toHaveLength(0);
  });
});
