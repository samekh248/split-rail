namespace SplitRail.Api.DTOs.Dashboard;

public record EventCardDto(
    Guid EventId,
    Guid VenueId,
    string Title,
    string EventDate,
    string Status,
    bool IsBudgetLocked,
    string QboTagName,
    DateTimeOffset? SettledAt,
    bool SettlementPdfAvailable,
    DateTimeOffset? ReconciledAt,
    Guid? ReconciledByUserId,
    bool IsPinned,
    bool HasVarianceConcern,
    int UnmappedCount,
    DateTimeOffset? LastSyncedAt);

public record DashboardResponse(
    Guid VenueId,
    IReadOnlyList<EventCardDto> TonightEvents,
    IReadOnlyList<EventCardDto> PinnedEvents,
    IReadOnlyList<EventCardDto> RecentEvents,
    IReadOnlyList<EventCardDto> UpcomingEvents);
