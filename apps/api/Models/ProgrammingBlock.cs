using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

/// <summary>
/// A single itinerary item inside a festival — the unit of scheduling, settlement, and
/// reporting. Replaces the traditional single Event only inside festival mode.
/// A "move" is a day/stage reassignment recorded in audit history, not a status
/// (research.md D4).
/// </summary>
public class ProgrammingBlock
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid StageZoneId { get; set; }
    public Guid? FestivalArtistId { get; set; }

    // Placement
    public DateOnly DayDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    // Creation-required descriptors
    public string Title { get; set; } = string.Empty;
    public BlockCategory Category { get; set; } = BlockCategory.Music;
    public bool RequiresSettlement { get; set; }

    // Optional operational metadata
    public bool IsPubliclyVisible { get; set; }
    public string? Description { get; set; }
    public TimeOnly? LoadInTime { get; set; }
    public TimeOnly? SoundcheckTime { get; set; }

    public BlockScheduleStatus ScheduleStatus { get; set; } = BlockScheduleStatus.Scheduled;

    /// <summary>
    /// Booking commitment for this appearance. New appearances start as a hold and are promoted
    /// once the deal is locked; independent of <see cref="ScheduleStatus"/>.
    /// </summary>
    public BlockBookingStatus BookingStatus { get; set; } = BlockBookingStatus.Hold;

    /// <summary>
    /// Set when a block is canceled, moved, or materially rescheduled after settlement work
    /// began. Blocks finalization until an authorized user reviews the change (spec FR-014).
    /// </summary>
    public bool RequiresSettlementReview { get; set; }

    // Deal terms — only meaningful once RequiresSettlement is true.
    public DealType DealType { get; set; } = DealType.Guarantee;
    public decimal BaseGuarantee { get; set; }
    public decimal BackendPercentage { get; set; }
    public PercentBasis PercentBasis { get; set; } = PercentBasis.Gross;
    public decimal? CapAmount { get; set; }
    public decimal? FloorAmount { get; set; }
    public decimal? BonusThresholdAmount { get; set; }
    public decimal? BonusAmount { get; set; }
    public decimal TaxWithholdingPercentage { get; set; }
    public string? CustomFormulaExpression { get; set; }

    // Settlement state
    public BlockSettlementStatus SettlementStatus { get; set; } = BlockSettlementStatus.NotRequired;
    public decimal CalculatedNetPayout { get; set; }
    public DateTimeOffset? FinalizedAt { get; set; }
    public Guid? FinalizedByUserId { get; set; }
    public string? SettlementPdfUrl { get; set; }
    public string? FinalizedSnapshotJson { get; set; }

    public uint Xmin { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Event Event { get; set; } = null!;
    public StageZone StageZone { get; set; } = null!;
    public FestivalArtist? FestivalArtist { get; set; }
    public User? FinalizedByUser { get; set; }
    public ICollection<RevenueAllocation> RevenueAllocations { get; set; } = [];
    public ICollection<BlockSettlementLineItem> SettlementLineItems { get; set; } = [];
    public ICollection<BlockSettlementRevision> SettlementRevisions { get; set; } = [];
    public ICollection<UserProgrammingBlockPin> UserProgrammingBlockPins { get; set; } = [];

    /// <summary>
    /// Two active blocks overlap when each starts before the other ends. Only active
    /// blocks participate in same-stage conflict validation (research.md D12).
    /// </summary>
    public bool OverlapsWith(TimeOnly otherStart, TimeOnly otherEnd) =>
        StartTime < otherEnd && EndTime > otherStart;
}
