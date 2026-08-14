using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models.Enums;
using Xunit;
using static SplitRail.Api.Tests.Integration.ExpenseAllocationTests;
using static SplitRail.Api.Tests.Integration.FestivalQboBoundaryTests;
using static SplitRail.Api.Tests.Integration.FestivalStructureTests;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

public class FestivalQboExceptionTests : IntegrationTestBase
{
    [Fact]
    public async Task ReviewStateTransactions_AreExcludedFromSettlementMarkedSplits()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(
            token, festival.EventId, venueId, "TXN-EXC", 900m, QboReviewState.MismatchedTag);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT",
                SourceQboTransactionId: txId,
                TargetBlockId: block.Id,
                Amount: 100m,
                CountsTowardSettlement: true));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("review");
    }

    [Fact]
    public async Task ReviewResolution_PreservesOriginalStateAndReason()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var txId = await SeedFestivalQboTransactionAsync(
            token, festival.EventId, venueId, "TXN-RES", 400m, QboReviewState.Untagged);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/qbo-transactions/{txId}/review",
            new ResolveQboReviewRequest("AcceptAsOverhead", "Bookkeeper confirmed festival overhead"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var resolution = await response.Content.ReadFromJsonAsync<QboReviewResolutionResponse>();
        resolution!.PriorReviewState.Should().Be("UNTAGGED");
        resolution.NewReviewState.Should().Be("NONE");
        resolution.Reason.Should().Contain("overhead");
        resolution.PriorMappingJson.Should().NotBeNull();
    }
}
