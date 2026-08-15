namespace SplitRail.Api.Models;

/// <summary>
/// A named festival-level revenue source (3-day wristbands, VIP upgrades, bar).
/// Allocation to sub-settlements is opt-in: IsAllocable defaults to false and only
/// flagged buckets may feed deal math (spec FR-018).
/// Balances are computed as SUM projections, never stored (research.md D8).
/// </summary>
public class RevenueBucket
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsAllocable { get; set; }
    public decimal Amount { get; set; }

    /// <summary>Optional link to the master-ledger row this bucket represents.</summary>
    public Guid? LinkedLineItemId { get; set; }

    /// <summary>Set when a referencing settlement finalizes; locked buckets reject edits without override.</summary>
    public DateTimeOffset? LockedAt { get; set; }
    public Guid? LockedByUserId { get; set; }

    public uint Xmin { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Event Event { get; set; } = null!;
    public FinancialLineItem? LinkedLineItem { get; set; }
    public ICollection<RevenueAllocation> Allocations { get; set; } = [];
}
