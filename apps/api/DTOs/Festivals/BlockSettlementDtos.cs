namespace SplitRail.Api.DTOs.Festivals;

public record BlockDealTermsDto(
    string DealType,
    decimal BaseGuarantee,
    decimal BackendPercentage,
    string PercentBasis,
    decimal? CapAmount,
    decimal? FloorAmount,
    decimal? BonusThresholdAmount,
    decimal? BonusAmount,
    decimal TaxWithholdingPercentage,
    string? CustomFormulaExpression);

public record UpdateBlockDealTermsRequest(
    string DealType,
    decimal BaseGuarantee,
    decimal BackendPercentage,
    string PercentBasis,
    decimal? CapAmount = null,
    decimal? FloorAmount = null,
    decimal? BonusThresholdAmount = null,
    decimal? BonusAmount = null,
    decimal TaxWithholdingPercentage = 0m,
    string? CustomFormulaExpression = null);

/// <summary>One allocation line, named by its source bucket — never the bucket's totals.</summary>
public record BlockAllocationLineDto(string BucketName, string AllocationType, decimal CalculatedAmount);

public record BlockSettlementLineItemDto(
    Guid Id,
    string LineType,
    string Label,
    decimal Amount,
    DateTimeOffset EnteredAt);

public record CreateBlockSettlementLineItemRequest(string LineType, string Label, decimal Amount);

public record BlockSettlementComputedDto(
    decimal AllocationBasis,
    decimal GrossPayout,
    decimal Deductions,
    decimal TaxWithheld,
    decimal NetPayable);

public record BlockSettlementRevisionDto(
    int RevisionNumber,
    DateTimeOffset FinalizedAt,
    string? PdfUrl,
    string? DispatchOutcome,
    string? ReasonCode);

/// <summary>
/// The isolated sub-settlement sheet. Contains only this block's deal — no master ledger
/// totals, no bucket totals, no other participants' terms (spec FR-026).
/// </summary>
public record BlockSettlementSheetResponse(
    Guid BlockId,
    string Title,
    string DayDate,
    string StageName,
    string StartTime,
    string EndTime,
    string? ArtistName,
    string SettlementStatus,
    bool RequiresSettlementReview,
    BlockDealTermsDto DealTerms,
    IReadOnlyList<BlockAllocationLineDto> Allocations,
    IReadOnlyList<BlockSettlementLineItemDto> LineItems,
    BlockSettlementComputedDto Computed,
    IReadOnlyList<BlockSettlementRevisionDto> Revisions);

public record PreflightBlockerDto(string Category, string Message, string LinkTarget);

public record FinalizePreflightResponse(
    bool Ready,
    IReadOnlyList<PreflightBlockerDto> Blockers,
    decimal? FinalPayable);

public record FinalizeBlockSettlementRequest(bool Confirmed, decimal? ExpectedNetPayable = null);

public record BlockSettlementResultDto(
    Guid BlockId,
    string SettlementStatus,
    DateTimeOffset? FinalizedAt,
    decimal NetPayable,
    string? PdfUrl,
    string? DispatchOutcome,
    int RevisionNumber);

public record ReopenBlockSettlementRequest(
    string ReasonCode,
    string Note,
    bool AcknowledgeDispatched = false);

public record BlockWorkQueueItemDto(
    Guid BlockId,
    string Title,
    string DayDate,
    string StageName,
    string StartTime,
    string SettlementStatus,
    bool RequiresSettlementReview,
    bool PreflightReady);

public record ArtistSettlementRollupDto(
    Guid ArtistId,
    string ArtistName,
    int AppearanceCount,
    decimal TotalNetPayout,
    decimal TotalAllocatedRevenue,
    IReadOnlyList<ArtistAppearanceDto> Appearances);

public static class PreflightBlockerCategories
{
    public const string MissingRevenueMapping = "MissingRevenueMapping";
    public const string MissingExpenseMapping = "MissingExpenseMapping";
    public const string AllocationConflict = "AllocationConflict";
    public const string MissingSettlementFields = "MissingSettlementFields";
    public const string UnresolvedScheduleChange = "UnresolvedScheduleChange";
}
