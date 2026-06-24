using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LineItemStructuralPermissionTests : IntegrationTestBase
{
    private async Task<HttpClient> CreatePromoterClientAsync(
        HttpClient adminClient,
        string adminToken,
        Guid venueId)
    {
        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var promoterEmail = $"promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(
            adminToken, promoterEmail, promoterRoleId, [venueId]);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(promoterEmail, "SecurePass1"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        return CreateAuthenticatedClient(auth!.AccessToken);
    }

    [Fact]
    public async Task DeleteLineItem_AfterLockBudget_WithoutSettlementPermission_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(adminClient, venueId);

        var createResponse = await adminClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        await adminClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        using var promoterClient = await CreatePromoterClientAsync(adminClient, adminToken, venueId);

        var response = await promoterClient.DeleteAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateLineItem_LabelOnly_AfterLockBudget_WithoutSettlementPermission_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(adminClient, venueId);

        var createResponse = await adminClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        await adminClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        await adminClient.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}",
            new UpdateLineItemRequest(
                "GA Tickets",
                0,
                false,
                5000m,
                5500m,
                null,
                false,
                lineItem.RowVersion));

        var refreshed = await adminClient.GetFromJsonAsync<LedgerGridResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        var updatedRow = refreshed!.Blocks
            .Single(b => b.BlockType == "REVENUE")
            .Rows
            .Single(r => r.Id == lineItem.Id);

        using var promoterClient = await CreatePromoterClientAsync(adminClient, adminToken, venueId);

        var response = await promoterClient.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest(
                "Renamed Label",
                updatedRow.SortOrder,
                updatedRow.IsArtistDeduction,
                updatedRow.ProformaValue,
                updatedRow.SettlementValue,
                updatedRow.Notes,
                updatedRow.IsHiddenFromPromoter,
                updatedRow.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
