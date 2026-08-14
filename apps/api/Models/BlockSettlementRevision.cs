namespace SplitRail.Api.Models;

/// <summary>
/// An immutable snapshot of one finalization of a block settlement. Reopening writes a new
/// revision rather than overwriting prior history (spec FR-033).
/// </summary>
public class BlockSettlementRevision
{
    public Guid Id { get; set; }
    public Guid ProgrammingBlockId { get; set; }
    public int RevisionNumber { get; set; }
    public string SnapshotJson { get; set; } = string.Empty;

    // Populated when this revision was subsequently reopened.
    public string? ReasonCode { get; set; }
    public string? Note { get; set; }
    public Guid? ReopenedByUserId { get; set; }
    public DateTimeOffset? ReopenedAt { get; set; }

    public Guid FinalizedByUserId { get; set; }
    public DateTimeOffset FinalizedAt { get; set; }
    public string? PdfUrl { get; set; }
    public string? DispatchOutcome { get; set; }

    public ProgrammingBlock ProgrammingBlock { get; set; } = null!;
}
