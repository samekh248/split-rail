namespace SplitRail.Api.DTOs.Festivals;

/// <summary>One derived Day of a festival (research.md D2 — days are a date range, not a table).</summary>
public record FestivalDayDto(DateOnly DayDate, int BlockCount);

public record StageZoneResponse(Guid Id, string Name, int SortOrder, int BlockCount);

/// <summary>
/// Returned with 409 when a save would create a same-stage overlap, naming the conflicting
/// block so the UI can offer reschedule / edit-existing / cancel-or-move (spec FR-010).
/// </summary>
public record BlockConflictResponse(
    Guid ConflictingBlockId,
    string ConflictingBlockTitle,
    TimeOnly ConflictingStartTime,
    TimeOnly ConflictingEndTime);

/// <summary>
/// Returned with 409 when allocations would exceed their source. Draft states surface the
/// same numbers as a warning instead (spec FR-020).
/// </summary>
public record AllocationConflictResponse(
    decimal SourceAmount,
    decimal TotalAllocated,
    decimal OverBy);

/// <summary>Returned with 409 when shrinking a festival's range would orphan blocks.</summary>
public record FestivalDateConflictResponse(
    IReadOnlyList<Guid> AffectedBlockIds,
    IReadOnlyList<string> AffectedBlockTitles);

/// <summary>
/// Non-blocking advisories attached to an otherwise successful save (e.g. an artist booked
/// into overlapping appearances across stages — spec FR-011).
/// </summary>
public record FestivalWarning(string Code, string Message);

public static class FestivalWarningCodes
{
    public const string ArtistDoubleBooked = "ARTIST_DOUBLE_BOOKED";
    public const string BucketOverAllocated = "BUCKET_OVERALLOCATED";
    public const string ExpenseUnderAllocated = "EXPENSE_UNDER_ALLOCATED";
    public const string SettlementReviewRequired = "SETTLEMENT_REVIEW_REQUIRED";
}

public record FestivalAuditEntryResponse(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string Action,
    string? PriorValueJson,
    string? NewValueJson,
    Guid UserId,
    DateTimeOffset OccurredAt,
    string? Reason);
