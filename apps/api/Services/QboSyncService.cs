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
    private readonly FrozenEventMutationAuditor _frozenEventAuditor;
    private readonly IQboSyncConcurrencyGate _concurrencyGate;
    private readonly IQboPayloadFilter _payloadFilter;
    private readonly QboTrackingMappingService _trackingMappingService;
    private readonly ILogger<QboSyncService> _logger;

    public QboSyncService(
        ApplicationDbContext db,
        QboTokenService tokenService,
        IQboTransactionClient transactionClient,
        VenueService venueService,
        ITenantContext tenantContext,
        QboSyncCorrectionService correctionService,
        FrozenEventMutationAuditor frozenEventAuditor,
        IQboSyncConcurrencyGate concurrencyGate,
        IQboPayloadFilter payloadFilter,
        QboTrackingMappingService trackingMappingService,
        ILogger<QboSyncService> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _transactionClient = transactionClient;
        _venueService = venueService;
        _tenantContext = tenantContext;
        _correctionService = correctionService;
        _frozenEventAuditor = frozenEventAuditor;
        _concurrencyGate = concurrencyGate;
        _payloadFilter = payloadFilter;
        _trackingMappingService = trackingMappingService;
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

        var trackingName = await ResolveEventTrackingNameAsync(evt, cancellationToken);
        if (string.IsNullOrWhiteSpace(trackingName))
            throw new ValidationException("Event has no QBO tracking mapping configured.");

        var (accessToken, realmId) = await _tokenService.GetValidAccessTokenAsync(venueId, cancellationToken);
        var transactions = await _transactionClient.FetchTransactionsByTagAsync(
            accessToken,
            realmId,
            trackingName,
            cancellationToken: cancellationToken);

        return await ProcessTransactionsAsync(evt, transactions, cancellationToken);
    }

    public async Task<SyncResultDto> SyncEventInternalAsync(
        Guid venueId,
        Guid eventId,
        DateTimeOffset? updatedSince = null,
        CancellationToken cancellationToken = default)
    {
        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        var trackingName = await ResolveEventTrackingNameAsync(evt, cancellationToken);
        if (string.IsNullOrWhiteSpace(trackingName))
            return EmptyResult(eventId);

        if (!await _tokenService.IsConnectedAsync(venueId, cancellationToken))
            return EmptyResult(eventId);

        var (accessToken, realmId) = await _tokenService.GetValidAccessTokenAsync(venueId, cancellationToken);
        var transactions = await _transactionClient.FetchTransactionsByTagAsync(
            accessToken,
            realmId,
            trackingName,
            updatedSince,
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

        var status = new SyncStatusDto(
            eventId,
            lastEntry?.SyncedAt,
            lastEntry?.SyncBatchId,
            mappedCount,
            unmappedCount,
            connected);

        return _payloadFilter.Apply(status);
    }

    public async Task<VenueQboIntegrationDto> GetVenueQboIntegrationAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is Guid userId &&
            !await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var credential = await _tokenService.GetCredentialAsync(venueId, cancellationToken);
        var connectionState = ResolveConnectionState(credential);
        var connected = connectionState == QboConnectionStates.Connected;

        var lastSyncedAt = await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.Event.VenueId == venueId)
            .OrderByDescending(l => l.SyncedAt)
            .Select(l => (DateTimeOffset?)l.SyncedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var canPurgeCache = connectionState == QboConnectionStates.Disconnected &&
            await HasCachedQboDataAsync(venueId, cancellationToken);

        return new VenueQboIntegrationDto(
            venueId,
            connected,
            connectionState,
            credential?.CompanyName,
            credential?.RealmId,
            lastSyncedAt,
            canPurgeCache);
    }

    public async Task<OrganizationQboSummaryDto> GetOrganizationQboSummaryAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (_tenantContext.OrganizationId != organizationId)
            throw new NotFoundException("Organization not found.");

        var venueIds = await _db.Venues
            .AsNoTracking()
            .Where(v => v.OrganizationId == organizationId)
            .Select(v => v.Id)
            .ToListAsync(cancellationToken);

        var accessibleVenueIds = new List<Guid>();
        foreach (var venueId in venueIds)
        {
            if (await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
                accessibleVenueIds.Add(venueId);
        }

        var connectedVenueCount = await _db.QboVenueCredentials
            .AsNoTracking()
            .CountAsync(c => accessibleVenueIds.Contains(c.VenueId) && !c.IsExpired, cancellationToken);

        return new OrganizationQboSummaryDto(
            organizationId,
            connectedVenueCount > 0,
            connectedVenueCount,
            accessibleVenueIds.Count);
    }

    private static string ResolveConnectionState(QboVenueCredential? credential)
    {
        if (credential is null)
            return QboConnectionStates.Disconnected;

        return credential.IsExpired
            ? QboConnectionStates.Expired
            : QboConnectionStates.Connected;
    }

    private async Task<bool> HasCachedQboDataAsync(Guid venueId, CancellationToken cancellationToken)
    {
        if (await _db.QboAccountMappings.AnyAsync(m => m.VenueId == venueId, cancellationToken))
            return true;
        if (await _db.QboTrackingMappings.AnyAsync(m => m.VenueId == venueId, cancellationToken))
            return true;
        if (await _db.UnmappedQboTransactions.AnyAsync(u => u.VenueId == venueId, cancellationToken))
            return true;

        return await _db.QboSyncLedgers
            .AsNoTracking()
            .AnyAsync(l => l.Event.VenueId == venueId, cancellationToken);
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
            .Where(e => e.VenueId == venueId)
            .Select(e => new { e.Id, e.Title })
            .ToListAsync(cancellationToken);

        var results = new List<VenueSyncEventResultDto>();
        var succeeded = 0;

        foreach (var evt in events)
        {
            try
            {
                var trackingName = await _trackingMappingService.ResolveTrackingNameForEventAsync(
                    evt.Id,
                    cancellationToken);
                if (string.IsNullOrWhiteSpace(trackingName))
                    continue;

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
        if (!await _concurrencyGate.TryEnterAsync(cancellationToken))
        {
            _logger.LogInformation(
                "Skipped overlapping QBO sync batch: outcome={Outcome}",
                "skipped-concurrent");
            return 0;
        }

        try
        {
            var venueIds = await _db.QboVenueCredentials
                .AsNoTracking()
                .Select(c => c.VenueId)
                .ToListAsync(cancellationToken);

            return await SyncVenueEventsInternalAsync(venueIds, updatedSince: null, cancellationToken);
        }
        finally
        {
            _concurrencyGate.Release();
        }
    }

    public async Task<int> SyncNightlyEligibleEventsAsync(
        Guid? organizationId = null,
        CancellationToken cancellationToken = default)
    {
        if (!await _concurrencyGate.TryEnterAsync(cancellationToken))
        {
            _logger.LogInformation(
                "Skipped overlapping QBO nightly sync batch: outcome={Outcome}",
                "skipped-concurrent");
            return 0;
        }

        try
        {
            var utcNow = DateTimeOffset.UtcNow;
            var lookbackSince = utcNow.AddHours(-48);

            var orgQuery = _db.Organizations.AsNoTracking();
            if (organizationId is Guid orgId)
                orgQuery = orgQuery.Where(o => o.Id == orgId);

            var organizations = await orgQuery.ToListAsync(cancellationToken);
            var eligibleOrgIds = organizations
                .Where(o => NightlyDispatchSelector.IsOrganizationEligible(o.TimeZoneId, utcNow))
                .Select(o => o.Id)
                .ToList();

            if (eligibleOrgIds.Count == 0)
                return 0;

            var venueIds = await _db.Venues
                .AsNoTracking()
                .Where(v => eligibleOrgIds.Contains(v.OrganizationId))
                .Join(
                    _db.QboVenueCredentials.AsNoTracking().Where(c => !c.IsExpired),
                    v => v.Id,
                    c => c.VenueId,
                    (v, _) => v.Id)
                .ToListAsync(cancellationToken);

            return await SyncVenueEventsInternalAsync(venueIds, lookbackSince, cancellationToken);
        }
        finally
        {
            _concurrencyGate.Release();
        }
    }

    private async Task<int> SyncVenueEventsInternalAsync(
        IReadOnlyList<Guid> venueIds,
        DateTimeOffset? updatedSince,
        CancellationToken cancellationToken)
    {
        var synced = 0;
        foreach (var venueId in venueIds)
        {
            var eventIds = await _db.Events
                .AsNoTracking()
                .Where(e => e.VenueId == venueId)
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);

            foreach (var eventId in eventIds)
            {
                var trackingName = await _trackingMappingService.ResolveTrackingNameForEventAsync(
                    eventId,
                    cancellationToken);
                if (string.IsNullOrWhiteSpace(trackingName))
                    continue;

                await SyncEventInternalAsync(venueId, eventId, updatedSince, cancellationToken);
                synced++;
            }
        }

        return synced;
    }

    private Task<string?> ResolveEventTrackingNameAsync(Event evt, CancellationToken cancellationToken) =>
        _trackingMappingService.ResolveTrackingNameForEventAsync(evt.Id, cancellationToken);

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

        // SETTLED: skip recompute when no new transactions; reject when actuals would change.
        // RECONCILED: sanctioned QboActualValue/UpdatedAt refresh only.
        if (evt.Status != EventStatus.Settled || processed > 0)
        {
            await RecomputeActualsForEventAsync(evt.Id, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }
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
        var evt = await _db.Events
            .AsNoTracking()
            .FirstAsync(e => e.Id == eventId, cancellationToken);

        if (evt.Status == EventStatus.Settled)
        {
            _frozenEventAuditor.RejectIfFrozen(
                evt,
                evt.VenueId,
                _tenantContext.UserId,
                FrozenEventMutationOperation.QboSyncRecompute);
        }

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
