using FluentAssertions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class DashboardFinancialHealthHelperTests
{
    [Fact]
    public void GetCalendarWeek_ReturnsMondayThroughSunday()
    {
        var wednesday = new DateOnly(2026, 6, 17);
        var (weekStart, weekEnd) = DashboardFinancialHealthHelper.GetCalendarWeek(wednesday);

        weekStart.DayOfWeek.Should().Be(DayOfWeek.Monday);
        weekEnd.DayOfWeek.Should().Be(DayOfWeek.Sunday);
        weekStart.Should().Be(new DateOnly(2026, 6, 15));
        weekEnd.Should().Be(new DateOnly(2026, 6, 21));
        (weekEnd.DayNumber - weekStart.DayNumber).Should().Be(6);
    }

    [Fact]
    public void ComputeProjectedNetShowRevenue_StatusBasedColumnSelection()
    {
        var preShow = CreateEvent(EventStatus.PreShow, isBudgetLocked: false,
            revenueProforma: 1000m, revenueSettlement: 2000m,
            deductionProforma: 100m, deductionSettlement: 200m);
        DashboardFinancialHealthHelper.ComputeProjectedNetShowRevenue(preShow).Should().Be(900m);

        var lockedPreShow = CreateEvent(EventStatus.PreShow, isBudgetLocked: true,
            revenueProforma: 1000m, revenueSettlement: 5000m,
            deductionProforma: 0m, deductionSettlement: 0m);
        DashboardFinancialHealthHelper.ComputeProjectedNetShowRevenue(lockedPreShow).Should().Be(1000m);

        var settled = CreateEvent(EventStatus.Settled, isBudgetLocked: true,
            revenueProforma: 1000m, revenueSettlement: 3000m,
            deductionProforma: 100m, deductionSettlement: 500m);
        DashboardFinancialHealthHelper.ComputeProjectedNetShowRevenue(settled).Should().Be(2500m);

        var reconciled = CreateEvent(EventStatus.Reconciled, isBudgetLocked: true,
            revenueProforma: 1000m, revenueSettlement: 4000m,
            deductionProforma: 0m, deductionSettlement: 0m);
        DashboardFinancialHealthHelper.ComputeProjectedNetShowRevenue(reconciled).Should().Be(4000m);
    }

    [Fact]
    public void ComputeRevenueQboActualTotal_ExcludesExpenseBlock()
    {
        var evt = CreateEvent(EventStatus.PreShow, isBudgetLocked: false,
            revenueProforma: 0m, revenueSettlement: 0m,
            deductionProforma: 0m, deductionSettlement: 0m);
        evt.LineItems.Add(new FinancialLineItem
        {
            BlockType = BlockType.Revenue.ToStorage(),
            RowLabel = "Tickets",
            QboActualValue = 5000m
        });
        evt.LineItems.Add(new FinancialLineItem
        {
            BlockType = BlockType.Expenses.ToStorage(),
            RowLabel = "Production",
            QboActualValue = 200m,
            IsArtistDeduction = true
        });

        DashboardFinancialHealthHelper.ComputeRevenueQboActualTotal(evt).Should().Be(5000m);
    }

    [Fact]
    public void BuildFinancialHealthDto_FiltersToInWeekEventsOnly()
    {
        var today = new DateOnly(2026, 6, 18);
        var (weekStart, _) = DashboardFinancialHealthHelper.GetCalendarWeek(today);

        var inWeek = CreateEvent(EventStatus.PreShow, isBudgetLocked: false,
            revenueProforma: 1000m, revenueSettlement: 0m,
            deductionProforma: 0m, deductionSettlement: 0m);
        inWeek.EventDate = weekStart;

        var outOfWeek = CreateEvent(EventStatus.PreShow, isBudgetLocked: false,
            revenueProforma: 9999m, revenueSettlement: 0m,
            deductionProforma: 0m, deductionSettlement: 0m);
        outOfWeek.EventDate = weekStart.AddDays(-1);

        var dto = DashboardFinancialHealthHelper.BuildFinancialHealthDto(
            [inWeek, outOfWeek], today);

        dto.ProjectedNetGross.Should().Be(1000m);
        dto.Variance.Should().Be(1000m);
    }

    private static Event CreateEvent(
        EventStatus status,
        bool isBudgetLocked,
        decimal revenueProforma,
        decimal revenueSettlement,
        decimal deductionProforma,
        decimal deductionSettlement)
    {
        var evt = new Event
        {
            Id = Guid.NewGuid(),
            VenueId = Guid.NewGuid(),
            Title = "Test",
            EventDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = status,
            IsBudgetLocked = isBudgetLocked,
            LineItems = []
        };

        evt.LineItems.Add(new FinancialLineItem
        {
            BlockType = BlockType.Revenue.ToStorage(),
            RowLabel = "Revenue",
            ProformaValue = revenueProforma,
            SettlementValue = revenueSettlement
        });

        if (deductionProforma > 0 || deductionSettlement > 0)
        {
            evt.LineItems.Add(new FinancialLineItem
            {
                BlockType = BlockType.Expenses.ToStorage(),
                RowLabel = "Deduction",
                IsArtistDeduction = true,
                ProformaValue = deductionProforma,
                SettlementValue = deductionSettlement
            });
        }

        return evt;
    }
}
