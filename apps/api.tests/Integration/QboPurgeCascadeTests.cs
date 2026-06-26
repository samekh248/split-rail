using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboPurgeCascadeTests : IntegrationTestBase
{
    [Fact]
    public async Task PurgeCachedData_WhenConnected_Returns409()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var response = await client.PostAsync($"/api/venues/{venueId}/qbo/purge-cache", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task PurgeCachedData_WhenDisconnected_ClearsCachedRows()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var disconnect = await client.PostAsync($"/api/venues/{venueId}/qbo/disconnect", null);
        disconnect.EnsureSuccessStatusCode();

        var purge = await client.PostAsync($"/api/venues/{venueId}/qbo/purge-cache", null);
        purge.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var integration = await client.GetFromJsonAsync<SplitRail.Api.DTOs.Qbo.VenueQboIntegrationDto>(
            $"/api/venues/{venueId}/qbo/integration");
        integration!.CanPurgeCache.Should().BeFalse();
    }
}
