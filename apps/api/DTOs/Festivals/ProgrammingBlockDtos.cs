namespace SplitRail.Api.DTOs.Festivals;

/// <summary>
/// Creation-level validation only: title, day, stage, times, category, settlement flag.
/// Payout-specific fields stay optional until settlement is actually processed
/// (two-level validation, spec FR-005).
/// </summary>
public record CreateProgrammingBlockRequest(
    string Title,
    string DayDate,
    Guid StageZoneId,
    string StartTime,
    string EndTime,
    string Category,
    bool RequiresSettlement,
    Guid? FestivalArtistId = null,
    string? NewArtistName = null,
    bool IsPubliclyVisible = false,
    string? Description = null,
    string? LoadInTime = null,
    string? SoundcheckTime = null,
    string? BookingStatus = null);

/// <summary>
/// A null <c>BookingStatus</c> leaves the existing booking commitment untouched, so placement
/// edits (including drag-and-drop moves) never silently promote or demote a hold.
/// </summary>
public record UpdateProgrammingBlockRequest(
    string Title,
    string DayDate,
    Guid StageZoneId,
    string StartTime,
    string EndTime,
    string Category,
    bool RequiresSettlement,
    Guid? FestivalArtistId = null,
    string? NewArtistName = null,
    bool IsPubliclyVisible = false,
    string? Description = null,
    string? LoadInTime = null,
    string? SoundcheckTime = null,
    string? BookingStatus = null);

public record ProgrammingBlockResponse(
    Guid Id,
    Guid EventId,
    Guid StageZoneId,
    string StageName,
    Guid? FestivalArtistId,
    string? ArtistName,
    string DayDate,
    string StartTime,
    string EndTime,
    string Title,
    string Category,
    string ScheduleStatus,
    string BookingStatus,
    string SettlementStatus,
    bool RequiresSettlement,
    bool RequiresSettlementReview,
    bool IsPubliclyVisible,
    string? Description,
    string? LoadInTime,
    string? SoundcheckTime,
    IReadOnlyList<FestivalWarning> Warnings,
    bool IsPinned = false);

/// <summary>Public-facing itinerary rows carry only the audience-safe subset (research.md D13).</summary>
public record PublicProgrammingBlockResponse(
    Guid Id,
    string DayDate,
    string StageName,
    string StartTime,
    string EndTime,
    string Title,
    string Category);

public record SetBlockStatusRequest(string Status, string? Reason = null);

public record SetBlockBookingStatusRequest(string BookingStatus, string? Reason = null);

/// <summary>
/// <c>BookingStatus</c> rolls the artist's appearances up: CONFIRMED only once every appearance
/// that still counts is confirmed, otherwise the artist is still on hold.
/// </summary>
public record FestivalArtistResponse(
    Guid Id,
    string Name,
    int AppearanceCount,
    string BookingStatus = "HOLD",
    int ConfirmedAppearanceCount = 0);

public record CreateFestivalArtistRequest(string Name);

public record CopyDealTermsRequest(Guid SourceBlockId, IReadOnlyList<Guid> TargetBlockIds);

public record ArtistAppearanceDto(
    Guid BlockId,
    string Title,
    string DayDate,
    string StageName,
    string StartTime,
    string EndTime,
    string ScheduleStatus,
    string SettlementStatus,
    decimal? NetPayable = null,
    string BookingStatus = "HOLD");

public record ItineraryResponse(
    IReadOnlyList<FestivalDayDto> Days,
    IReadOnlyList<StageZoneResponse> Stages,
    IReadOnlyList<ProgrammingBlockResponse> Blocks);

public record PublicItineraryResponse(
    IReadOnlyList<FestivalDayDto> Days,
    IReadOnlyList<StageZoneResponse> Stages,
    IReadOnlyList<PublicProgrammingBlockResponse> Blocks);

public record SetPublishVisibilityRequest(IReadOnlyList<Guid> BlockIds, bool IsPubliclyVisible);
