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
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class DashboardControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task GetDashboard_Returns200_FourPartitionsPresent()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await CreateEventViaApiAsync(client, venueId, "Tonight Show", today.ToString("yyyy-MM-dd"));

        var dashboard = await GetDashboardAsync(client, venueId);

        dashboard.VenueId.Should().Be(venueId);
        dashboard.TonightEvents.Should().NotBeNull();
        dashboard.PinnedEvents.Should().NotBeNull();
        dashboard.RecentEvents.Should().NotBeNull();
        dashboard.UpcomingEvents.Should().NotBeNull();
    }

    [Fact]
    public async Task GetDashboard_PartitionMatrix_DateBoundaries()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var todayEvent = await CreateEventViaApiAsync(client, venueId, "Tonight", today.ToString("yyyy-MM-dd"));
        var yesterdayEvent = await CreateEventViaApiAsync(client, venueId, "Yesterday", today.AddDays(-1).ToString("yyyy-MM-dd"));
        var sevenDaysAgoEvent = await CreateEventViaApiAsync(client, venueId, "Seven Days Ago", today.AddDays(-7).ToString("yyyy-MM-dd"));
        var eightDaysAgoEvent = await CreateEventViaApiAsync(client, venueId, "Eight Days Ago", today.AddDays(-8).ToString("yyyy-MM-dd"));
        var tomorrowEvent = await CreateEventViaApiAsync(client, venueId, "Tomorrow", today.AddDays(1).ToString("yyyy-MM-dd"));
        var thirtyDaysAheadEvent = await CreateEventViaApiAsync(client, venueId, "Thirty Days", today.AddDays(30).ToString("yyyy-MM-dd"));
        var thirtyOneDaysAheadEvent = await CreateEventViaApiAsync(client, venueId, "Thirty One Days", today.AddDays(31).ToString("yyyy-MM-dd"));

        var dashboard = await GetDashboardAsync(client, venueId);

        dashboard.TonightEvents.Select(e => e.EventId).Should().Contain(todayEvent.EventId);
        dashboard.RecentEvents.Select(e => e.EventId).Should().Contain(yesterdayEvent.EventId);
        dashboard.RecentEvents.Select(e => e.EventId).Should().Contain(sevenDaysAgoEvent.EventId);
        dashboard.RecentEvents.Select(e => e.EventId).Should().NotContain(todayEvent.EventId);
        dashboard.UpcomingEvents.Select(e => e.EventId).Should().Contain(tomorrowEvent.EventId);
        dashboard.UpcomingEvents.Select(e => e.EventId).Should().Contain(thirtyDaysAheadEvent.EventId);

        AllEventIds(dashboard).Should().NotContain(eightDaysAgoEvent.EventId);
        AllEventIds(dashboard).Should().NotContain(thirtyOneDaysAheadEvent.EventId);
    }

    [Fact]
    public async Task GetDashboard_EmptyVenue_AllPartitionsEmpty()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var dashboard = await GetDashboardAsync(client, venueId);

        dashboard.TonightEvents.Should().BeEmpty();
        dashboard.PinnedEvents.Should().BeEmpty();
        dashboard.RecentEvents.Should().BeEmpty();
        dashboard.UpcomingEvents.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDashboard_WithoutViewFinancials_Returns403()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        await CreateEventViaApiAsync(client, venueId);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, null, null, null, null, CanViewFinancials: false));

        var response = await client.GetAsync($"/api/venues/{venueId}/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetDashboard_CrossOrg_Returns404()
    {
        var emailA = $"dash-org-a-{Guid.NewGuid():N}@example.com";
        var (clientA, venueA, _) = await SetupFinancialAdminAsync(emailA);
        await CreateEventViaApiAsync(clientA, venueA);

        var emailB = $"dash-org-b-{Guid.NewGuid():N}@example.com";
        var (clientB, _, _) = await SetupFinancialAdminAsync(emailB);

        var response = await clientB.GetAsync($"/api/venues/{venueA}/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetDashboard_OutOfScopeVenue_Returns404()
    {
        var (adminClient, venueA, adminToken) = await SetupFinancialAdminAsync();
        var venueBResponse = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue B"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        await CreateEventViaApiAsync(adminClient, venueB!.Id);

        var scopedEmail = $"scoped-dash-{Guid.NewGuid():N}@example.com";
        var (scopedClient, _) = await CreateScopedVenueUserAsync(adminToken, venueA, scopedEmail);

        var response = await scopedClient.GetAsync($"/api/venues/{venueB.Id}/dashboard");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetDashboard_VarianceConcern_FlaggedWhenNonZeroVariance()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(client, venueId, "Variance Show", today.ToString("yyyy-MM-dd"));
        await SeedLineItemWithVarianceDirectAsync(token, evt.EventId, settlementValue: 100m, qboActualValue: 90m);

        var dashboard = await GetDashboardAsync(client, venueId);
        var card = dashboard.TonightEvents.Single(e => e.EventId == evt.EventId);

        card.HasVarianceConcern.Should().BeTrue();
    }

    [Fact]
    public async Task GetDashboard_UnmappedCount_MatchesSeededRows()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(client, venueId, "Unmapped Show", today.ToString("yyyy-MM-dd"));
        await SeedUnmappedTransactionDirectAsync(token, evt.EventId, venueId, "txn-1");
        await SeedUnmappedTransactionDirectAsync(token, evt.EventId, venueId, "txn-2");

        var dashboard = await GetDashboardAsync(client, venueId);
        var card = dashboard.TonightEvents.Single(e => e.EventId == evt.EventId);

        card.UnmappedCount.Should().Be(2);
    }

    [Fact]
    public async Task GetDashboard_LastSyncedAt_MatchesMaxLedgerEntry()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(client, venueId, "Sync Show", today.ToString("yyyy-MM-dd"));
        var older = DateTimeOffset.UtcNow.AddHours(-2);
        var newer = DateTimeOffset.UtcNow.AddHours(-1);
        await SeedSyncLedgerEntryWithSyncedAtDirectAsync(token, evt.EventId, "txn-old", "acct-1", older);
        await SeedSyncLedgerEntryWithSyncedAtDirectAsync(token, evt.EventId, "txn-new", "acct-2", newer);

        var dashboard = await GetDashboardAsync(client, venueId);
        var card = dashboard.TonightEvents.Single(e => e.EventId == evt.EventId);

        card.LastSyncedAt.Should().BeCloseTo(newer, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetDashboard_PinnedEvent_InPinnedPartitionWithIsPinnedTrue()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(client, venueId, "Pinned Show", today.ToString("yyyy-MM-dd"));

        (await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        var dashboard = await GetDashboardAsync(client, venueId);

        dashboard.PinnedEvents.Should().ContainSingle(e => e.EventId == evt.EventId);
        dashboard.PinnedEvents.Single(e => e.EventId == evt.EventId).IsPinned.Should().BeTrue();
    }

    [Fact]
    public async Task GetDashboard_PinnedUpcomingOverlap_InBothPartitions()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(
            client, venueId, "Pinned Upcoming", today.AddDays(14).ToString("yyyy-MM-dd"));

        (await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        var dashboard = await GetDashboardAsync(client, venueId);

        dashboard.PinnedEvents.Select(e => e.EventId).Should().Contain(evt.EventId);
        dashboard.UpcomingEvents.Select(e => e.EventId).Should().Contain(evt.EventId);
    }

    [Fact]
    public async Task GetDashboard_PerUserPinIsolation()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var evt = await CreateEventViaApiAsync(adminClient, venueId, "Shared Show", today.ToString("yyyy-MM-dd"));

        (await adminClient.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        var userBEmail = $"dash-b-{Guid.NewGuid():N}@example.com";
        var (userBClient, _) = await CreateScopedVenueUserAsync(adminToken, venueId, userBEmail);

        var adminDashboard = await GetDashboardAsync(adminClient, venueId);
        var userBDashboard = await GetDashboardAsync(userBClient, venueId);

        adminDashboard.PinnedEvents.Should().ContainSingle(e => e.EventId == evt.EventId);
        userBDashboard.PinnedEvents.Should().BeEmpty();
        userBDashboard.TonightEvents.Single(e => e.EventId == evt.EventId).IsPinned.Should().BeFalse();
    }

    private static IEnumerable<Guid> AllEventIds(DashboardResponse dashboard) =>
        dashboard.TonightEvents
            .Concat(dashboard.PinnedEvents)
            .Concat(dashboard.RecentEvents)
            .Concat(dashboard.UpcomingEvents)
            .Select(e => e.EventId)
            .Distinct();

    private static async Task<DashboardResponse> GetDashboardAsync(HttpClient client, Guid venueId)
    {
        var response = await client.GetAsync($"/api/venues/{venueId}/dashboard");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<DashboardResponse>())!;
    }

    private async Task SeedLineItemWithVarianceDirectAsync(
        string accessToken,
        Guid eventId,
        decimal settlementValue,
        decimal qboActualValue)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            EventId = eventId,
            BlockType = "REVENUE",
            RowLabel = "Variance Row",
            SortOrder = 0,
            SettlementValue = settlementValue,
            QboActualValue = qboActualValue
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedUnmappedTransactionDirectAsync(
        string accessToken,
        Guid eventId,
        Guid venueId,
        string qboTransactionId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.UnmappedQboTransactions.Add(new UnmappedQboTransaction
        {
            EventId = eventId,
            VenueId = venueId,
            QboTransactionId = qboTransactionId,
            QboAccountId = "acct-unmapped",
            QboAccountName = "Unmapped Account",
            Amount = 100m,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            SyncedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
    }

    private async Task SeedSyncLedgerEntryWithSyncedAtDirectAsync(
        string accessToken,
        Guid eventId,
        string qboTransactionId,
        string qboAccountId,
        DateTimeOffset syncedAt)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = qboTransactionId,
            QboAccountId = qboAccountId,
            Amount = 50m,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            SyncBatchId = Guid.NewGuid(),
            SyncedAt = syncedAt
        });
        await db.SaveChangesAsync();
    }
}
