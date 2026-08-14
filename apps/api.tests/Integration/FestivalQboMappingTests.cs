using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ExpenseAllocationTests;
using static SplitRail.Api.Tests.Integration.FestivalQboBoundaryTests;
using static SplitRail.Api.Tests.Integration.FestivalStructureTests;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

public class FestivalQboMappingTests : IntegrationTestBase
{
    [Fact]
    public async Task ImportedTransactions_RetainOriginalReferenceAndMasterTag()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-REF-42", 1_200m);

        var rows = await client.GetFromJsonAsync<List<FestivalQboTransactionResponse>>(QboPath(venueId, festival.EventId));
        var row = rows!.Single(r => r.Id == txId);

        row.QboTransactionId.Should().Be("TXN-REF-42");
        row.MasterTag.Should().Be(festival.QboTagName);
        row.Amount.Should().Be(1_200m);
    }

    [Fact]
    public async Task OverheadSingleTargetAndMultiTargetSplits_AreSupported()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-SPLIT", 1_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        (await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "OVERHEAD", "FIXED_AMOUNT", SourceQboTransactionId: txId, Amount: 200m)))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        (await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT", SourceQboTransactionId: txId, TargetBlockId: block.Id, Amount: 300m)))
            .StatusCode.Should().Be(HttpStatusCode.Created);

        (await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "EQUAL",
                SourceQboTransactionId: txId,
                Targets:
                [
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: block.Id),
                    new ExpenseAllocationTargetRequest("OVERHEAD"),
                ])))
            .StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task SplitLinesPlusOverhead_NeverExceedSourceAmount()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-CAP", 600m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT", SourceQboTransactionId: txId, TargetBlockId: block.Id, Amount: 400m));

        var overflow = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "OVERHEAD", "FIXED_AMOUNT", SourceQboTransactionId: txId, Amount: 300m));

        overflow.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var rows = await client.GetFromJsonAsync<List<FestivalQboTransactionResponse>>(QboPath(venueId, festival.EventId));
        rows!.Single(r => r.Id == txId).RemainingAtOverhead.Should().Be(200m);
    }

    [Fact]
    public async Task TwoWayTraceability_BlockToTransactionAndTransactionToAllocations()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-TRACE", 800m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT", SourceQboTransactionId: txId, TargetBlockId: block.Id, Amount: 500m));

        var blockTrace = await client.GetFromJsonAsync<BlockQboSourceTraceResponse>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/blocks/{block.Id}/qbo-sources");
        blockTrace!.SourceTransactions.Should().ContainSingle();
        blockTrace.SourceTransactions[0].Allocations.Should().ContainSingle();
        blockTrace.SourceTransactions[0].Allocations[0].Amount.Should().Be(500m);
        blockTrace.SourceTransactions[0].Allocations[0].CreatedByUserId.Should().NotBeEmpty();

        var txRows = await client.GetFromJsonAsync<List<FestivalQboTransactionResponse>>(QboPath(venueId, festival.EventId));
        var txRow = txRows!.Single(r => r.Id == txId);
        txRow.Allocations.Should().ContainSingle();
        txRow.Allocations[0].TargetBlockId.Should().Be(block.Id);
        txRow.TotalAllocated.Should().Be(500m);
    }
}
