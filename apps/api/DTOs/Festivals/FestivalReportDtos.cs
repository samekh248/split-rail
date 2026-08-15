namespace SplitRail.Api.DTOs.Festivals;

public record FestivalReportDrillDto(
    IReadOnlyList<string> DayDates,
    IReadOnlyList<Guid> StageIds,
    IReadOnlyList<Guid> BlockIds,
    IReadOnlyList<Guid> TransactionIds);

public record FestivalPnlRevenueRowDto(
    string Label,
    decimal Amount,
    decimal Allocated,
    decimal Retained,
    Guid? BucketId);

public record FestivalPnlExpenseRowDto(
    string Label,
    decimal Amount,
    decimal AtOverhead,
    decimal PushedDown,
    Guid? SourceId);

public record FestivalPnlReportResponse(
    IReadOnlyList<FestivalPnlRevenueRowDto> Revenue,
    IReadOnlyList<FestivalPnlExpenseRowDto> Expenses,
    decimal Net,
    FestivalReportDrillDto Drill);

public record FestivalDayReportRowDto(
    string DayDate,
    decimal RevenueAllocatedToDay,
    decimal ExpensesAllocatedToDay,
    IReadOnlyDictionary<string, int> BlockCountsByStatus,
    IReadOnlyDictionary<string, int> BlockCountsByCategory,
    IReadOnlyDictionary<string, int> SettlementCounts,
    IReadOnlyList<Guid> BlockIds);

public record FestivalDayReportResponse(IReadOnlyList<FestivalDayReportRowDto> Days);

public record FestivalStageReportRowDto(
    Guid StageId,
    string StageName,
    decimal RevenueAllocatedToStage,
    decimal ExpensesAllocatedToStage,
    IReadOnlyDictionary<string, int> BlockCountsByStatus,
    IReadOnlyDictionary<string, int> BlockCountsByCategory,
    IReadOnlyDictionary<string, int> SettlementCounts,
    IReadOnlyList<Guid> BlockIds);

public record FestivalStageReportResponse(IReadOnlyList<FestivalStageReportRowDto> Stages);

public record FestivalSettlementStatusRowDto(
    string ScheduleStatus,
    string SettlementStatus,
    int Count,
    IReadOnlyList<Guid> BlockIds);

public record FestivalAuditLogEntryDto(
    Guid BlockId,
    string BlockTitle,
    string Action,
    DateTimeOffset OccurredAt,
    string? Reason);

public record FestivalSettlementStatusReportResponse(
    IReadOnlyList<FestivalSettlementStatusRowDto> ByStatus,
    IReadOnlyList<FestivalAuditLogEntryDto> CanceledLog,
    IReadOnlyList<FestivalAuditLogEntryDto> MovedLog,
    IReadOnlyList<FestivalAuditLogEntryDto> PartialCompletionExceptions,
    int VarianceScheduledVsCompleted);

public record FestivalUnreconciledTransactionRowDto(
    Guid TxId,
    string ReviewState,
    string AllocationState,
    decimal RemainingAtOverhead,
    decimal SourceAmount,
    decimal TotalAllocated);

public record FestivalUnreconciledTotalsDto(
    decimal Unreconciled,
    decimal Partial,
    decimal Full,
    decimal Overhead,
    decimal PushedDown);

public record FestivalUnreconciledReportResponse(
    IReadOnlyList<FestivalUnreconciledTransactionRowDto> Transactions,
    FestivalUnreconciledTotalsDto Totals);

public record FestivalVarianceRowDto(
    string Dimension,
    string? DayDate,
    Guid? StageId,
    string? Category,
    int Scheduled,
    int Completed,
    decimal Allocated,
    decimal Settled,
    decimal Variance,
    IReadOnlyList<Guid> BlockIds,
    IReadOnlyList<Guid> TransactionIds);

public record FestivalVarianceReportResponse(IReadOnlyList<FestivalVarianceRowDto> Rows);
