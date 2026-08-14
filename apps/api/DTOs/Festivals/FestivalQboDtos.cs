namespace SplitRail.Api.DTOs.Festivals;

public record FestivalQboAllocationTraceDto(
    Guid AllocationId,
    string TargetType,
    string? TargetDayDate,
    Guid? TargetStageZoneId,
    Guid? TargetBlockId,
    decimal Amount,
    bool CountsTowardSettlement,
    Guid CreatedByUserId,
    DateTimeOffset CreatedAt);

public record FestivalQboTransactionResponse(
    Guid Id,
    string QboTransactionId,
    string QboAccountId,
    string QboAccountName,
    decimal Amount,
    string TransactionDate,
    string ReviewState,
    string? MasterTag,
    decimal TotalAllocated,
    decimal RemainingAtOverhead,
    string AllocationState,
    IReadOnlyList<FestivalQboAllocationTraceDto> Allocations);

public record ResolveQboReviewRequest(string Resolution, string Reason);

public record QboReviewResolutionResponse(
    Guid TransactionId,
    string PriorReviewState,
    string NewReviewState,
    string? PriorMappingJson,
    string? NewMappingJson,
    string Reason);

public record BlockQboSourceTraceResponse(
    Guid BlockId,
    IReadOnlyList<FestivalQboTransactionResponse> SourceTransactions);
