using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class ProgrammingBlockPinService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly ILogger<ProgrammingBlockPinService> _logger;

    public ProgrammingBlockPinService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        ILogger<ProgrammingBlockPinService> logger)
    {
        _db = db;
        _guard = guard;
        _logger = logger;
    }

    public async Task PinAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var userId = await ValidateBlockAsync(venueId, eventId, blockId, cancellationToken);

        var existingPin = await _db.UserProgrammingBlockPins
            .AnyAsync(p => p.UserId == userId && p.ProgrammingBlockId == blockId, cancellationToken);

        if (existingPin)
            return;

        _db.UserProgrammingBlockPins.Add(new UserProgrammingBlockPin
        {
            UserId = userId,
            ProgrammingBlockId = blockId,
            PinnedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "User {UserId} pinned programming block {BlockId} on festival {EventId} at venue {VenueId}",
            userId, blockId, eventId, venueId);
    }

    public async Task UnpinAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var userId = await ValidateBlockAsync(venueId, eventId, blockId, cancellationToken);

        var pin = await _db.UserProgrammingBlockPins
            .FirstOrDefaultAsync(
                p => p.UserId == userId && p.ProgrammingBlockId == blockId,
                cancellationToken);

        if (pin is null)
            return;

        _db.UserProgrammingBlockPins.Remove(pin);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "User {UserId} unpinned programming block {BlockId} on festival {EventId} at venue {VenueId}",
            userId, blockId, eventId, venueId);
    }

    private async Task<Guid> ValidateBlockAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken)
    {
        var userId = _guard.RequireUserId();
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var blockExists = await _db.ProgrammingBlocks
            .AnyAsync(b => b.Id == blockId && b.EventId == eventId, cancellationToken);

        if (!blockExists)
            throw new NotFoundException("Programming block not found.");

        return userId;
    }
}
