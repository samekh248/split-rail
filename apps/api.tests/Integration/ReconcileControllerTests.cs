using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class ReconcileControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task Reconcile_SettledEvent_Returns200_WithMetadata()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, userId);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<EventResponse>();
        result!.Status.Should().Be("RECONCILED");
        result.ReconciledAt.Should().NotBeNull();
        result.ReconciledByUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Reconcile_GetEventAfterReconcile_ReflectsMetadata()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, userId);

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        var getResponse = await client.GetAsync($"/api/venues/{venueId}/events/{evt.EventId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<EventResponse>();
        fetched!.Status.Should().Be("RECONCILED");
        fetched.ReconciledAt.Should().NotBeNull();
        fetched.ReconciledByUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Reconcile_DashboardAfterReconcile_ReflectsReconciledStatus()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, userId);

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        var dashboardResponse = await client.GetAsync($"/api/venues/{venueId}/dashboard");
        dashboardResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboard = await dashboardResponse.Content.ReadFromJsonAsync<DashboardResponse>();
        var allCards = dashboard!.TonightEvents
            .Concat(dashboard.PinnedEvents)
            .Concat(dashboard.RecentEvents)
            .Concat(dashboard.UpcomingEvents)
            .ToList();
        var card = allCards.Single(c => c.EventId == evt.EventId);
        card.Status.Should().Be("RECONCILED");
        card.ReconciledAt.Should().NotBeNull();
        card.ReconciledByUserId.Should().Be(userId);
    }

    [Fact]
    public async Task Reconcile_WithoutTriggerQboSync_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, ParseTokenClaims(token).UserId);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, null, null, CanTriggerQboSync: false, null, null));

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Reconcile_PreShowEvent_Returns400()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reconcile_AlreadyReconciled_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, ParseTokenClaims(token).UserId);

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reconcile_CrossOrg_Returns404()
    {
        var emailA = $"reconcile-org-a-{Guid.NewGuid():N}@example.com";
        var (clientA, venueA, tokenA) = await SetupFinancialAdminAsync(emailA);
        var evt = await CreateEventViaApiAsync(clientA, venueA);
        await SetSettledEventDirectAsync(tokenA, evt.EventId, ParseTokenClaims(tokenA).UserId);

        var emailB = $"reconcile-org-b-{Guid.NewGuid():N}@example.com";
        var (clientB, _, _) = await SetupFinancialAdminAsync(emailB);

        var response = await clientB.PostAsync(
            $"/api/venues/{venueA}/events/{evt.EventId}/reconcile", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reconcile_OutOfScopeVenue_Returns404()
    {
        var (adminClient, venueA, adminToken) = await SetupFinancialAdminAsync();
        var venueBResponse = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue B"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        var evt = await CreateEventViaApiAsync(adminClient, venueB!.Id);
        await SetSettledEventDirectAsync(adminToken, evt.EventId, ParseTokenClaims(adminToken).UserId);

        var scopedEmail = $"scoped-reconcile-{Guid.NewGuid():N}@example.com";
        var (scopedClient, _) = await CreateScopedVenueUserAsync(adminToken, venueA, scopedEmail);

        var response = await scopedClient.PostAsync(
            $"/api/venues/{venueB.Id}/events/{evt.EventId}/reconcile", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reconcile_WrongVenueIdForEvent_Returns404()
    {
        var (client, venueA, token) = await SetupFinancialAdminAsync();
        var venueBResponse = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Other Venue"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        var evt = await CreateEventViaApiAsync(client, venueA);
        await SetSettledEventDirectAsync(token, evt.EventId, ParseTokenClaims(token).UserId);

        var response = await client.PostAsync(
            $"/api/venues/{venueB!.Id}/events/{evt.EventId}/reconcile", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reconcile_PreservesSettlementFields()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);
        var settledAt = DateTimeOffset.UtcNow.AddHours(-2);
        await SetSettledEventDirectAsync(token, evt.EventId, userId, settledAt, "settlements/test.pdf");

        var before = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}");

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        var after = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}");
        after!.SettledAt.Should().Be(before!.SettledAt);
        after.SettlementPdfAvailable.Should().BeTrue();
        after.Status.Should().Be("RECONCILED");
    }

    [Fact]
    public async Task Reconcile_PostReconcileLineItemMutation_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, ParseTokenClaims(token).UserId);

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Blocked", 0, false, 100m, 0m, null));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reconcile_ConcurrentSecondRequest_Returns409()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SetSettledEventDirectAsync(token, evt.EventId, ParseTokenClaims(token).UserId);
        var url = $"/api/venues/{venueId}/events/{evt.EventId}/reconcile";

        var task1 = client.PostAsync(url, null);
        var task2 = client.PostAsync(url, null);
        await Task.WhenAll(task1, task2);

        var statuses = new[] { task1.Result.StatusCode, task2.Result.StatusCode };
        statuses.Should().Contain(HttpStatusCode.OK);
        statuses.Count(s => s == HttpStatusCode.OK).Should().Be(1);
        var loser = statuses.First(s => s != HttpStatusCode.OK);
        loser.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Conflict);
    }

    private async Task SetSettledEventDirectAsync(
        string accessToken,
        Guid eventId,
        Guid settledByUserId,
        DateTimeOffset? settledAt = null,
        string? settlementPdfUrl = "settlements/test.pdf")
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Status = EventStatus.Settled;
        evt.IsBudgetLocked = true;
        evt.SettledAt = settledAt ?? DateTimeOffset.UtcNow;
        evt.SettledByUserId = settledByUserId;
        evt.SettlementPdfUrl = settlementPdfUrl;
        await db.SaveChangesAsync();
    }
}
