using System.Text.Json.Serialization;
using SplitRail.Api.Serialization;

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

public record UnmappedEventSummaryDto(
    Guid EventId,
    Guid VenueId,
    string Title,
    string EventDate,
    int UnmappedCount);

public record ActionCenterDto(
    int TotalUnmappedCount,
    IReadOnlyList<UnmappedEventSummaryDto> EventsWithUnmapped);

public record FinancialHealthDto(
    string WeekStart,
    string WeekEnd,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal ProjectedNetGross,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal ActualQboDeposits,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal Variance);

public record DashboardResponse(
    Guid VenueId,
    IReadOnlyList<EventCardDto> TonightEvents,
    IReadOnlyList<EventCardDto> PinnedEvents,
    IReadOnlyList<EventCardDto> RecentEvents,
    IReadOnlyList<EventCardDto> UpcomingEvents,
    ActionCenterDto ActionCenter,
    FinancialHealthDto FinancialHealth);
