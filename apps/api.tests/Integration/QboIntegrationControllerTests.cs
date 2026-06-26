using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboIntegrationControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task GetVenueQboIntegration_WhenDisconnected_ReturnsDisconnectedState()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/integration");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Qbo.VenueQboIntegrationDto>();
        dto!.ConnectionState.Should().Be("Disconnected");
        dto.QboConnected.Should().BeFalse();
        dto.CanPurgeCache.Should().BeFalse();
    }

    [Fact]
    public async Task GetVenueQboIntegration_WhenConnected_ReturnsConnectedState()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/integration");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Qbo.VenueQboIntegrationDto>();
        dto!.ConnectionState.Should().Be("Connected");
        dto.QboConnected.Should().BeTrue();
        dto.RealmId.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetConnectUrl_AsAdmin_ReturnsAuthUrl()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/connect-url");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Qbo.QboConnectUrlDto>();
        dto!.AuthUrl.Should().Contain("appcenter.intuit.com");
    }

    [Fact]
    public async Task SyncVenue_AsAdmin_RateLimitedOnSecondRequestWithin60Seconds()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var first = await client.PostAsync($"/api/venues/{venueId}/sync", null);
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await client.PostAsync($"/api/venues/{venueId}/sync", null);
        second.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }
}
