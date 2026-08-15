namespace SplitRail.Api.DTOs.Festivals;

/// <summary>
/// Creates a festival, or converts an existing standard event when ExistingEventId is set.
/// Only three fields are required by the PRD: name, start date, end date.
/// </summary>
public record CreateFestivalRequest(
    string Title,
    string StartDate,
    string EndDate,
    Guid? ExistingEventId = null);

public record UpdateFestivalRequest(
    string Title,
    string StartDate,
    string EndDate);

public record FestivalResponse(
    Guid EventId,
    Guid VenueId,
    string Title,
    string StartDate,
    string EndDate,
    string EventType,
    string Status,
    string QboTagName,
    IReadOnlyList<FestivalDayDto> Days,
    IReadOnlyList<StageZoneResponse> Stages);

public record CreateStageZoneRequest(string Name, int? SortOrder = null);

public record UpdateStageZoneRequest(string Name, int? SortOrder = null);

/// <summary>
/// Returned with 409 when a stage still holds blocks that must be moved or canceled first.
/// </summary>
public record StageDeleteBlockedResponse(IReadOnlyList<Guid> BlockingBlockIds);
