using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class QboPurgeService
{
    private readonly ApplicationDbContext _db;
    private readonly VenueService _venueService;
    private readonly ITenantContext _tenantContext;

    public QboPurgeService(
        ApplicationDbContext db,
        VenueService venueService,
        ITenantContext tenantContext)
    {
        _db = db;
        _venueService = venueService;
        _tenantContext = tenantContext;
    }

    public async Task PurgeCachedDataAsync(Guid venueId, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        if (await _db.QboVenueCredentials.AnyAsync(c => c.VenueId == venueId, cancellationToken))
            throw new ConflictException("Venue must be disconnected before purging cached QuickBooks data.");

        var eventIds = await _db.Events
            .Where(e => e.VenueId == venueId)
            .Select(e => e.Id)
            .ToListAsync(cancellationToken);

        var syncLedger = await _db.QboSyncLedgers
            .Where(l => eventIds.Contains(l.EventId))
            .ToListAsync(cancellationToken);
        _db.QboSyncLedgers.RemoveRange(syncLedger);

        var unmapped = await _db.UnmappedQboTransactions
            .Where(u => u.VenueId == venueId)
            .ToListAsync(cancellationToken);
        _db.UnmappedQboTransactions.RemoveRange(unmapped);

        var accountMappings = await _db.QboAccountMappings
            .Where(m => m.VenueId == venueId)
            .ToListAsync(cancellationToken);
        _db.QboAccountMappings.RemoveRange(accountMappings);

        var trackingMappings = await _db.QboTrackingMappings
            .Where(m => m.VenueId == venueId)
            .ToListAsync(cancellationToken);
        _db.QboTrackingMappings.RemoveRange(trackingMappings);

        var lineItems = await _db.FinancialLineItems
            .Where(li => eventIds.Contains(li.EventId))
            .ToListAsync(cancellationToken);
        foreach (var lineItem in lineItems)
            lineItem.QboActualValue = 0m;

        await _db.SaveChangesAsync(cancellationToken);
    }
}
