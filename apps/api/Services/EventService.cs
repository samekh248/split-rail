using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
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
    private readonly FrozenEventMutationAuditor _frozenEventAuditor;
    private readonly ILogger<EventService> _logger;

    public EventService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        FrozenEventMutationAuditor frozenEventAuditor,
        ILogger<EventService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
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

        var qboTagName = string.IsNullOrWhiteSpace(request.QboTagName)
            ? string.Empty
            : request.QboTagName.Trim();

        var evt = new Event
        {
            VenueId = venueId,
            Title = request.Title.Trim(),
            EventDate = eventDate,
            QboTagName = qboTagName,
            Status = EventStatus.PreShow
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

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.UpdateEventMetadata);

        var qboTagName = string.IsNullOrWhiteSpace(request.QboTagName)
            ? string.Empty
            : request.QboTagName.Trim();

        evt.Title = request.Title.Trim();
        evt.EventDate = eventDate;
        evt.QboTagName = qboTagName;

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

    internal static EventResponse ToEventResponse(Event evt) =>
        new(
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
            evt.ReconciledByUserId);
}
