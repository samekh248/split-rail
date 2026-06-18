using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class ArtistDealPermissionTests : IntegrationTestBase
{
    [Fact]
    public async Task UpdateArtist_WithoutSettlementPermission_OnLockedBudget_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 70m, 0m));
        createResponse.EnsureSuccessStatusCode();
        var artist = await createResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        lockResponse.EnsureSuccessStatusCode();

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, CanEditSettlement: false, null, null, null, null, null));

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}",
            new UpdateArtistRequest(
                "Headliner", 1, "guarantee", null, 6000m, 70m, 0m, artist.RowVersion));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
