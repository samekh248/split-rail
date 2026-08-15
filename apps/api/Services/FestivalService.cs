using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Festival wrapper lifecycle: create, convert a standard event into festival mode, update
/// the date range, and revert. Festival mode is a progressive enhancement — standard events
/// never see any of this (spec FR-001).
/// </summary>
public class FestivalService
{
    /// <summary>v1 targets events of 3 days or fewer (PRD scope bound).</summary>
    public const int MaxFestivalDays = 3;

    private const string DefaultStageName = "Main Stage";

    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly FestivalAccessGuard _guard;
    private readonly VenueService _venueService;
    private readonly ILogger<FestivalService> _logger;

    public FestivalService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        FestivalAccessGuard guard,
        VenueService venueService,
        ILogger<FestivalService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _guard = guard;
        _venueService = venueService;
        _logger = logger;
    }

    public async Task<FestivalResponse> CreateAsync(
        Guid venueId,
        CreateFestivalRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _guard.RequireUserId();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var (startDate, endDate) = ParseAndValidateRange(request.StartDate, request.EndDate);
        var title = ValidateTitle(request.Title);

        Event festival;

        if (request.ExistingEventId is Guid existingId)
        {
            // Conversion path: keep the existing event (and its ledger) intact.
            festival = await _guard.RequireEventAsync(venueId, existingId, cancellationToken);

            if (festival.EventType == EventType.Festival)
                throw new ValidationException("This event is already a festival.");

            if (festival.Status is EventStatus.Settled or EventStatus.Reconciled)
                throw new LedgerStateException(
                    "A settled or reconciled event cannot be converted to a festival.");

            festival.EventType = EventType.Festival;
            festival.Title = title;
            festival.EventDate = startDate;
            festival.EndDate = endDate;

            if (string.IsNullOrWhiteSpace(festival.QboTagName))
                festival.QboTagName = BuildMasterTag(title, startDate);
        }
        else
        {
            festival = new Event
            {
                Id = Guid.NewGuid(),
                VenueId = venueId,
                Title = title,
                EventDate = startDate,
                EndDate = endDate,
                EventType = EventType.Festival,
                Status = EventStatus.PreShow,
                QboTagName = BuildMasterTag(title, startDate),
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.Events.Add(festival);
        }

        // A festival always has at least one stage; single-stage events should never make
        // the user think about stage management (spec FR-004).
        var hasStage = request.ExistingEventId is Guid id
            && await _db.StageZones.AnyAsync(s => s.EventId == id, cancellationToken);

        if (!hasStage)
        {
            _db.StageZones.Add(new StageZone
            {
                Id = Guid.NewGuid(),
                EventId = festival.Id,
                Name = DefaultStageName,
                SortOrder = 0
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Festival {EventId} created for venue {VenueId} ({Days} days)",
            festival.Id, venueId, DayCount(startDate, endDate));

        return await GetAsync(venueId, festival.Id, cancellationToken);
    }

    public async Task<FestivalResponse> GetAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);

        return await BuildResponseAsync(festival, cancellationToken);
    }

    public async Task<FestivalResponse> UpdateAsync(
        Guid venueId,
        Guid eventId,
        UpdateFestivalRequest request,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);

        if (festival.Status is EventStatus.Settled or EventStatus.Reconciled)
            throw new LedgerStateException("A settled or reconciled festival cannot be edited.");

        var (startDate, endDate) = ParseAndValidateRange(request.StartDate, request.EndDate);
        var title = ValidateTitle(request.Title);

        // Shrinking the range must never silently orphan blocks — the user resolves them
        // explicitly by moving or canceling first (spec edge case).
        var orphaned = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.EventId == eventId && (b.DayDate < startDate || b.DayDate > endDate))
            .Select(b => new { b.Id, b.Title })
            .ToListAsync(cancellationToken);

        if (orphaned.Count > 0)
        {
            throw new FestivalDateConflictException(
                $"{orphaned.Count} programming block(s) fall outside the new date range. " +
                "Move or cancel them before changing the dates.",
                orphaned.Select(o => o.Id).ToList());
        }

        festival.Title = title;
        festival.EventDate = startDate;
        festival.EndDate = endDate;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(venueId, eventId, cancellationToken);
    }

    /// <summary>
    /// Reverts a festival to a standard event. Only allowed while the festival structure is
    /// still effectively empty, so no festival data is silently discarded.
    /// </summary>
    public async Task RevertToStandardAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);

        var blockers = new List<string>();

        if (await _db.ProgrammingBlocks.AnyAsync(b => b.EventId == eventId, cancellationToken))
            blockers.Add("programming blocks exist");

        if (await _db.StageZones.CountAsync(s => s.EventId == eventId, cancellationToken) > 1)
            blockers.Add("more than one stage exists");

        if (await _db.RevenueBuckets.AnyAsync(b => b.EventId == eventId, cancellationToken))
            blockers.Add("revenue buckets exist");

        if (await _db.ExpenseAllocations.AnyAsync(a => a.EventId == eventId, cancellationToken))
            blockers.Add("expense allocations exist");

        if (blockers.Count > 0)
        {
            throw new ConflictException(
                "This festival cannot be reverted to a standard event because " +
                string.Join(", ", blockers) + ".");
        }

        var stages = await _db.StageZones.Where(s => s.EventId == eventId).ToListAsync(cancellationToken);
        _db.StageZones.RemoveRange(stages);

        festival.EventType = EventType.Standard;
        festival.EndDate = null;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Festival {EventId} reverted to a standard event", eventId);
    }

    private async Task<FestivalResponse> BuildResponseAsync(
        Event festival,
        CancellationToken cancellationToken)
    {
        var stages = await _db.StageZones
            .AsNoTracking()
            .Where(s => s.EventId == festival.Id)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new StageZoneResponse(
                s.Id,
                s.Name,
                s.SortOrder,
                s.ProgrammingBlocks.Count))
            .ToListAsync(cancellationToken);

        var blocksPerDay = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.EventId == festival.Id)
            .GroupBy(b => b.DayDate)
            .Select(g => new { DayDate = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DayDate, x => x.Count, cancellationToken);

        var days = festival.FestivalDays()
            .Select(d => new FestivalDayDto(d, blocksPerDay.GetValueOrDefault(d)))
            .ToList();

        return new FestivalResponse(
            festival.Id,
            festival.VenueId,
            festival.Title,
            festival.EventDate.ToString("yyyy-MM-dd"),
            festival.EndDate?.ToString("yyyy-MM-dd") ?? festival.EventDate.ToString("yyyy-MM-dd"),
            EventTypeFormat.ToApiString(festival.EventType),
            EventStatusFormat.ToApiString(festival.Status),
            festival.QboTagName,
            days,
            stages);
    }

    private static (DateOnly Start, DateOnly End) ParseAndValidateRange(string startRaw, string endRaw)
    {
        if (!DateOnly.TryParse(startRaw, out var start))
            throw new ValidationException("Start date must be a valid date (yyyy-MM-dd).");

        if (!DateOnly.TryParse(endRaw, out var end))
            throw new ValidationException("End date must be a valid date (yyyy-MM-dd).");

        if (end < start)
            throw new ValidationException("End date cannot be before the start date.");

        var days = DayCount(start, end);
        if (days > MaxFestivalDays)
        {
            throw new ValidationException(
                $"This release supports festivals of {MaxFestivalDays} days or fewer. " +
                $"The requested range covers {days} days.");
        }

        return (start, end);
    }

    private static int DayCount(DateOnly start, DateOnly end) =>
        end.DayNumber - start.DayNumber + 1;

    private static string ValidateTitle(string title)
    {
        var trimmed = (title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ValidationException("Festival name is required.");

        if (trimmed.Length > 255)
            throw new ValidationException("Festival name must be 255 characters or fewer.");

        return trimmed;
    }

    /// <summary>
    /// Builds the single master QBO project tag for the whole festival. This is a local
    /// display string the bookkeeper applies inside QuickBooks — Split-Rail never writes to
    /// QBO (Constitution IV).
    /// </summary>
    private static string BuildMasterTag(string title, DateOnly startDate)
    {
        var slug = new string(title
            .ToUpperInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray());

        while (slug.Contains("--"))
            slug = slug.Replace("--", "-");

        slug = slug.Trim('-');

        if (slug.Length > 30)
            slug = slug[..30].TrimEnd('-');

        return $"#Fest-{startDate.Year}-{slug}";
    }
}
