namespace SplitRail.Api.DTOs.Calendar;

public record CalendarPlacementDto(
    Guid EventId,
    Guid VenueId,
    string VenueName,
    Guid? RegionId,
    string? RegionName,
    string Title,
    string EventDate,
    string BookingPlacementStatus,
    string? DoorsTime,
    string? LoadInTime,
    string? CurfewTime,
    string? SupportLineup,
    string FinancialStatus,
    bool IsBudgetLocked,
    string QboTagName,
    bool HasLineItems,
    bool WorkspaceAllowed);
