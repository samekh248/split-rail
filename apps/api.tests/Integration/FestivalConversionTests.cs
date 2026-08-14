using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Festival mode is a progressive enhancement of an ordinary event — converting must never
/// lose the event's identity or its ledger (spec FR-001).
/// </summary>
public class FestivalConversionTests : IntegrationTestBase
{
    [Fact]
    public async Task ConvertStandardEvent_PreservesEventIdAndLedger()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var standard = await CreateEventViaApiAsync(client, venueId, "Autumn Show");
        var lineItemId = await SeedLineItemDirectAsync(token, standard.EventId, proformaValue: 4200m);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Autumn Fest", "2026-10-02", "2026-10-04", standard.EventId));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();

        festival!.EventId.Should().Be(standard.EventId, "conversion must not create a new event");
        festival.EventType.Should().Be("FESTIVAL");
        festival.Title.Should().Be("Autumn Fest");

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var lineItem = await db.FinancialLineItems.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lineItemId);
        lineItem.Should().NotBeNull("the existing master ledger must survive conversion");
        lineItem!.ProformaValue.Should().Be(4200m);
    }

    [Fact]
    public async Task ConvertStandardEvent_AutoCreatesDefaultStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var standard = await CreateEventViaApiAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Converted", "2026-10-02", "2026-10-03", standard.EventId));

        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();
        festival!.Stages.Should().HaveCount(1);
    }

    [Fact]
    public async Task ConvertStandardEvent_RejectsAlreadyFestival()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Again", "2026-08-14", "2026-08-15", festival.EventId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("already a festival");
    }

    [Fact]
    public async Task ConvertStandardEvent_RejectedWhenEventIsSettled()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var standard = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, standard.EventId, EventStatus.Settled);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Too Late", "2026-10-02", "2026-10-03", standard.EventId));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("settled or reconciled");
    }

    [Fact]
    public async Task ShrinkingDateRange_IsBlockedWhenBlocksWouldBeOrphaned()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, startDate: "2026-08-14", endDate: "2026-08-16");

        // Seed a block on the final day, then try to cut that day off the range.
        await SeedBlockDirectAsync(token, festival, new DateOnly(2026, 8, 16), "Closing Set");

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}",
            new UpdateFestivalRequest("Test Festival", "2026-08-14", "2026-08-15"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("outside the new date range");
    }

    [Fact]
    public async Task ShrinkingDateRange_SucceedsWhenNoBlocksAreOrphaned()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, startDate: "2026-08-14", endDate: "2026-08-16");

        await SeedBlockDirectAsync(token, festival, new DateOnly(2026, 8, 14), "Opening Set");

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}",
            new UpdateFestivalRequest("Test Festival", "2026-08-14", "2026-08-15"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RevertToStandard_BlockedWhenBlocksExist()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await SeedBlockDirectAsync(token, festival, new DateOnly(2026, 8, 14), "Some Act");

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/revert-to-standard", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("programming blocks exist");
    }

    private async Task SeedBlockDirectAsync(
        string accessToken,
        FestivalResponse festival,
        DateOnly dayDate,
        string title)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        db.ProgrammingBlocks.Add(new ProgrammingBlock
        {
            Id = Guid.NewGuid(),
            EventId = festival.EventId,
            StageZoneId = festival.Stages[0].Id,
            DayDate = dayDate,
            StartTime = new TimeOnly(20, 0),
            EndTime = new TimeOnly(21, 30),
            Title = title,
            Category = BlockCategory.Music
        });
        await db.SaveChangesAsync();
    }
}
