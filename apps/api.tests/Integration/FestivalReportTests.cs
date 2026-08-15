using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models.Enums;
using Xunit;
using static SplitRail.Api.Tests.Integration.FestivalQboBoundaryTests;
using static SplitRail.Api.Tests.Integration.FestivalStructureTests;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

public class FestivalReportTests : IntegrationTestBase
{
    [Fact]
    public async Task PnlDayAndStageReports_ReturnExpectedShapes()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Tickets", 10_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Headliner", "20:00", "22:00", requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 50m);

        var pnl = await client.GetFromJsonAsync<FestivalPnlReportResponse>(ReportPath(venueId, festival.EventId, "pnl"));
        pnl!.Revenue.Should().NotBeEmpty();
        pnl.Drill.BlockIds.Should().Contain(block.Id);
        pnl.Drill.DayDates.Should().NotBeEmpty();

        var days = await client.GetFromJsonAsync<FestivalDayReportResponse>(ReportPath(venueId, festival.EventId, "days"));
        days!.Days.Should().HaveCount(3);
        days.Days.First(d => d.DayDate == "2026-08-14").BlockIds.Should().Contain(block.Id);

        var stages = await client.GetFromJsonAsync<FestivalStageReportResponse>(ReportPath(venueId, festival.EventId, "stages"));
        stages!.Stages.Should().ContainSingle();
        stages.Stages[0].BlockIds.Should().Contain(block.Id);
    }

    [Fact]
    public async Task SettlementStatusReport_CountsByStatusAndLogs()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Canceled", "18:00", "19:00");

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/blocks/{block.Id}/status",
            new SetBlockStatusRequest("CANCELED", "Weather delay"));

        var report = await client.GetFromJsonAsync<FestivalSettlementStatusReportResponse>(
            ReportPath(venueId, festival.EventId, "settlement-status"));

        report!.ByStatus.Should().NotBeEmpty();
        report.CanceledLog.Should().NotBeEmpty();
    }

    [Fact]
    public async Task UnreconciledReport_DistinguishesAllocationStates()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-UNREC", 500m);

        var report = await client.GetFromJsonAsync<FestivalUnreconciledReportResponse>(
            ReportPath(venueId, festival.EventId, "unreconciled"));

        report!.Transactions.Should().ContainSingle();
        report.Transactions[0].AllocationState.Should().Be("Unallocated");
        report.Totals.Unreconciled.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task AggregateRows_CarryDrillDownIdsAndSupportCategorySegmentation()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Band", "20:00", "21:00");
        await CreateBlockAsync(client, venueId, festival, "Vendor", "10:00", "18:00", category: "VENDOR");

        var variance = await client.GetFromJsonAsync<FestivalVarianceReportResponse>(
            $"{ReportPath(venueId, festival.EventId, "variance")}?category=MUSIC");

        variance!.Rows.Should().NotBeEmpty();
        variance.Rows.All(r => r.BlockIds.Count > 0).Should().BeTrue();

        (await client.GetAsync($"{ReportPath(venueId, festival.EventId, "days")}?category=VENDOR"))
            .StatusCode.Should().Be(HttpStatusCode.OK);
    }

    internal static string ReportPath(Guid venueId, Guid eventId, string layer) =>
        $"/api/venues/{venueId}/festivals/{eventId}/reports/{layer}";
}
