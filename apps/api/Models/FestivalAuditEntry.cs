namespace SplitRail.Api.Models;

/// <summary>
/// One generic audit trail serving every festival auditability requirement: schedule
/// history, status changes, allocation edits, publish changes, ledger access, and
/// reconciliation resolutions. Queried per entity via (EntityType, EntityId).
/// Payloads must be sanitized — no PII, tokens, or secrets (Constitution VIII).
/// </summary>
public class FestivalAuditEntry
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? PriorValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public string? Reason { get; set; }

    public Event Event { get; set; } = null!;
}

public static class FestivalAuditEntityTypes
{
    public const string ProgrammingBlock = "ProgrammingBlock";
    public const string StageZone = "StageZone";
    public const string RevenueBucket = "RevenueBucket";
    public const string RevenueAllocation = "RevenueAllocation";
    public const string ExpenseAllocation = "ExpenseAllocation";
    public const string BlockSettlement = "BlockSettlement";
    public const string QboTransaction = "UnmappedQboTransaction";
    public const string PublicItinerary = "PublicItinerary";
    public const string MasterLedger = "MasterLedgerAccess";
}

public static class FestivalAuditActions
{
    public const string Reschedule = "Reschedule";
    public const string Moved = "Moved";
    public const string StatusChange = "StatusChange";
    public const string BookingStatusChange = "BookingStatusChange";
    public const string AllocationEdit = "AllocationEdit";
    public const string BucketEdit = "BucketEdit";
    public const string PublishChange = "PublishChange";
    public const string ReviewStateResolved = "ReviewStateResolved";
    public const string LedgerViewed = "LedgerViewed";
    public const string SettlementFinalized = "SettlementFinalized";
    public const string SettlementReopened = "SettlementReopened";
    public const string FinalizeFailed = "FinalizeFailed";
}
