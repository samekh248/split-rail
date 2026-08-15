using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

/// <summary>
/// A deduction, post-finalization adjustment, or explicit rounding line on one block's
/// sub-settlement.
/// </summary>
public class BlockSettlementLineItem
{
    public Guid Id { get; set; }
    public Guid ProgrammingBlockId { get; set; }
    public BlockSettlementLineType LineType { get; set; }
    public string Label { get; set; } = string.Empty;

    /// <summary>Signed amount.</summary>
    public decimal Amount { get; set; }

    public Guid EnteredByUserId { get; set; }
    public DateTimeOffset EnteredAt { get; set; }
    public uint Xmin { get; set; }

    public ProgrammingBlock ProgrammingBlock { get; set; } = null!;
}
