using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Booking;
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

        var evt = new Event
        {
            VenueId = venueId,
            Title = request.Title.Trim(),
            EventDate = eventDate,
            QboTagName = qboTagName,
            Status = EventStatus.PreShow,
            BookingPlacementStatus = placementStatus,
            DoorsTime = ParseTime(request.DoorsTime),
            LoadInTime = ParseTime(request.LoadInTime),
            CurfewTime = ParseTime(request.CurfewTime),
            SupportLineup = NormalizeOptionalText(request.SupportLineup),
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

        return events.Select(ToEventResponse).ToList();
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
        var targetDate = eventDate;
        var dateOrVenueChanged = evt.EventDate != eventDate || evt.VenueId != venueId;

        if (dateOrVenueChanged)
        {
            await ValidatePlacementAsync(
                targetVenueId,
                targetDate,
                evt.BookingPlacementStatus,
                evt.Id,
                cancellationToken);
        }

        var qboTagName = string.IsNullOrWhiteSpace(request.QboTagName)
            ? string.Empty
            : request.QboTagName.Trim();

        evt.Title = request.Title.Trim();
        evt.EventDate = eventDate;
        evt.QboTagName = qboTagName;
        evt.DoorsTime = ParseTime(request.DoorsTime);
        evt.LoadInTime = ParseTime(request.LoadInTime);
        evt.CurfewTime = ParseTime(request.CurfewTime);
        evt.SupportLineup = NormalizeOptionalText(request.SupportLineup);

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Event {EventId} metadata updated at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt);
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

        return evt is null ? null : ToEventResponse(evt);
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

        return ToEventResponse(evt);
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

        var active = await LoadActivePlacementsAsync(evt.VenueId, evt.EventDate, cancellationToken);
        _bookingConflictService.ValidateAction(
            active,
            BookingConflictAction.PromoteToConfirmed,
            evt.Id);

        evt.BookingPlacementStatus = BookingPlacementStatus.Confirmed;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Hold {EventId} promoted to confirmed at venue {VenueId}", evt.Id, venueId);

        return ToEventResponse(evt);
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
            .Where(e => e.VenueId == venueId && e.EventDate == eventDate)
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

    internal static EventResponse ToEventResponse(Event evt)
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
            workspaceAllowed);
    }
}
