using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

public class Event
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly EventDate { get; set; }
    public EventType EventType { get; set; } = EventType.Standard;

    /// <summary>
    /// Inclusive last day of a festival. Null for standard events; the festival's Days are
    /// the derived range EventDate..EndDate (no separate day table — research.md D2).
    /// </summary>
    public DateOnly? EndDate { get; set; }
    public EventStatus Status { get; set; } = EventStatus.PreShow;
    public string QboTagName { get; set; } = string.Empty;
    public bool IsBudgetLocked { get; set; }
    public DateTimeOffset? SettledAt { get; set; }
    public Guid? SettledByUserId { get; set; }
    public DateTimeOffset? ReconciledAt { get; set; }
    public Guid? ReconciledByUserId { get; set; }
    public string? ArtistSignatureData { get; set; }
    public string? SettlementPdfUrl { get; set; }
    public uint Xmin { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public BookingPlacementStatus BookingPlacementStatus { get; set; } = BookingPlacementStatus.Confirmed;
    public TimeOnly? DoorsTime { get; set; }
    public TimeOnly? LoadInTime { get; set; }
    public TimeOnly? CurfewTime { get; set; }
    public string? SupportLineup { get; set; }

    /// <summary>
    /// When music starts. Only settable while BookingPlacementStatus is Confirmed (spec 086
    /// FR-004). Retained (not cleared) if the placement later moves away from confirmed, and
    /// becomes visible again if it returns to confirmed (FR-006).
    /// </summary>
    public TimeOnly? ShowStartTime { get; set; }

    /// <summary>Free-text operational notes (spec 086 FR-008/FR-009), max 2000 characters.</summary>
    public string? Notes { get; set; }

    public Venue Venue { get; set; } = null!;
    public User? SettledByUser { get; set; }
    public User? ReconciledByUser { get; set; }
    public ICollection<FinancialLineItem> LineItems { get; set; } = [];
    public ICollection<EventArtist> Artists { get; set; } = [];
    public ICollection<SettlementReversal> Reversals { get; set; } = [];
    public ICollection<QboSyncLedger> QboSyncLedgerEntries { get; set; } = [];
    public ICollection<UnmappedQboTransaction> UnmappedQboTransactions { get; set; } = [];
    public ICollection<UserEventPin> UserEventPins { get; set; } = [];
    public ICollection<StageZone> StageZones { get; set; } = [];
    public ICollection<ProgrammingBlock> ProgrammingBlocks { get; set; } = [];
    public ICollection<FestivalArtist> FestivalArtists { get; set; } = [];
    public ICollection<RevenueBucket> RevenueBuckets { get; set; } = [];
    public ICollection<ExpenseAllocation> ExpenseAllocations { get; set; } = [];
    public ICollection<FestivalAuditEntry> FestivalAuditEntries { get; set; } = [];

    /// <summary>
    /// Inclusive festival day range. Empty for standard events.
    /// </summary>
    public IEnumerable<DateOnly> FestivalDays()
    {
        if (EventType != EventType.Festival || EndDate is not DateOnly end)
            yield break;

        for (var day = EventDate; day <= end; day = day.AddDays(1))
            yield return day;
    }
}
