namespace SplitRail.Api.DTOs.Festivals;

public record CreateRevenueBucketRequest(
    string Name,
    decimal Amount,
    bool IsAllocable = false,
    Guid? LinkedLineItemId = null);

public record UpdateRevenueBucketRequest(
    string Name,
    decimal Amount,
    bool IsAllocable,
    Guid? LinkedLineItemId = null);

/// <summary>
/// Balances are live SUM projections, never stored — over-allocation must be visible the
/// moment it happens (research.md D8).
/// </summary>
public record RevenueBucketResponse(
    Guid Id,
    string Name,
    bool IsAllocable,
    decimal Amount,
    Guid? LinkedLineItemId,
    DateTimeOffset? LockedAt,
    decimal TotalAllocated,
    decimal Remaining);

public record CreateRevenueAllocationRequest(
    Guid RevenueBucketId,
    Guid ProgrammingBlockId,
    string AllocationType,
    decimal? Percentage = null,
    decimal? Amount = null);

public record RevenueAllocationResponse(
    Guid Id,
    Guid RevenueBucketId,
    string BucketName,
    Guid ProgrammingBlockId,
    string BlockTitle,
    string AllocationType,
    decimal? Percentage,
    decimal? Amount,
    decimal CalculatedAmount,
    decimal BucketRemaining,
    IReadOnlyList<FestivalWarning> Warnings,
    decimal? RoundingAdjustment = null);

public record UpdateRevenueAllocationRequest(
    string AllocationType,
    decimal? Percentage = null,
    decimal? Amount = null);

public record ExpenseAllocationTargetRequest(
    string TargetType,
    string? TargetDayDate = null,
    Guid? TargetStageZoneId = null,
    Guid? TargetBlockId = null,
    decimal? Percentage = null,
    decimal? Amount = null);

public record CreateExpenseAllocationRequest(
    string TargetType,
    string Method,
    Guid? SourceLineItemId = null,
    Guid? SourceQboTransactionId = null,
    string? TargetDayDate = null,
    Guid? TargetStageZoneId = null,
    Guid? TargetBlockId = null,
    decimal? Percentage = null,
    decimal? Amount = null,
    bool CountsTowardSettlement = false,
    IReadOnlyList<ExpenseAllocationTargetRequest>? Targets = null);

public record ExpenseAllocationResponse(
    Guid Id,
    Guid? SourceLineItemId,
    Guid? SourceQboTransactionId,
    string TargetType,
    string? TargetDayDate,
    Guid? TargetStageZoneId,
    Guid? TargetBlockId,
    string Method,
    decimal? Percentage,
    decimal CalculatedAmount,
    bool CountsTowardSettlement,
    DateTimeOffset CreatedAt);

/// <summary>
/// The unallocated remainder of any source IS festival overhead — a valid final state that
/// stays visible rather than erroring (spec FR-023, FR-041).
/// </summary>
public record ExpenseSourceSummaryResponse(
    Guid SourceId,
    string SourceKind,
    string Label,
    decimal SourceAmount,
    decimal TotalAllocated,
    decimal RemainingAtOverhead,
    IReadOnlyList<ExpenseAllocationResponse> Allocations);
