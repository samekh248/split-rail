using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class EventPinService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;
    private readonly ILogger<EventPinService> _logger;

    public EventPinService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        ILogger<EventPinService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _logger = logger;
    }

    public async Task PinEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var userId = await ValidateVenueAndEventAsync(venueId, eventId, cancellationToken);

        var existingPin = await _db.UserEventPins
            .AnyAsync(p => p.UserId == userId && p.EventId == eventId, cancellationToken);

        if (existingPin)
            return;

        _db.UserEventPins.Add(new UserEventPin
        {
            UserId = userId,
            EventId = eventId,
            PinnedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {UserId} pinned event {EventId} at venue {VenueId}", userId, eventId, venueId);
    }

    public async Task UnpinEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var userId = await ValidateVenueAndEventAsync(venueId, eventId, cancellationToken);

        var pin = await _db.UserEventPins
            .FirstOrDefaultAsync(p => p.UserId == userId && p.EventId == eventId, cancellationToken);

        if (pin is null)
            return;

        _db.UserEventPins.Remove(pin);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {UserId} unpinned event {EventId} at venue {VenueId}", userId, eventId, venueId);
    }

    private async Task<Guid> ValidateVenueAndEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var eventExists = await _db.Events
            .AnyAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken);

        if (!eventExists)
            throw new NotFoundException("Event not found.");

        return userId;
    }
}
