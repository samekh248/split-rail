using FluentAssertions;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboPayloadFilterTests
{
    private readonly QboPayloadFilter _filter = new();

    [Fact]
    public void Apply_SyncStatus_WhenDisconnected_OmitsCounts()
    {
        var status = new SyncStatusDto(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            Guid.NewGuid(),
            12,
            3,
            false);

        var filtered = _filter.Apply(status);

        filtered.QboConnected.Should().BeFalse();
        filtered.TotalMappedTransactions.Should().BeNull();
        filtered.TotalUnmappedTransactions.Should().BeNull();
        filtered.LastSyncedAt.Should().BeNull();
        filtered.LastSyncBatchId.Should().BeNull();
    }

    [Fact]
    public void Apply_Ledger_WhenDisconnected_OmitsQboFields()
    {
        var row = new LineItemDto(
            Guid.NewGuid(),
            "Production",
            1,
            false,
            100m,
            90m,
            false,
            null,
            false,
            "rv",
            80m,
            -10m,
            true);

        var block = new LedgerBlockDto(
            "EXPENSE",
            [row],
            new BlockTotalsDto(100m, 90m, 80m));

        var ledger = new LedgerGridResponse(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Show",
            "2026-06-26",
            "PRE_SHOW",
            false,
            "Show-1",
            new EditabilityDto("editable", "editable", "editable"),
            [block],
            [],
            new LedgerSummaryDto(0m, 0m, 0m));

        var filtered = _filter.Apply(ledger, qboConnected: false);

        filtered.Blocks[0].Rows[0].QboActualValue.Should().BeNull();
        filtered.Blocks[0].Rows[0].Variance.Should().BeNull();
        filtered.Blocks[0].Rows[0].HasQboCorrection.Should().BeNull();
        filtered.Blocks[0].BlockTotals.QboActual.Should().BeNull();
    }

    [Fact]
    public void Apply_Dashboard_WhenDisconnected_OmitsFinancialHealthQboSeries()
    {
        var dashboard = new DashboardResponse(
            Guid.NewGuid(),
            [],
            [],
            [],
            [],
            new ActionCenterDto(0, []),
            new FinancialHealthDto("2026-06-01", "2026-06-07", 1000m, 900m, -100m));

        var filtered = _filter.Apply(dashboard, qboConnected: false);

        filtered.FinancialHealth.ActualQboDeposits.Should().BeNull();
        filtered.FinancialHealth.Variance.Should().BeNull();
        filtered.FinancialHealth.ProjectedNetGross.Should().Be(1000m);
    }
}
