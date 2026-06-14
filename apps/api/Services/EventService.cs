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
    private readonly ILogger<EventService> _logger;

    public EventService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        ILogger<EventService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
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

        if (string.IsNullOrWhiteSpace(request.QboTagName))
            throw new ValidationException("QBO tag name is required.");

        if (!DateOnly.TryParse(request.EventDate, out var eventDate))
            throw new ValidationException("Event date is invalid.");

        var evt = new Event
        {
            VenueId = venueId,
            Title = request.Title.Trim(),
            EventDate = eventDate,
            QboTagName = request.QboTagName.Trim(),
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
            .ToListAsync(cancellationToken);

        return events.Select(ToEventResponse).ToList();
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
            LedgerService.GetEditability(evt.Status, evt.IsBudgetLocked));
}
