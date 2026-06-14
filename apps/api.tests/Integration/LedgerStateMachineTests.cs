using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LedgerStateMachineTests : IntegrationTestBase
{
    [Fact]
    public async Task LockBudget_Success_UpdatesEditability()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<EventResponse>();
        result!.IsBudgetLocked.Should().BeTrue();
        result.Editability.Proforma.Should().Be("read-only");
        result.Editability.Settlement.Should().Be("editable");
    }

    [Fact]
    public async Task LockBudget_WithoutPermission_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, CanLockBudget: false, null, null, null, null, null));

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ProformaEdit_AfterLockBudget_Returns400()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Late Add", 0, false, 100m, 0m, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SettlementEdit_AfterLock_WithPermission_Succeeds()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}",
            new UpdateLineItemRequest("GA Tickets", 0, false, 5000m, 5500m, null, false, lineItem.RowVersion));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Mutations_WhenSettled_Return400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, evt.EventId, Models.Enums.EventStatus.Settled);

        var lineItemResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Blocked", 0, false, 100m, 0m, null));
        lineItemResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Blocked", 1, "guarantee", null, 1000m, 0m, 0m));
        artistResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Mutations_WhenReconciled_Return400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, evt.EventId, Models.Enums.EventStatus.Reconciled);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
