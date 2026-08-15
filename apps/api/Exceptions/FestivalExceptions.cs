namespace SplitRail.Api.Exceptions;

/// <summary>
/// A Programming Block's active scheduled time overlaps another active block on the same
/// Stage/Zone. Carries the conflicting block's identity so the UI can name it and offer the
/// reschedule / edit-existing / cancel-or-move resolutions (spec FR-010).
/// </summary>
public sealed class BlockConflictException : ApiException
{
    public BlockConflictException(
        string message,
        Guid conflictingBlockId,
        string conflictingBlockTitle,
        TimeOnly conflictingStartTime,
        TimeOnly conflictingEndTime)
        : base(message)
    {
        ConflictingBlockId = conflictingBlockId;
        ConflictingBlockTitle = conflictingBlockTitle;
        ConflictingStartTime = conflictingStartTime;
        ConflictingEndTime = conflictingEndTime;
    }

    public Guid ConflictingBlockId { get; }
    public string ConflictingBlockTitle { get; }
    public TimeOnly ConflictingStartTime { get; }
    public TimeOnly ConflictingEndTime { get; }
}

/// <summary>
/// An allocation would exceed the permitted allocable amount of its source bucket or
/// expense. Draft states surface this as a warning; final settlement execution always
/// blocks on it (spec FR-020, FR-023).
/// </summary>
public sealed class AllocationConflictException : ApiException
{
    public AllocationConflictException(
        string message,
        decimal sourceAmount,
        decimal totalAllocated,
        decimal overBy)
        : base(message)
    {
        SourceAmount = sourceAmount;
        TotalAllocated = totalAllocated;
        OverBy = overBy;
    }

    public decimal SourceAmount { get; }
    public decimal TotalAllocated { get; }
    public decimal OverBy { get; }
}

/// <summary>
/// A festival date-range change would orphan Programming Blocks on removed Days. The
/// affected blocks must be moved or canceled first (spec edge case).
/// </summary>
public sealed class FestivalDateConflictException : ApiException
{
    public FestivalDateConflictException(string message, IReadOnlyList<Guid> affectedBlockIds)
        : base(message)
    {
        AffectedBlockIds = affectedBlockIds;
    }

    public IReadOnlyList<Guid> AffectedBlockIds { get; }
}
