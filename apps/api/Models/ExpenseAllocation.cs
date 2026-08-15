using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

/// <summary>
/// One split line pushing part of a master-ledger expense OR an imported QBO transaction
/// down to festival overhead, a Day, a Stage/Zone, or a Programming Block. Both sources share
/// this table because the split methods, balance rules, and drill-down shape are identical
/// (research.md D9). The unallocated remainder of any source is implicitly overhead.
/// </summary>
public class ExpenseAllocation
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }

    // Exactly one source is set.
    public Guid? SourceLineItemId { get; set; }
    public Guid? SourceQboTransactionId { get; set; }

    public AllocationTargetType TargetType { get; set; }

    // Exactly the field matching TargetType is set (none for Overhead).
    public DateOnly? TargetDayDate { get; set; }
    public Guid? TargetStageZoneId { get; set; }
    public Guid? TargetBlockId { get; set; }

    public AllocationMethod Method { get; set; }
    public decimal? Percentage { get; set; }
    public decimal CalculatedAmount { get; set; }

    /// <summary>
    /// Block-targeted lines surface as a settlement deduction only when true. Sources in a
    /// QBO review state may never set this (spec FR-043).
    /// </summary>
    public bool CountsTowardSettlement { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public uint Xmin { get; set; }

    public Event Event { get; set; } = null!;
    public FinancialLineItem? SourceLineItem { get; set; }
    public UnmappedQboTransaction? SourceQboTransaction { get; set; }
    public StageZone? TargetStageZone { get; set; }
    public ProgrammingBlock? TargetBlock { get; set; }
}
