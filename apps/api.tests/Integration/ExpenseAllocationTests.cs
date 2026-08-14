using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Shared expenses use explicit, rule-based allocation; the unallocated remainder is
/// festival overhead and stays visible rather than erroring (spec FR-023).
/// </summary>
public class ExpenseAllocationTests : IntegrationTestBase
{
    [Fact]
    public async Task PercentageSplit_ComputesAmountAndLeavesRemainderAtOverhead()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 10_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "PERCENTAGE",
                SourceLineItemId: lineItemId,
                TargetBlockId: block.Id,
                Percentage: 25m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var allocation = await response.Content.ReadFromJsonAsync<ExpenseAllocationResponse>();
        allocation!.CalculatedAmount.Should().Be(2_500m);

        var summary = await GetSummaryAsync(client, venueId, festival.EventId, lineItemId);
        summary.TotalAllocated.Should().Be(2_500m);
        summary.RemainingAtOverhead.Should().Be(7_500m,
            "the unallocated remainder is festival overhead, not an error");
    }

    [Fact]
    public async Task FixedAmountSplitsAcrossTargets_Reconcile()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 9_000m);

        var blockA = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00");
        var blockB = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00");

        await PostSplitAsync(client, venueId, festival.EventId, lineItemId, blockA.Id, 3_000m);
        await PostSplitAsync(client, venueId, festival.EventId, lineItemId, blockB.Id, 6_000m);

        var summary = await GetSummaryAsync(client, venueId, festival.EventId, lineItemId);
        summary.TotalAllocated.Should().Be(9_000m);
        summary.RemainingAtOverhead.Should().Be(0m, "the split fully reconciles to the source");
        summary.Allocations.Should().HaveCount(2);
    }

    [Fact]
    public async Task SplitsExceedingTheSourceAmount_AreRejected()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 1_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await PostSplitAsync(client, venueId, festival.EventId, lineItemId, block.Id, 800m);

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT",
                SourceLineItemId: lineItemId, TargetBlockId: block.Id, Amount: 500m));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("exceed the source amount");
    }

    [Fact]
    public async Task OverheadTarget_IsAValidFinalState()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 4_000m);

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "OVERHEAD", "FIXED_AMOUNT", SourceLineItemId: lineItemId, Amount: 4_000m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var allocation = await response.Content.ReadFromJsonAsync<ExpenseAllocationResponse>();
        allocation!.TargetType.Should().Be("OVERHEAD");
    }

    [Fact]
    public async Task DaySplit_ValidatesTheDayIsInRange()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, startDate: "2026-08-14", endDate: "2026-08-16");
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 3_000m);

        var valid = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "DAY", "FIXED_AMOUNT",
                SourceLineItemId: lineItemId, TargetDayDate: "2026-08-15", Amount: 1_000m));
        valid.StatusCode.Should().Be(HttpStatusCode.Created);

        var invalid = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "DAY", "FIXED_AMOUNT",
                SourceLineItemId: lineItemId, TargetDayDate: "2026-09-01", Amount: 500m));
        invalid.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await invalid.Content.ReadAsStringAsync()).Should().Contain("outside the festival range");
    }

    [Fact]
    public async Task StageSplit_ValidatesTheStageBelongsToTheFestival()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var first = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "First", "2026-08-14", "2026-08-15");
        var second = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "Second", "2026-09-14", "2026-09-15");
        var lineItemId = await SeedLineItemDirectAsync(
            token, first.EventId, blockType: "EXPENSES", proformaValue: 2_000m);

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, first.EventId),
            new CreateExpenseAllocationRequest(
                "STAGE", "FIXED_AMOUNT",
                SourceLineItemId: lineItemId,
                TargetStageZoneId: second.Stages[0].Id,
                Amount: 500m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("not part of this festival");
    }

    [Fact]
    public async Task ExactlyOneSource_IsRequired()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest("OVERHEAD", "FIXED_AMOUNT", Amount: 100m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("exactly one source");
    }

    [Fact]
    public async Task EqualSplit_DividesSourceEvenlyAcrossTargets()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 1_000m);
        var blockA = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00");
        var blockB = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "EQUAL",
                SourceLineItemId: lineItemId,
                Targets:
                [
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockA.Id),
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockB.Id),
                ]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var summary = await GetSummaryAsync(client, venueId, festival.EventId, lineItemId);
        summary.TotalAllocated.Should().Be(1_000m);
        summary.Allocations.Should().HaveCount(2);
        summary.Allocations.Select(a => a.CalculatedAmount).Should().Equal(500m, 500m);
    }

    [Fact]
    public async Task ManualLineSplit_ReconcilesAcrossMultipleTargets()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 6_000m);
        var blockA = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00");
        var blockB = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "MANUAL_LINE",
                SourceLineItemId: lineItemId,
                Targets:
                [
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockA.Id, Amount: 2_000m),
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockB.Id, Amount: 3_500m),
                ]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var summary = await GetSummaryAsync(client, venueId, festival.EventId, lineItemId);
        summary.TotalAllocated.Should().Be(5_500m);
        summary.RemainingAtOverhead.Should().Be(500m);
    }

    [Fact]
    public async Task PercentageMultiTarget_ReconcilesWithPennyRemainder()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 100m);
        var blockA = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00");
        var blockB = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00");
        var blockC = await CreateBlockAsync(client, venueId, festival, "Act C", "21:00", "22:00");

        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "PERCENTAGE",
                SourceLineItemId: lineItemId,
                Targets:
                [
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockA.Id, Percentage: 33.33m),
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockB.Id, Percentage: 33.33m),
                    new ExpenseAllocationTargetRequest("BLOCK", TargetBlockId: blockC.Id, Percentage: 33.34m),
                ]));

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var summary = await GetSummaryAsync(client, venueId, festival.EventId, lineItemId);
        summary.TotalAllocated.Should().Be(100m);
        summary.Allocations.Sum(a => a.CalculatedAmount).Should().Be(100m);
    }

    [Fact]
    public async Task UnknownMethodOrTarget_IsRejected()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token, festival.EventId, blockType: "EXPENSES", proformaValue: 1_000m);

        var badMethod = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "OVERHEAD", "MAGIC", SourceLineItemId: lineItemId, Amount: 100m));
        badMethod.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var badTarget = await client.PostAsJsonAsync(
            ExpensePath(venueId, festival.EventId),
            new CreateExpenseAllocationRequest(
                "GALAXY", "FIXED_AMOUNT", SourceLineItemId: lineItemId, Amount: 100m));
        badTarget.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ---- helpers ---------------------------------------------------------

    internal static string ExpensePath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/expense-allocations";

    private static async Task PostSplitAsync(
        HttpClient client, Guid venueId, Guid eventId, Guid lineItemId, Guid blockId, decimal amount)
    {
        var response = await client.PostAsJsonAsync(
            ExpensePath(venueId, eventId),
            new CreateExpenseAllocationRequest(
                "BLOCK", "FIXED_AMOUNT",
                SourceLineItemId: lineItemId, TargetBlockId: blockId, Amount: amount));
        response.EnsureSuccessStatusCode();
    }

    private static async Task<ExpenseSourceSummaryResponse> GetSummaryAsync(
        HttpClient client, Guid venueId, Guid eventId, Guid lineItemId)
    {
        var response = await client.GetAsync(
            $"{ExpensePath(venueId, eventId)}/summary?sourceLineItemId={lineItemId}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ExpenseSourceSummaryResponse>())!;
    }
}
