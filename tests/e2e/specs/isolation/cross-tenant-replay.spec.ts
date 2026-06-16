import { test, expect, setupTwoOrgSessions } from '../../fixtures/auth';
import { apiRequestWithToken, bodyContainsSentinel, swapIdsInPath } from '../../fixtures/api-intercept';

test.describe('Cross-tenant request replay', () => {
  test('Org A replaying Org B identifiers is denied with no foreign data', async ({ browser, request }) => {
    const { orgA, orgB, sentinelsB } = await setupTwoOrgSessions(browser);

    const ownVenue = await apiRequestWithToken(
      request,
      'GET',
      `/api/venues/${orgA.inScopeVenueId}`,
      orgA.accessToken,
    );
    expect(ownVenue.status).toBe(200);

    const replayPath = swapIdsInPath(
      `/api/venues/${orgA.inScopeVenueId}`,
      orgA.inScopeVenueId,
      orgB.inScopeVenueId,
    );

    const replayAttempt = await apiRequestWithToken(
      request,
      'GET',
      replayPath,
      orgA.accessToken,
    );
    expect([403, 404]).toContain(replayAttempt.status);
    expect(bodyContainsSentinel(replayAttempt.body, sentinelsB)).toHaveLength(0);
  });
});
