using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class QboSyncService
{
    private readonly ApplicationDbContext _db;
    private readonly QboTokenService _tokenService;
    private readonly IQboTransactionClient _transactionClient;
    private readonly VenueService _venueService;
    private readonly ITenantContext _tenantContext;
    private readonly QboSyncCorrectionService _correctionService;
    private readonly ILogger<QboSyncService> _logger;

    public QboSyncService(
        ApplicationDbContext db,
        QboTokenService tokenService,
        IQboTransactionClient transactionClient,
        VenueService venueService,
        ITenantContext tenantContext,
        QboSyncCorrectionService correctionService,
        ILogger<QboSyncService> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _transactionClient = transactionClient;
        _venueService = venueService;
        _tenantContext = tenantContext;
        _correctionService = correctionService;
        _logger = logger;
    }

    public async Task<SyncResultDto> SyncEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is Guid userId &&
            !await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (string.IsNullOrWhiteSpace(evt.QboTagName))
            throw new ValidationException("Event has no QBO tag name configured.");

        var (accessToken, realmId) = await _tokenService.GetValidAccessTokenAsync(venueId, cancellationToken);
        var transactions = await _transactionClient.FetchTransactionsByTagAsync(
            accessToken,
            realmId,
            evt.QboTagName,
            cancellationToken);

        return await ProcessTransactionsAsync(evt, transactions, cancellationToken);
    }

    public async Task<SyncResultDto> SyncEventInternalAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (string.IsNullOrWhiteSpace(evt.QboTagName))
            return EmptyResult(eventId);

        if (!await _tokenService.IsConnectedAsync(venueId, cancellationToken))
            return EmptyResult(eventId);

        var (accessToken, realmId) = await _tokenService.GetValidAccessTokenAsync(venueId, cancellationToken);
        var transactions = await _transactionClient.FetchTransactionsByTagAsync(
            accessToken,
            realmId,
            evt.QboTagName,
            cancellationToken);

        return await ProcessTransactionsAsync(evt, transactions, cancellationToken);
    }

    public async Task<SyncStatusDto> GetSyncStatusAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is Guid userId &&
            !await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        var evt = await _db.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        var lastEntry = await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.EventId == eventId)
            .OrderByDescending(l => l.SyncedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var mappedCount = await _db.QboSyncLedgers
            .AsNoTracking()
            .CountAsync(l => l.EventId == eventId, cancellationToken);

        var unmappedCount = await _db.UnmappedQboTransactions
            .AsNoTracking()
            .CountAsync(u => u.EventId == eventId, cancellationToken);

        var connected = await _tokenService.IsConnectedAsync(venueId, cancellationToken);

        return new SyncStatusDto(
            eventId,
            lastEntry?.SyncedAt,
            lastEntry?.SyncBatchId,
            mappedCount,
            unmappedCount,
            connected);
    }

    public async Task<VenueQboStatusDto> GetVenueQboStatusAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is Guid userId &&
            !await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var connected = await _tokenService.IsConnectedAsync(venueId, cancellationToken);

        var lastSyncedAt = await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.Event.VenueId == venueId)
            .OrderByDescending(l => l.SyncedAt)
            .Select(l => (DateTimeOffset?)l.SyncedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return new VenueQboStatusDto(venueId, connected, lastSyncedAt);
    }

    public async Task<VenueSyncResultDto> SyncVenueEventsAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is Guid userId &&
            !await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var events = await _db.Events
            .AsNoTracking()
            .Where(e => e.VenueId == venueId && e.QboTagName != "")
            .Select(e => new { e.Id, e.Title })
            .ToListAsync(cancellationToken);

        var results = new List<VenueSyncEventResultDto>();
        var succeeded = 0;

        foreach (var evt in events)
        {
            try
            {
                await SyncEventAsync(venueId, evt.Id, cancellationToken);
                results.Add(new VenueSyncEventResultDto(evt.Id, evt.Title, true, null));
                succeeded++;
            }
            catch (ApiException ex)
            {
                _logger.LogWarning(ex, "Venue sync failed for event {EventId} at venue {VenueId}", evt.Id, venueId);
                results.Add(new VenueSyncEventResultDto(evt.Id, evt.Title, false, ex.Message));
            }
        }

        return new VenueSyncResultDto(venueId, events.Count, succeeded, results);
    }

    public async Task<int> SyncAllEligibleEventsAsync(CancellationToken cancellationToken = default)
    {
        var venueIds = await _db.QboVenueCredentials
            .AsNoTracking()
            .Select(c => c.VenueId)
            .ToListAsync(cancellationToken);

        var synced = 0;
        foreach (var venueId in venueIds)
        {
            var eventIds = await _db.Events
                .AsNoTracking()
                .Where(e => e.VenueId == venueId && e.QboTagName != "")
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);

            foreach (var eventId in eventIds)
            {
                await SyncEventInternalAsync(venueId, eventId, cancellationToken);
                synced++;
            }
        }

        return synced;
    }

    internal async Task<SyncResultDto> ProcessTransactionsAsync(
        Event evt,
        IReadOnlyList<QboFetchedTransaction> transactions,
        CancellationToken cancellationToken)
    {
        var syncBatchId = Guid.NewGuid();
        var syncedAt = DateTimeOffset.UtcNow;
        var lockKey = BitConverter.ToInt64(evt.Id.ToByteArray()[..8]);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        if (_db.Database.IsRelational())
        {
            await _db.Database.ExecuteSqlRawAsync(
                "SELECT pg_advisory_xact_lock({0})",
                [lockKey],
                cancellationToken);
        }

        var mappings = await _db.QboAccountMappings
            .AsNoTracking()
            .Where(m => m.VenueId == evt.VenueId)
            .ToDictionaryAsync(m => m.QboAccountId, m => m, cancellationToken);

        var existingLedgerIds = (await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.EventId == evt.Id)
            .Select(l => l.QboTransactionId)
            .ToListAsync(cancellationToken)).ToHashSet(StringComparer.Ordinal);

        var processed = 0;
        var mapped = 0;
        var unmapped = 0;
        var unmappedAccountIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var txn in transactions)
        {
            if (existingLedgerIds.Contains(txn.TransactionId))
                continue;

            if (await _db.UnmappedQboTransactions
                .AsNoTracking()
                .AnyAsync(u => u.EventId == evt.Id && u.QboTransactionId == txn.TransactionId, cancellationToken))
                continue;

            processed++;

            if (mappings.TryGetValue(txn.AccountId, out var mapping))
            {
                _db.QboSyncLedgers.Add(new QboSyncLedger
                {
                    EventId = evt.Id,
                    QboTransactionId = txn.TransactionId,
                    QboAccountId = txn.AccountId,
                    Amount = txn.Amount,
                    TransactionDate = txn.TransactionDate,
                    MappedLineItemId = mapping.MappedLineItemId,
                    SyncBatchId = syncBatchId,
                    SyncedAt = syncedAt,
                    EntryType = QboSyncLedgerEntryType.Original
                });
                mapped++;
            }
            else
            {
                _db.UnmappedQboTransactions.Add(new UnmappedQboTransaction
                {
                    EventId = evt.Id,
                    VenueId = evt.VenueId,
                    QboTransactionId = txn.TransactionId,
                    QboAccountId = txn.AccountId,
                    QboAccountName = txn.AccountName,
                    Amount = txn.Amount,
                    TransactionDate = txn.TransactionDate,
                    SyncedAt = syncedAt
                });
                unmapped++;
                unmappedAccountIds.Add(txn.AccountId);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        var offsetsCreated = await _correctionService.ApplyCorrectionsAsync(
            evt.Id,
            transactions,
            syncBatchId,
            syncedAt,
            cancellationToken);
        if (offsetsCreated > 0)
            await _db.SaveChangesAsync(cancellationToken);

        // Constitution V exception: QBO actuals aggregate may update on SETTLED/RECONCILED events.
        await RecomputeActualsForEventAsync(evt.Id, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        _logger.LogInformation(
            "QBO sync completed for event {EventId}: processed={Processed}, mapped={Mapped}, unmapped={Unmapped}, offsetsCreated={OffsetsCreated}, syncBatchId={SyncBatchId}",
            evt.Id,
            processed,
            mapped,
            unmapped,
            offsetsCreated,
            syncBatchId);

        return new SyncResultDto(
            evt.Id,
            syncBatchId,
            processed,
            mapped,
            unmapped,
            unmappedAccountIds.ToList(),
            syncedAt);
    }

    internal async Task RecomputeActualsForEventAsync(Guid eventId, CancellationToken cancellationToken)
    {
        var sums = await _db.QboSyncLedgers
            .Where(l => l.EventId == eventId && l.MappedLineItemId != null)
            .GroupBy(l => l.MappedLineItemId)
            .Select(g => new { LineItemId = g.Key!.Value, Total = g.Sum(x => x.Amount) })
            .ToListAsync(cancellationToken);

        var lineItems = await _db.FinancialLineItems
            .Where(li => li.EventId == eventId)
            .ToListAsync(cancellationToken);

        var sumLookup = sums.ToDictionary(s => s.LineItemId, s => s.Total);
        foreach (var lineItem in lineItems)
        {
            lineItem.QboActualValue = sumLookup.GetValueOrDefault(lineItem.Id, 0m);
            lineItem.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private static SyncResultDto EmptyResult(Guid eventId) =>
        new(eventId, Guid.Empty, 0, 0, 0, [], DateTimeOffset.UtcNow);
}
