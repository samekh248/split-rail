using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public static class DashboardFinancialHealthHelper
{
    public static (DateOnly WeekStart, DateOnly WeekEnd) GetCalendarWeek(DateOnly today)
    {
        var daysFromMonday = ((int)today.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        var weekStart = today.AddDays(-daysFromMonday);
        var weekEnd = weekStart.AddDays(6);
        return (weekStart, weekEnd);
    }

    public static decimal ComputeProjectedNetShowRevenue(Event evt)
    {
        var useSettlement = evt.Status is EventStatus.Settled or EventStatus.Reconciled;
        decimal ActiveValue(FinancialLineItem li) => useSettlement ? li.SettlementValue : li.ProformaValue;

        var grossRevenue = evt.LineItems
            .Where(li => li.BlockType == BlockType.Revenue.ToStorage())
            .Sum(ActiveValue);

        var totalDeductions = evt.LineItems
            .Where(li => li.IsArtistDeduction)
            .Sum(ActiveValue);

        return grossRevenue - totalDeductions;
    }

    public static decimal ComputeRevenueQboActualTotal(Event evt) =>
        evt.LineItems
            .Where(li => li.BlockType == BlockType.Revenue.ToStorage())
            .Sum(li => li.QboActualValue);

    public static FinancialHealthDto BuildFinancialHealthDto(
        IReadOnlyList<Event> venueEvents,
        DateOnly today)
    {
        var (weekStart, weekEnd) = GetCalendarWeek(today);
        var inWeekEvents = venueEvents
            .Where(e => e.EventDate >= weekStart && e.EventDate <= weekEnd)
            .ToList();

        var projected = inWeekEvents.Sum(ComputeProjectedNetShowRevenue);
        var actual = inWeekEvents.Sum(ComputeRevenueQboActualTotal);
        var variance = projected - actual;

        return new FinancialHealthDto(
            weekStart.ToString("yyyy-MM-dd"),
            weekEnd.ToString("yyyy-MM-dd"),
            projected,
            actual,
            variance);
    }
}
