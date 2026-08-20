using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Booking;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class EventService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;
    private readonly BookingConflictService _bookingConflictService;
    private readonly FrozenEventMutationAuditor _frozenEventAuditor;
    private readonly ILogger<EventService> _logger;

    public EventService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        BookingConflictService bookingConflictService,
        FrozenEventMutationAuditor frozenEventAuditor,
        ILogger<EventService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _bookingConflictService = bookingConflictService;
        _frozenEventAuditor = frozenEventAuditor;
        _logger = logger;
    }

    public async Task<EventResponse> CreateEventAsync(
        Guid venueId,
        CreateEventRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Event title is required.");

        if (!DateOnly.TryParse(request.EventDate, out var eventDate))
            throw new ValidationException("Event date is invalid.");

        var placementStatus = await ResolveCreatePlacementStatusAsync(
            venueId,
            eventDate,
            request.BookingPlacementStatus,
            cancellationToken);
        await ValidatePlacementAsync(venueId, eventDate, placementStatus, null, cancellationToken);

        var qboTagName = string.IsNullOrWhiteSpace(request.QboTagName)
            ? string.Empty
            : request.QboTagName.Trim();

        var doorsTime = ParseTime(request.DoorsTime);
        var showStartTime = ParseTime(request.ShowStartTime);
        ValidateShowStartTime(placementStatus, doorsTime, showStartTime);
        var notes = ValidateAndNormalizeNotes(request.Notes);

        var evt = new Event
        {
            VenueId = venueId,
            Title = request.Title.Trim(),
            EventDate = eventDate,
            QboTagName = qboTagName,
            Status = EventStatus.PreShow,
            BookingPlacementStatus = placementStatus,
            DoorsTime = doorsTime,
            LoadInTime = ParseTime(request.LoadInTime),
            CurfewTime = ParseTime(request.CurfewTime),
            SupportLineup = NormalizeOptionalText(request.SupportLineup),
            ShowStartTime = showStartTime,
            Notes = notes,
        };

        _db.Events.Add(evt);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Event {EventId} created at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt);
    }

    public async Task<IReadOnlyList<EventResponse>> ListEventsAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var events = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .Where(e => e.VenueId == venueId)
            .OrderByDescending(e => e.EventDate)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        var pinnedIds = await PinnedEventIdsAsync(userId, cancellationToken);
        return events.Select(evt => ToEventResponse(evt, pinnedIds.Contains(evt.Id))).ToList();
    }

    public async Task<EventResponse> UpdateEventMetadataAsync(
        Guid venueId,
        Guid eventId,
        UpdateEventRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Event title is required.");

        if (!DateOnly.TryParse(request.EventDate, out var eventDate))
            throw new ValidationException("Event date is invalid.");

        var evt = await _db.Events
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken);

        if (evt is null)
            throw new NotFoundException("Event not found.");

        if (request.BookingPlacementStatus == "CANCELLED")
            return await CancelConfirmedEventAsync(evt, venueId, userId, cancellationToken);

        if (request.BookingPlacementStatus == "CONFIRMED"
            && evt.BookingPlacementStatus is BookingPlacementStatus.Hold1 or BookingPlacementStatus.Hold2)
        {
            return await PromoteHoldAsync(evt, venueId, userId, cancellationToken);
        }

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.UpdateEventMetadata);

        var targetVenueId = venueId;
        var dateOrVenueChanged = evt.EventDate != eventDate || evt.VenueId != venueId;

        if (dateOrVenueChanged)
        {
            var lastDay = evt.EndDate is DateOnly existingEnd && existingEnd >= eventDate
                ? existingEnd
                : eventDate;
            await ValidateOccupiedRangeAsync(
                targetVenueId,
                eventDate,
                lastDay,
                evt.BookingPlacementStatus,
                evt.Id,
                cancellationToken);
        }

        var qboTagName = string.IsNullOrWhiteSpace(request.QboTagName)
            ? string.Empty
            : request.QboTagName.Trim();

        var updatedDoorsTime = ParseTime(request.DoorsTime);
        var updatedShowStartTime = ParseTime(request.ShowStartTime);
        // This path never changes BookingPlacementStatus (that happens in
        // CancelConfirmedEventAsync/PromoteHoldAsync above), so evt.BookingPlacementStatus is
        // still the event's current placement — the correct baseline for the confirmed-only gate.
        ValidateShowStartTime(evt.BookingPlacementStatus, updatedDoorsTime, updatedShowStartTime);
        var updatedNotes = ValidateAndNormalizeNotes(request.Notes);

        evt.Title = request.Title.Trim();
        evt.EventDate = eventDate;
        evt.QboTagName = qboTagName;
        evt.DoorsTime = updatedDoorsTime;
        evt.LoadInTime = ParseTime(request.LoadInTime);
        evt.CurfewTime = ParseTime(request.CurfewTime);
        evt.SupportLineup = NormalizeOptionalText(request.SupportLineup);
        evt.ShowStartTime = updatedShowStartTime;
        evt.Notes = updatedNotes;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Event {EventId} metadata updated at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt, await IsEventPinnedAsync(userId, evt.Id, cancellationToken));
    }

    public async Task DeleteEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var evt = await _db.Events
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken);

        if (evt is null)
            throw new NotFoundException("Event not found.");

        if (evt.BookingPlacementStatus is BookingPlacementStatus.Hold1 or BookingPlacementStatus.Hold2)
        {
            _db.Events.Remove(evt);
            await _db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Hold {EventId} deleted at venue {VenueId}", eventId, venueId);
            return;
        }

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.DeleteEvent,
            "Event is settled or reconciled and cannot be deleted.");

        if (evt.IsBudgetLocked)
            throw new LedgerStateException("Event budget is locked and cannot be deleted.");

        _db.Events.Remove(evt);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Event {EventId} deleted at venue {VenueId}", eventId, venueId);
    }

    public async Task<EventResponse?> GetEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken);

        return evt is null ? null : ToEventResponse(evt, await IsEventPinnedAsync(userId, evt.Id, cancellationToken));
    }

    private async Task<EventResponse> CancelConfirmedEventAsync(
        Event evt,
        Guid venueId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (evt.BookingPlacementStatus != BookingPlacementStatus.Confirmed)
            throw new ValidationException("Only confirmed bookings can be cancelled.");

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.UpdateEventMetadata);

        evt.BookingPlacementStatus = BookingPlacementStatus.Cancelled;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Event {EventId} booking cancelled at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt, await IsEventPinnedAsync(userId, evt.Id, cancellationToken));
    }

    private async Task<EventResponse> PromoteHoldAsync(
        Event evt,
        Guid venueId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (evt.BookingPlacementStatus is not (BookingPlacementStatus.Hold1 or BookingPlacementStatus.Hold2))
            throw new ValidationException("Only holds can be promoted.");

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.UpdateEventMetadata);

        var lastDay = evt.EndDate ?? evt.EventDate;
        for (var day = evt.EventDate; day <= lastDay; day = day.AddDays(1))
        {
            var active = await LoadActivePlacementsAsync(evt.VenueId, day, cancellationToken);
            _bookingConflictService.ValidateAction(
                active,
                BookingConflictAction.PromoteToConfirmed,
                evt.Id);
        }

        evt.BookingPlacementStatus = BookingPlacementStatus.Confirmed;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Hold {EventId} promoted to confirmed at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt, await IsEventPinnedAsync(userId, evt.Id, cancellationToken));
    }

    public async Task ValidateOccupiedRangeAsync(
        Guid venueId,
        DateOnly startDate,
        DateOnly endDate,
        BookingPlacementStatus placementStatus,
        Guid? excludeEventId,
        CancellationToken cancellationToken)
    {
        if (endDate < startDate)
            throw new ValidationException("End date cannot be before the start date.");

        for (var day = startDate; day <= endDate; day = day.AddDays(1))
            await ValidatePlacementAsync(venueId, day, placementStatus, excludeEventId, cancellationToken);
    }

    private async Task ValidatePlacementAsync(
        Guid venueId,
        DateOnly eventDate,
        BookingPlacementStatus placementStatus,
        Guid? excludeEventId,
        CancellationToken cancellationToken)
    {
        var active = await LoadActivePlacementsAsync(venueId, eventDate, cancellationToken);

        switch (placementStatus)
        {
            case BookingPlacementStatus.Hold1:
            case BookingPlacementStatus.Hold2:
                _bookingConflictService.ValidateAction(active, BookingConflictAction.CreateHold, excludeEventId);
                break;
            case BookingPlacementStatus.Confirmed:
                _bookingConflictService.ValidateAction(active, BookingConflictAction.CreateConfirmed, excludeEventId);
                break;
        }
    }

    private async Task<List<ActivePlacement>> LoadActivePlacementsAsync(
        Guid venueId,
        DateOnly eventDate,
        CancellationToken cancellationToken)
    {
        return await _db.Events
            .AsNoTracking()
            .Where(e =>
                e.VenueId == venueId
                && e.EventDate <= eventDate
                && (e.EndDate ?? e.EventDate) >= eventDate)
            .Select(e => new ActivePlacement(e.Id, e.BookingPlacementStatus))
            .ToListAsync(cancellationToken);
    }

    private async Task<BookingPlacementStatus> ResolveCreatePlacementStatusAsync(
        Guid venueId,
        DateOnly eventDate,
        string? requestedStatus,
        CancellationToken cancellationToken)
    {
        var active = await LoadActivePlacementsAsync(venueId, eventDate, cancellationToken);

        if (string.IsNullOrWhiteSpace(requestedStatus) || requestedStatus == "CONFIRMED")
            return BookingPlacementStatus.Confirmed;

        if (requestedStatus is "HOLD_1" or "HOLD_2")
            return _bookingConflictService.ResolveHoldTier(active);

        if (!BookingPlacementStatusFormat.TryFromApiString(requestedStatus, out var parsed))
            throw new ValidationException("Invalid booking placement status.");

        if (parsed is BookingPlacementStatus.Cancelled)
            throw new ValidationException("Cannot create a cancelled placement.");

        return parsed;
    }

    private static TimeOnly? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return TimeOnly.TryParse(value, out var time)
            ? time
            : throw new ValidationException("Invalid time format.");
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private const int MaxNotesLength = 2000;

    private static string? ValidateAndNormalizeNotes(string? value)
    {
        var normalized = NormalizeOptionalText(value);
        if (normalized is not null && normalized.Length > MaxNotesLength)
        {
            throw new ValidationException(
                $"Notes cannot exceed {MaxNotesLength} characters.");
        }

        return normalized;
    }

    /// <summary>
    /// Show start time is only settable while the placement is confirmed (spec 086 FR-004),
    /// and must not precede doors time on the same event (FR-005). Doors time without a show
    /// start time, or a show start time with no doors time to compare against, are both fine —
    /// only an explicit start-before-doors conflict is refused.
    /// </summary>
    private static void ValidateShowStartTime(
        BookingPlacementStatus placementStatus,
        TimeOnly? doorsTime,
        TimeOnly? showStartTime)
    {
        if (showStartTime is not TimeOnly start)
            return;

        if (placementStatus != BookingPlacementStatus.Confirmed)
        {
            throw new ValidationException(
                "Show start time can only be set while the booking is confirmed.");
        }

        if (doorsTime is TimeOnly doors && start < doors)
        {
            throw new ValidationException(
                $"Show start time ({start:HH\\:mm}) cannot be earlier than doors time ({doors:HH\\:mm}).");
        }
    }

    private async Task<HashSet<Guid>> PinnedEventIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var ids = await _db.UserEventPins
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.EventId)
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }

    private async Task<bool> IsEventPinnedAsync(Guid userId, Guid eventId, CancellationToken cancellationToken) =>
        await _db.UserEventPins
            .AsNoTracking()
            .AnyAsync(p => p.UserId == userId && p.EventId == eventId, cancellationToken);

    internal static EventResponse ToEventResponse(Event evt, bool isPinned = false)
    {
        var workspaceAllowed = evt.BookingPlacementStatus
            is not (BookingPlacementStatus.Hold1 or BookingPlacementStatus.Hold2);

        return new(
            evt.Id,
            evt.VenueId,
            evt.Title,
            evt.EventDate.ToString("yyyy-MM-dd"),
            EventStatusFormat.ToApiString(evt.Status),
            evt.IsBudgetLocked,
            evt.QboTagName,
            LedgerService.GetEditability(evt.Status, evt.IsBudgetLocked),
            evt.SettledAt,
            !string.IsNullOrWhiteSpace(evt.SettlementPdfUrl),
            evt.ReconciledAt,
            evt.ReconciledByUserId,
            BookingPlacementStatusFormat.ToApiString(evt.BookingPlacementStatus),
            evt.DoorsTime?.ToString("HH:mm"),
            evt.LoadInTime?.ToString("HH:mm"),
            evt.CurfewTime?.ToString("HH:mm"),
            evt.SupportLineup,
            workspaceAllowed,
            EventTypeFormat.ToApiString(evt.EventType),
            evt.EndDate?.ToString("yyyy-MM-dd"),
            isPinned,
            evt.ShowStartTime?.ToString("HH:mm"),
            evt.Notes);
    }
}
