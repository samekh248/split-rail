using System.Collections.Concurrent;

namespace SplitRail.Api.Services;

public interface IQboVenueSyncRateLimiter
{
    bool TryAcquire(Guid venueId, out TimeSpan retryAfter);
}

public class QboVenueSyncRateLimiter : IQboVenueSyncRateLimiter
{
    private static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(60);
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> _lastSyncByVenue = new();

    public bool TryAcquire(Guid venueId, out TimeSpan retryAfter)
    {
        var now = DateTimeOffset.UtcNow;
        if (_lastSyncByVenue.TryGetValue(venueId, out var lastSync))
        {
            var elapsed = now - lastSync;
            if (elapsed < Cooldown)
            {
                retryAfter = Cooldown - elapsed;
                return false;
            }
        }

        _lastSyncByVenue[venueId] = now;
        retryAfter = TimeSpan.Zero;
        return true;
    }
}
