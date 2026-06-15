using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementAuthorizationTests : IntegrationTestBase
{
    [Fact]
    public async Task Finalize_WithoutSignPermission_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, CanSignSettlement: false, null, null, null, null));

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Finalize_WithUnlockedBudget_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedLineItemDirectAsync(token, evt.EventId, settlementValue: 100m);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Finalize_WithMalformedSignature_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest("not-valid-base64", true));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
