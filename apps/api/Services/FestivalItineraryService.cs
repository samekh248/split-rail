using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Builds the multi-track itinerary payload the timeline renders from.
///
/// The internal/public split is enforced here on the server: the public view returns only
/// publicly-visible blocks with a reduced field set, so internal logistics can never reach a
/// public rendering path regardless of what the client does (research.md D13).
/// </summary>
public class FestivalItineraryService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAuditService _audit;

    public FestivalItineraryService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAuditService audit)
    {
        _db = db;
        _guard = guard;
        _audit = audit;
    }

    public async Task<ItineraryResponse> GetInternalAsync(
        Guid venueId,
        Guid eventId,
        string? day,
        Guid? stageZoneId,
        string? category,
        string? status,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);

        var query = BuildFilteredQuery(eventId, day, stageZoneId, category, status);

        var blocks = await query
            .Include(b => b.StageZone)
            .Include(b => b.FestivalArtist)
            .OrderBy(b => b.DayDate).ThenBy(b => b.StartTime)
            .ToListAsync(cancellationToken);

        var stages = await LoadStagesAsync(eventId, cancellationToken);
        var days = await BuildDaysAsync(festival, eventId, cancellationToken);
        var pinnedIds = await PinnedBlockIdsAsync(eventId, cancellationToken);

        return new ItineraryResponse(
            days,
            stages,
            blocks.Select(b => ProgrammingBlockService.ToResponse(b, [], pinnedIds.Contains(b.Id))).ToList());
    }

    public async Task<PublicItineraryResponse> GetPublicAsync(
        Guid venueId,
        Guid eventId,
        string? day,
        Guid? stageZoneId,
        string? category,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);

        var blocks = await BuildFilteredQuery(eventId, day, stageZoneId, category, status: null)
            .Where(b => b.IsPubliclyVisible && b.ScheduleStatus != BlockScheduleStatus.Canceled)
            .Include(b => b.StageZone)
            .OrderBy(b => b.DayDate).ThenBy(b => b.StartTime)
            .Select(b => new PublicProgrammingBlockResponse(
                b.Id,
                b.DayDate.ToString("yyyy-MM-dd"),
                b.StageZone.Name,
                b.StartTime.ToString("HH:mm"),
                b.EndTime.ToString("HH:mm"),
                b.Title,
                BlockCategoryFormat.ToApiString(b.Category)))
            .ToListAsync(cancellationToken);

        var stages = await LoadStagesAsync(eventId, cancellationToken);
        var days = await BuildDaysAsync(festival, eventId, cancellationToken);

        return new PublicItineraryResponse(days, stages, blocks);
    }

    /// <summary>
    /// Changing what the public sees is a separately permissioned action — view switching is
    /// free for internal users, publishing is not (spec FR-016).
    /// </summary>
    public async Task<int> SetPublishVisibilityAsync(
        Guid venueId,
        Guid eventId,
        SetPublishVisibilityRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequirePublishAuthorityAsync(cancellationToken);

        if (request.BlockIds.Count == 0)
            return 0;

        var blocks = await _db.ProgrammingBlocks
            .Where(b => b.EventId == eventId && request.BlockIds.Contains(b.Id))
            .ToListAsync(cancellationToken);

        foreach (var block in blocks)
        {
            if (block.IsPubliclyVisible == request.IsPubliclyVisible)
                continue;

            _audit.Record(
                eventId,
                FestivalAuditEntityTypes.PublicItinerary,
                block.Id,
                FestivalAuditActions.PublishChange,
                new { IsPubliclyVisible = block.IsPubliclyVisible },
                new { IsPubliclyVisible = request.IsPubliclyVisible });

            block.IsPubliclyVisible = request.IsPubliclyVisible;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return blocks.Count;
    }

    private IQueryable<Models.ProgrammingBlock> BuildFilteredQuery(
        Guid eventId,
        string? day,
        Guid? stageZoneId,
        string? category,
        string? status)
    {
        var query = _db.ProgrammingBlocks.AsNoTracking().Where(b => b.EventId == eventId);

        if (!string.IsNullOrWhiteSpace(day))
        {
            if (!DateOnly.TryParse(day, out var dayDate))
                throw new ValidationException("Day filter must be a valid date (yyyy-MM-dd).");
            query = query.Where(b => b.DayDate == dayDate);
        }

        if (stageZoneId is Guid stageId)
            query = query.Where(b => b.StageZoneId == stageId);

        if (!string.IsNullOrWhiteSpace(category))
        {
            if (!BlockCategoryFormat.TryFromApiString(category, out var parsedCategory))
                throw new ValidationException($"Unknown category filter '{category}'.");
            query = query.Where(b => b.Category == parsedCategory);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!BlockScheduleStatusFormat.TryFromApiString(status, out var parsedStatus))
                throw new ValidationException($"Unknown status filter '{status}'.");
            query = query.Where(b => b.ScheduleStatus == parsedStatus);
        }

        return query;
    }

    private async Task<List<StageZoneResponse>> LoadStagesAsync(
        Guid eventId,
        CancellationToken cancellationToken) =>
        await _db.StageZones
            .AsNoTracking()
            .Where(s => s.EventId == eventId)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new StageZoneResponse(s.Id, s.Name, s.SortOrder, s.ProgrammingBlocks.Count))
            .ToListAsync(cancellationToken);

    private async Task<List<FestivalDayDto>> BuildDaysAsync(
        Models.Event festival,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var counts = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.EventId == eventId)
            .GroupBy(b => b.DayDate)
            .Select(g => new { DayDate = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DayDate, x => x.Count, cancellationToken);

        return festival.FestivalDays()
            .Select(d => new FestivalDayDto(d, counts.GetValueOrDefault(d)))
            .ToList();
    }

    private async Task<HashSet<Guid>> PinnedBlockIdsAsync(
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var userId = _guard.RequireUserId();
        var ids = await _db.UserProgrammingBlockPins
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.ProgrammingBlock.EventId == eventId)
            .Select(p => p.ProgrammingBlockId)
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }
}
