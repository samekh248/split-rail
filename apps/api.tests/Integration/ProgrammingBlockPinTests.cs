using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

public class ProgrammingBlockPinTests : IntegrationTestBase
{
    [Fact]
    public async Task PinFestival_Returns204_AndEventResponseIsPinned()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PutAsync(
            $"/api/venues/{venueId}/events/{festival.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{festival.EventId}");
        evt!.IsPinned.Should().BeTrue();
        evt.EventType.Should().Be("FESTIVAL");
    }

    [Fact]
    public async Task PinBlock_Returns204_AndItineraryMarksBlockPinned()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Headliner", "20:00", "21:30");

        var response = await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var pin = await GetPinAsync(token, userId, block.Id);
        pin.Should().NotBeNull();
        pin!.PinnedAt.Should().BeAfter(DateTimeOffset.UtcNow.AddMinutes(-1));

        var itinerary = await client.GetFromJsonAsync<ItineraryResponse>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/itinerary");
        itinerary!.Blocks.Single(b => b.Id == block.Id).IsPinned.Should().BeTrue();
        itinerary.Blocks.Should().ContainSingle();
    }

    [Fact]
    public async Task PinBlock_Idempotent_DoesNotDuplicate()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Opener", "18:00", "19:00");

        var first = await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null);
        var second = await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null);

        first.StatusCode.Should().Be(HttpStatusCode.NoContent);
        second.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await CountPinsAsync(token, userId, block.Id)).Should().Be(1);
    }

    [Fact]
    public async Task PinBlock_WithoutViewFinancials_Returns403()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, null, null, null, null, CanViewFinancials: false));

        var response = await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UnpinBlock_Returns204_AndRemovesPinRow()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null);

        var response = await client.DeleteAsync(PinPath(venueId, festival.EventId, block.Id));
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await GetPinAsync(token, userId, block.Id)).Should().BeNull();

        var itinerary = await client.GetFromJsonAsync<ItineraryResponse>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/itinerary");
        itinerary!.Blocks.Single().IsPinned.Should().BeFalse();
    }

    [Fact]
    public async Task UnpinBlock_WhenNotPinned_Returns204()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.DeleteAsync(PinPath(venueId, festival.EventId, block.Id));
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UnpinBlock_PerUserIsolation_TwoUsersSameBlock()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var (adminUserId, _) = ParseTokenClaims(adminToken);
        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);
        var block = await CreateBlockAsync(adminClient, venueId, festival, "Act", "20:00", "21:00");

        var userBEmail = $"block-pin-b-{Guid.NewGuid():N}@example.com";
        var (userBClient, userBId) = await CreateScopedVenueUserAsync(adminToken, venueId, userBEmail);

        (await adminClient.PutAsync(PinPath(venueId, festival.EventId, block.Id), null))
            .EnsureSuccessStatusCode();
        (await userBClient.PutAsync(PinPath(venueId, festival.EventId, block.Id), null))
            .EnsureSuccessStatusCode();

        (await adminClient.DeleteAsync(PinPath(venueId, festival.EventId, block.Id)))
            .EnsureSuccessStatusCode();

        (await GetPinAsync(adminToken, adminUserId, block.Id)).Should().BeNull();
        (await GetPinAsync(adminToken, userBId, block.Id)).Should().NotBeNull();
    }

    [Fact]
    public async Task PinBlock_CrossOrg_Returns404()
    {
        var (clientA, venueA, _) = await SetupFinancialAdminAsync($"pin-fest-a-{Guid.NewGuid():N}@example.com");
        var festival = await FestivalStructureTests.CreateFestivalAsync(clientA, venueA);
        var block = await CreateBlockAsync(clientA, venueA, festival, "Act", "20:00", "21:00");

        var (clientB, _, _) = await SetupFinancialAdminAsync($"pin-fest-b-{Guid.NewGuid():N}@example.com");

        var response = await clientB.PutAsync(PinPath(venueA, festival.EventId, block.Id), null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PinBlock_UnknownBlock_Returns404()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PutAsync(PinPath(venueId, festival.EventId, Guid.NewGuid()), null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PinBlock_BlockDelete_CascadesPinRemoval()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Temp", "12:00", "13:00");

        (await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null))
            .EnsureSuccessStatusCode();
        (await GetPinAsync(token, userId, block.Id)).Should().NotBeNull();

        (await client.DeleteAsync($"{BlocksPath(venueId, festival.EventId)}/{block.Id}"))
            .EnsureSuccessStatusCode();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await db.UserProgrammingBlockPins.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task GetDashboard_PinnedFestival_HasFestivalEventType()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        (await client.PutAsync($"/api/venues/{venueId}/events/{festival.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        var dashboard = await client.GetFromJsonAsync<DashboardResponse>(
            $"/api/venues/{venueId}/dashboard");

        var card = dashboard!.PinnedEvents.Should().ContainSingle(e => e.EventId == festival.EventId).Subject;
        card.EventType.Should().Be("FESTIVAL");
        card.IsPinned.Should().BeTrue();
    }

    [Fact]
    public async Task GetDashboard_PinnedPerformance_AppearsInPinnedPerformances()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId, "Red Dirt Fest");
        var block = await CreateBlockAsync(client, venueId, festival, "Cody Jinks", "20:00", "21:30");

        (await client.PutAsync(PinPath(venueId, festival.EventId, block.Id), null))
            .EnsureSuccessStatusCode();

        var dashboard = await client.GetFromJsonAsync<DashboardResponse>(
            $"/api/venues/{venueId}/dashboard");

        var performance = dashboard!.PinnedPerformances.Should().ContainSingle().Subject;
        performance.BlockId.Should().Be(block.Id);
        performance.EventId.Should().Be(festival.EventId);
        performance.VenueId.Should().Be(venueId);
        performance.FestivalTitle.Should().Be("Red Dirt Fest");
        performance.Title.Should().Be("Cody Jinks");
        performance.DayDate.Should().Be("2026-08-14");
        performance.StartTime.Should().Be("20:00");
        performance.EndTime.Should().Be("21:30");
        performance.StageName.Should().NotBeNullOrWhiteSpace();
        performance.IsPinned.Should().BeTrue();
    }

    [Fact]
    public async Task GetDashboard_PinnedPerformance_PerUserIsolation()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);
        var block = await CreateBlockAsync(adminClient, venueId, festival, "Act", "20:00", "21:00");

        (await adminClient.PutAsync(PinPath(venueId, festival.EventId, block.Id), null))
            .EnsureSuccessStatusCode();

        var userBEmail = $"dash-block-b-{Guid.NewGuid():N}@example.com";
        var (userBClient, _) = await CreateScopedVenueUserAsync(adminToken, venueId, userBEmail);

        var adminDashboard = await adminClient.GetFromJsonAsync<DashboardResponse>(
            $"/api/venues/{venueId}/dashboard");
        var userBDashboard = await userBClient.GetFromJsonAsync<DashboardResponse>(
            $"/api/venues/{venueId}/dashboard");

        adminDashboard!.PinnedPerformances.Should().ContainSingle(p => p.BlockId == block.Id);
        (userBDashboard!.PinnedPerformances ?? []).Should().BeEmpty();
    }

    private static string PinPath(Guid venueId, Guid eventId, Guid blockId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/blocks/{blockId}/pin";

    private async Task<SplitRail.Api.Models.UserProgrammingBlockPin?> GetPinAsync(
        string accessToken,
        Guid userId,
        Guid blockId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (_, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.UserProgrammingBlockPins
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ProgrammingBlockId == blockId);
    }

    private async Task<int> CountPinsAsync(string accessToken, Guid userId, Guid blockId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (_, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.UserProgrammingBlockPins
            .AsNoTracking()
            .CountAsync(p => p.UserId == userId && p.ProgrammingBlockId == blockId);
    }
}
