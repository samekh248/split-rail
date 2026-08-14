using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

/// <summary>
/// Flows a portion of an allocable revenue bucket into one block's sub-settlement.
/// Every allocation stays traceable to its named source bucket (spec FR-020).
/// </summary>
public class RevenueAllocation
{
    public Guid Id { get; set; }
    public Guid RevenueBucketId { get; set; }
    public Guid ProgrammingBlockId { get; set; }

    public RevenueAllocationType AllocationType { get; set; }
    public decimal? Percentage { get; set; }
    public decimal? Amount { get; set; }

    /// <summary>Rounded at the final allocation line via DealMathEngine (Constitution I).</summary>
    public decimal CalculatedAmount { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public uint Xmin { get; set; }

    public RevenueBucket RevenueBucket { get; set; } = null!;
    public ProgrammingBlock ProgrammingBlock { get; set; } = null!;
}
