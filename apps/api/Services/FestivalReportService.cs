using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Single-query aggregate projections for festival reporting layers (research.md D14).
/// </summary>
public class FestivalReportService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAuditService _audit;

    public FestivalReportService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAuditService audit)
    {
        _db = db;
        _guard = guard;
        _audit = audit;
    }

    public async Task<FestivalPnlReportResponse> GetPnlAsync(
        Guid venueId,
        Guid eventId,
        string? category,
        CancellationToken cancellationToken = default)
    {
        await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var revenueRows = await _db.RevenueBuckets
            .AsNoTracking()
            .Where(b => b.EventId == eventId)
            .Select(b => new FestivalPnlRevenueRowDto(
                b.Name,
                b.Amount,
                b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m,
                b.Amount - (b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m),
                b.Id))
            .ToListAsync(cancellationToken);

        var expenseQuery = _db.ExpenseAllocations.AsNoTracking().Where(a => a.EventId == eventId);
        if (TryParseCategory(category, out var parsedCategory))
        {
            expenseQuery = expenseQuery.Where(a =>
                a.TargetBlock != null && a.TargetBlock.Category == parsedCategory);
        }

        var expenseGroups = await expenseQuery
            .GroupBy(a => a.SourceLineItemId ?? a.SourceQboTransactionId ?? Guid.Empty)
            .Select(g => new
            {
                SourceId = g.Key,
                Label = g.First().SourceLineItem != null
                    ? g.First().SourceLineItem!.RowLabel
                    : g.First().SourceQboTransaction != null
                        ? g.First().SourceQboTransaction!.QboAccountName
                        : "Unknown",
                SourceAmount = g.First().SourceLineItem != null
                    ? Math.Abs(g.First().SourceLineItem!.ProformaValue)
                    : g.First().SourceQboTransaction != null
                        ? Math.Abs(g.First().SourceQboTransaction!.Amount)
                        : 0m,
                Allocated = g.Sum(x => x.CalculatedAmount),
                Overhead = g.Where(x => x.TargetType == AllocationTargetType.Overhead)
                    .Sum(x => (decimal?)x.CalculatedAmount) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var expenseRows = expenseGroups.Select(g => new FestivalPnlExpenseRowDto(
            g.Label,
            g.SourceAmount,
            g.Overhead + Math.Max(0m, g.SourceAmount - g.Allocated),
            g.Allocated - g.Overhead,
            g.SourceId == Guid.Empty ? null : g.SourceId)).ToList();

        var net = revenueRows.Sum(r => r.Amount) - expenseRows.Sum(e => e.Amount);
        var dayDates = await _db.ProgrammingBlocks.AsNoTracking()
            .Where(b => b.EventId == eventId)
            .Select(b => b.DayDate.ToString("yyyy-MM-dd"))
            .Distinct()
            .ToListAsync(cancellationToken);
        var stageIds = await _db.StageZones.AsNoTracking()
            .Where(s => s.EventId == eventId)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);
        var blockIds = await _db.ProgrammingBlocks.AsNoTracking()
            .Where(b => b.EventId == eventId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);
        var txIds = await _db.UnmappedQboTransactions.AsNoTracking()
            .Where(t => t.EventId == eventId)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        return new FestivalPnlReportResponse(
            revenueRows,
            expenseRows,
            net,
            new FestivalReportDrillDto(dayDates, stageIds, blockIds, txIds));
    }

    public async Task<FestivalDayReportResponse> GetDaysAsync(
        Guid venueId,
        Guid eventId,
        string? category,
        string? status,
        CancellationToken cancellationToken = default)
    {
        var festival = await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var blockQuery = _db.ProgrammingBlocks.AsNoTracking().Where(b => b.EventId == eventId);
        if (TryParseCategory(category, out var parsedCategory))
            blockQuery = blockQuery.Where(b => b.Category == parsedCategory);
        if (TryParseScheduleStatus(status, out var parsedStatus))
            blockQuery = blockQuery.Where(b => b.ScheduleStatus == parsedStatus);

        var blocks = await blockQuery.ToListAsync(cancellationToken);
        var expenseByDay = await _db.ExpenseAllocations.AsNoTracking()
            .Where(a => a.EventId == eventId && a.TargetDayDate != null)
            .GroupBy(a => a.TargetDayDate!.Value)
            .Select(g => new { Day = g.Key, Total = g.Sum(x => x.CalculatedAmount) })
            .ToDictionaryAsync(x => x.Day, x => x.Total, cancellationToken);

        var revenueByDay = await _db.RevenueAllocations.AsNoTracking()
            .Where(a => a.ProgrammingBlock.EventId == eventId)
            .GroupBy(a => a.ProgrammingBlock.DayDate)
            .Select(g => new { Day = g.Key, Total = g.Sum(x => x.CalculatedAmount) })
            .ToDictionaryAsync(x => x.Day, x => x.Total, cancellationToken);

        var rows = festival.FestivalDays().Select(day =>
        {
            var dayBlocks = blocks.Where(b => b.DayDate == day).ToList();
            return new FestivalDayReportRowDto(
                day.ToString("yyyy-MM-dd"),
                revenueByDay.GetValueOrDefault(day),
                expenseByDay.GetValueOrDefault(day),
                dayBlocks.GroupBy(b => BlockScheduleStatusFormat.ToApiString(b.ScheduleStatus))
                    .ToDictionary(g => g.Key, g => g.Count()),
                dayBlocks.GroupBy(b => BlockCategoryFormat.ToApiString(b.Category))
                    .ToDictionary(g => g.Key, g => g.Count()),
                dayBlocks.GroupBy(b => BlockSettlementStatusFormat.ToApiString(b.SettlementStatus))
                    .ToDictionary(g => g.Key, g => g.Count()),
                dayBlocks.Select(b => b.Id).ToList());
        }).ToList();

        return new FestivalDayReportResponse(rows);
    }

    public async Task<FestivalStageReportResponse> GetStagesAsync(
        Guid venueId,
        Guid eventId,
        string? category,
        string? status,
        CancellationToken cancellationToken = default)
    {
        await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var blockQuery = _db.ProgrammingBlocks.AsNoTracking().Where(b => b.EventId == eventId);
        if (TryParseCategory(category, out var parsedCategory))
            blockQuery = blockQuery.Where(b => b.Category == parsedCategory);
        if (TryParseScheduleStatus(status, out var parsedStatus))
            blockQuery = blockQuery.Where(b => b.ScheduleStatus == parsedStatus);

        var blocks = await blockQuery.Include(b => b.StageZone).ToListAsync(cancellationToken);
        var expenseByStage = await _db.ExpenseAllocations.AsNoTracking()
            .Where(a => a.EventId == eventId && a.TargetStageZoneId != null)
            .GroupBy(a => a.TargetStageZoneId!.Value)
            .Select(g => new { StageId = g.Key, Total = g.Sum(x => x.CalculatedAmount) })
            .ToDictionaryAsync(x => x.StageId, x => x.Total, cancellationToken);

        var revenueByStage = await _db.RevenueAllocations.AsNoTracking()
            .Where(a => a.ProgrammingBlock.EventId == eventId)
            .GroupBy(a => a.ProgrammingBlock.StageZoneId)
            .Select(g => new { StageId = g.Key, Total = g.Sum(x => x.CalculatedAmount) })
            .ToDictionaryAsync(x => x.StageId, x => x.Total, cancellationToken);

        var rows = blocks
            .GroupBy(b => b.StageZone)
            .Select(g => new FestivalStageReportRowDto(
                g.Key.Id,
                g.Key.Name,
                revenueByStage.GetValueOrDefault(g.Key.Id),
                expenseByStage.GetValueOrDefault(g.Key.Id),
                g.GroupBy(b => BlockScheduleStatusFormat.ToApiString(b.ScheduleStatus))
                    .ToDictionary(x => x.Key, x => x.Count()),
                g.GroupBy(b => BlockCategoryFormat.ToApiString(b.Category))
                    .ToDictionary(x => x.Key, x => x.Count()),
                g.GroupBy(b => BlockSettlementStatusFormat.ToApiString(b.SettlementStatus))
                    .ToDictionary(x => x.Key, x => x.Count()),
                g.Select(b => b.Id).ToList()))
            .OrderBy(r => r.StageName)
            .ToList();

        return new FestivalStageReportResponse(rows);
    }

    public async Task<FestivalSettlementStatusReportResponse> GetSettlementStatusAsync(
        Guid venueId,
        Guid eventId,
        string? category,
        CancellationToken cancellationToken = default)
    {
        await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var blockQuery = _db.ProgrammingBlocks.AsNoTracking().Where(b => b.EventId == eventId);
        if (TryParseCategory(category, out var parsedCategory))
            blockQuery = blockQuery.Where(b => b.Category == parsedCategory);

        var blocks = await blockQuery.ToListAsync(cancellationToken);

        var byStatus = blocks
            .GroupBy(b => new
            {
                Schedule = BlockScheduleStatusFormat.ToApiString(b.ScheduleStatus),
                Settlement = BlockSettlementStatusFormat.ToApiString(b.SettlementStatus)
            })
            .Select(g => new FestivalSettlementStatusRowDto(
                g.Key.Schedule,
                g.Key.Settlement,
                g.Count(),
                g.Select(b => b.Id).ToList()))
            .ToList();

        var auditEntries = await _db.FestivalAuditEntries.AsNoTracking()
            .Where(e => e.EventId == eventId && e.EntityType == FestivalAuditEntityTypes.ProgrammingBlock)
            .OrderByDescending(e => e.OccurredAt)
            .ToListAsync(cancellationToken);

        var blockTitles = blocks.ToDictionary(b => b.Id, b => b.Title);

        FestivalAuditLogEntryDto MapAudit(FestivalAuditEntry entry) =>
            new(entry.EntityId,
                blockTitles.GetValueOrDefault(entry.EntityId, "Unknown"),
                entry.Action,
                entry.OccurredAt,
                entry.Reason);

        var canceledLog = auditEntries
            .Where(e => e.Action == FestivalAuditActions.StatusChange
                        && (e.NewValueJson?.Contains("Canceled", StringComparison.OrdinalIgnoreCase) ?? false))
            .Select(MapAudit)
            .ToList();

        var movedLog = auditEntries
            .Where(e => e.Action is FestivalAuditActions.Moved or FestivalAuditActions.Reschedule)
            .Select(MapAudit)
            .ToList();

        var partialExceptions = blocks
            .Where(b => b.ScheduleStatus == BlockScheduleStatus.PartiallyCompleted)
            .Select(b => new FestivalAuditLogEntryDto(
                b.Id, b.Title, "PartiallyCompleted", b.CreatedAt, null))
            .ToList();

        var variance = blocks.Count(b => b.ScheduleStatus == BlockScheduleStatus.Scheduled)
                       - blocks.Count(b => b.ScheduleStatus == BlockScheduleStatus.PartiallyCompleted
                                           || b.SettlementStatus == BlockSettlementStatus.Finalized);

        return new FestivalSettlementStatusReportResponse(
            byStatus, canceledLog, movedLog, partialExceptions, variance);
    }

    public async Task<FestivalUnreconciledReportResponse> GetUnreconciledAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var transactions = await _db.UnmappedQboTransactions.AsNoTracking()
            .Where(t => t.EventId == eventId)
            .ToListAsync(cancellationToken);

        var allocations = await _db.ExpenseAllocations.AsNoTracking()
            .Where(a => a.EventId == eventId && a.SourceQboTransactionId != null)
            .ToListAsync(cancellationToken);

        var rows = transactions.Select(t =>
        {
            var txAllocations = allocations.Where(a => a.SourceQboTransactionId == t.Id).ToList();
            var sourceAmount = Math.Abs(t.Amount);
            var totalAllocated = txAllocations.Sum(a => a.CalculatedAmount);
            var remaining = sourceAmount - totalAllocated;
            var state = totalAllocated == 0m ? "Unallocated"
                : txAllocations.All(a => a.TargetType == AllocationTargetType.Overhead) ? "Overhead"
                : totalAllocated >= sourceAmount ? "Full"
                : "Partial";

            return new FestivalUnreconciledTransactionRowDto(
                t.Id,
                QboReviewStateFormat.ToApiString(t.ReviewState),
                state,
                remaining,
                sourceAmount,
                totalAllocated);
        }).ToList();

        var totals = new FestivalUnreconciledTotalsDto(
            rows.Count(r => r.AllocationState == "Unallocated"),
            rows.Count(r => r.AllocationState == "Partial"),
            rows.Count(r => r.AllocationState == "Full"),
            rows.Count(r => r.AllocationState == "Overhead"),
            allocations.Where(a => a.CountsTowardSettlement).Sum(a => a.CalculatedAmount));

        return new FestivalUnreconciledReportResponse(rows, totals);
    }

    public async Task<FestivalVarianceReportResponse> GetVarianceAsync(
        Guid venueId,
        Guid eventId,
        string? category,
        string? status,
        CancellationToken cancellationToken = default)
    {
        await PrepareReportReadAsync(venueId, eventId, cancellationToken);

        var query = _db.ProgrammingBlocks.AsNoTracking().Where(b => b.EventId == eventId);
        if (TryParseCategory(category, out var parsedCategory))
            query = query.Where(b => b.Category == parsedCategory);
        if (TryParseScheduleStatus(status, out var parsedStatus))
            query = query.Where(b => b.ScheduleStatus == parsedStatus);

        var blocks = await query
            .Include(b => b.StageZone)
            .Include(b => b.RevenueAllocations)
            .ToListAsync(cancellationToken);

        var rows = blocks
            .GroupBy(b => new { b.DayDate, b.StageZoneId, b.Category })
            .Select(g =>
            {
                var scheduled = g.Count(b => b.ScheduleStatus == BlockScheduleStatus.Scheduled);
                var completed = g.Count(b =>
                    b.ScheduleStatus == BlockScheduleStatus.PartiallyCompleted
                    || b.SettlementStatus == BlockSettlementStatus.Finalized);
                var allocated = g.SelectMany(b => b.RevenueAllocations).Sum(a => a.CalculatedAmount);
                var settled = g.Where(b => b.SettlementStatus == BlockSettlementStatus.Finalized)
                    .Sum(b => b.CalculatedNetPayout);

                return new FestivalVarianceRowDto(
                    $"{g.Key.DayDate:yyyy-MM-dd} · {g.First().StageZone.Name} · {BlockCategoryFormat.ToApiString(g.Key.Category)}",
                    g.Key.DayDate.ToString("yyyy-MM-dd"),
                    g.Key.StageZoneId,
                    BlockCategoryFormat.ToApiString(g.Key.Category),
                    scheduled,
                    completed,
                    allocated,
                    settled,
                    allocated - settled,
                    g.Select(b => b.Id).ToList(),
                    []);
            })
            .ToList();

        return new FestivalVarianceReportResponse(rows);
    }

    private async Task<Models.Event> PrepareReportReadAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        _audit.Record(eventId, FestivalAuditEntityTypes.MasterLedger, eventId,
            FestivalAuditActions.LedgerViewed);
        await _db.SaveChangesAsync(cancellationToken);
        return festival;
    }

    private static bool TryParseCategory(string? value, out BlockCategory category)
    {
        category = BlockCategory.Music;
        return !string.IsNullOrWhiteSpace(value) && BlockCategoryFormat.TryFromApiString(value, out category);
    }

    private static bool TryParseScheduleStatus(string? value, out BlockScheduleStatus status)
    {
        status = BlockScheduleStatus.Scheduled;
        return !string.IsNullOrWhiteSpace(value) && BlockScheduleStatusFormat.TryFromApiString(value, out status);
    }
}
