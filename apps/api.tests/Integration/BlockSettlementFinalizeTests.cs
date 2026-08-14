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
using static SplitRail.Api.Tests.Integration.ExpenseAllocationTests;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementFinalizeTests : IntegrationTestBase
{
    [Fact]
    public async Task ViewingSavingAndPreflight_NeverFinalize()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        (await client.GetAsync(SettlementPath(venueId, festival.EventId, block.Id)))
            .EnsureSuccessStatusCode();
        (await client.GetAsync(PreflightPath(venueId, festival.EventId, block.Id)))
            .EnsureSuccessStatusCode();

        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, block.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 6_000m, 0m, "GROSS"));

        var unconfirmed = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id, confirmed: false);
        unconfirmed.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.ProgrammingBlocks.FirstAsync(b => b.Id == block.Id);
        stored.SettlementStatus.Should().Be(BlockSettlementStatus.Draft);
    }

    [Fact]
    public async Task Finalize_RequiresExplicitConfirmation()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var response = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id, confirmed: false);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("confirmed");
    }

    [Fact]
    public async Task Finalize_HappyPath_RecordsSnapshotPdfDispatchAndExpenseRollup()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 10_000m);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "PERCENTAGE",
                SourceLineItemId: lineItemId,
                TargetBlockId: block.Id,
                Percentage: 25m,
                CountsTowardSettlement: true));

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));
        preflight!.Ready.Should().BeTrue();

        var response = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id,
            expectedNetPayable: preflight.FinalPayable);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<BlockSettlementResultDto>();
        result!.SettlementStatus.Should().Be("FINALIZED");
        result.PdfUrl.Should().NotBeNullOrWhiteSpace();
        result.DispatchOutcome.Should().Be("DISPATCHED");
        result.FinalizedAt.Should().NotBeNull();
        result.RevisionNumber.Should().Be(1);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.ProgrammingBlocks.FirstAsync(b => b.Id == block.Id);
        stored.SettlementStatus.Should().Be(BlockSettlementStatus.Finalized);
        stored.FinalizedByUserId.Should().Be(userId);
        stored.FinalizedSnapshotJson.Should().NotBeNullOrWhiteSpace();

        var revision = await db.BlockSettlementRevisions
            .FirstAsync(r => r.ProgrammingBlockId == block.Id);
        revision.DispatchOutcome.Should().Be("DISPATCHED");
        revision.SnapshotJson.Should().NotBeNullOrWhiteSpace();

        var expenseLine = await db.FinancialLineItems.FirstAsync(l => l.Id == lineItemId);
        expenseLine.SettlementValue.Should().Be(2_500m,
            "finalized block expense rolls up to the master ledger");

        ArchiveStore.StoredObjectCount.Should().Be(1);
    }

    [Fact]
    public async Task Finalize_WhenArchiveStageFails_RollsBackToDraftAndLogsFailure()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        ArchiveStore.ThrowOnStage = true;

        var response = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id,
            expectedNetPayable: preflight!.FinalPayable);

        response.StatusCode.Should().Be(HttpStatusCode.BadGateway);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.ProgrammingBlocks.FirstAsync(b => b.Id == block.Id);
        stored.SettlementStatus.Should().Be(BlockSettlementStatus.Draft);

        var audit = await db.FestivalAuditEntries
            .Where(a => a.EntityId == block.Id && a.Action == "FinalizeFailed")
            .FirstOrDefaultAsync();
        audit.Should().NotBeNull();

        ArchiveStore.ThrowOnStage = false;
        var retry = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id,
            expectedNetPayable: preflight.FinalPayable);
        retry.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Finalize_WhenPromoteFails_RollsBackToDraft()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));

        ArchiveStore.ThrowOnPromote = true;

        var response = await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id,
            expectedNetPayable: preflight!.FinalPayable);

        response.StatusCode.Should().Be(HttpStatusCode.BadGateway);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.ProgrammingBlocks.FirstAsync(b => b.Id == block.Id);
        stored.SettlementStatus.Should().Be(BlockSettlementStatus.Draft);
        ArchiveStore.StoredObjectCount.Should().Be(0);
    }
}
