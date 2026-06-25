using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Models;

public class Event
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly EventDate { get; set; }
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

    public Venue Venue { get; set; } = null!;
    public User? SettledByUser { get; set; }
    public User? ReconciledByUser { get; set; }
    public ICollection<FinancialLineItem> LineItems { get; set; } = [];
    public ICollection<EventArtist> Artists { get; set; } = [];
    public ICollection<SettlementReversal> Reversals { get; set; } = [];
    public ICollection<QboSyncLedger> QboSyncLedgerEntries { get; set; } = [];
    public ICollection<UnmappedQboTransaction> UnmappedQboTransactions { get; set; } = [];
    public ICollection<UserEventPin> UserEventPins { get; set; } = [];
}
