using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementPreflightTests : IntegrationTestBase
{
    [Fact]
    public async Task Preflight_ReportsMissingRevenueMapping()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(
            client, venueId, festival, "Percent Act", "20:00", "21:00", requiresSettlement: true);

        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, block.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("door_split", 0m, 10m, "GROSS"));

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        preflight!.Ready.Should().BeFalse();
        preflight.Blockers.Should().Contain(b =>
            b.Category == PreflightBlockerCategories.MissingRevenueMapping);
    }

    [Fact]
    public async Task Preflight_ReportsMissingSettlementFields()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(
            client, venueId, festival, "Empty Deal", "20:00", "21:00", requiresSettlement: true);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        preflight!.Blockers.Should().Contain(b =>
            b.Category == PreflightBlockerCategories.MissingSettlementFields);
    }

    [Fact]
    public async Task Preflight_ReportsAllocationConflict()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await RevenueAllocationTests.CreateBucketAsync(
            client, venueId, festival, "Wristbands", 100_000m);
        var first = await CreateBlockAsync(
            client, venueId, festival, "A", "18:00", "19:00", requiresSettlement: true);
        var second = await CreateBlockAsync(
            client, venueId, festival, "B", "20:00", "21:00", requiresSettlement: true);

        await RevenueAllocationTests.AllocateAsync(client, venueId, festival, bucket.Id, first.Id, 80m);
        await RevenueAllocationTests.AllocateRawAsync(client, venueId, festival, bucket.Id, second.Id, 40m);

        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, second.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 5_000m, 0m, "GROSS"));

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, second.Id));

        preflight!.Blockers.Should().Contain(b =>
            b.Category == PreflightBlockerCategories.AllocationConflict);
    }

    [Fact]
    public async Task Preflight_ReportsMissingExpenseMapping()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        await SeedUnmappedQboWithReviewStateDirectAsync(
            token, festival.EventId, QboReviewState.Untagged, block.Id);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        preflight!.Blockers.Should().Contain(b =>
            b.Category == PreflightBlockerCategories.MissingExpenseMapping);
    }

    [Fact]
    public async Task Preflight_ReportsUnresolvedScheduleChange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                block.Title, block.DayDate, festival.Stages[0].Id,
                "19:00", "21:00", "MUSIC", RequiresSettlement: true));

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        preflight!.Blockers.Should().Contain(b =>
            b.Category == PreflightBlockerCategories.UnresolvedScheduleChange);
    }

    [Fact]
    public async Task DraftSaving_RemainsAllowedWithBlockers()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(
            client, venueId, festival, "Draft", "20:00", "21:00", requiresSettlement: true);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));
        preflight!.Ready.Should().BeFalse();

        var save = await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, block.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 4_000m, 0m, "GROSS"));

        save.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private async Task SeedUnmappedQboWithReviewStateDirectAsync(
        string accessToken,
        Guid eventId,
        QboReviewState reviewState,
        Guid blockId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var festivalEvent = await db.Events.AsNoTracking().FirstAsync(e => e.Id == eventId);
        var txn = new SplitRail.Api.Models.UnmappedQboTransaction
        {
            EventId = eventId,
            VenueId = festivalEvent.VenueId,
            QboTransactionId = $"txn-{Guid.NewGuid():N}",
            QboAccountId = "acct-1",
            QboAccountName = "Production",
            Amount = 1_000m,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            SyncedAt = DateTimeOffset.UtcNow,
            ReviewState = reviewState
        };
        db.UnmappedQboTransactions.Add(txn);
        await db.SaveChangesAsync();

        db.ExpenseAllocations.Add(new SplitRail.Api.Models.ExpenseAllocation
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            SourceQboTransactionId = txn.Id,
            TargetType = AllocationTargetType.Block,
            TargetBlockId = blockId,
            Method = AllocationMethod.FixedAmount,
            CalculatedAmount = 500m,
            CountsTowardSettlement = true,
            CreatedByUserId = userId,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
    }
}
