using System.Net;
using FluentAssertions;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboTenantIsolationTests : IntegrationTestBase
{
    [Fact]
    public async Task CrossOrgSyncAccess_Returns404()
    {
        var (clientA, venueA, tokenA) = await SetupFinancialAdminAsync("org-a@test.com");
        var evtA = await CreateEventViaApiAsync(clientA, venueA);

        var (clientB, _, _) = await SetupFinancialAdminAsync("org-b@test.com");

        var response = await clientB.PostAsync(
            $"/api/venues/{venueA}/events/{evtA.EventId}/sync",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CrossOrgUnmappedAccess_Returns404()
    {
        var (clientA, venueA, _) = await SetupFinancialAdminAsync("iso-a@test.com");
        var evtA = await CreateEventViaApiAsync(clientA, venueA);

        var (clientB, _, _) = await SetupFinancialAdminAsync("iso-b@test.com");

        var response = await clientB.GetAsync(
            $"/api/venues/{venueA}/events/{evtA.EventId}/unmapped-count");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
