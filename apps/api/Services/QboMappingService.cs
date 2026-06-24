using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class QboMappingService
{
    private readonly ApplicationDbContext _db;
    private readonly QboSyncService _syncService;
    private readonly VenueService _venueService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<QboMappingService> _logger;

    public QboMappingService(
        ApplicationDbContext db,
        QboSyncService syncService,
        VenueService venueService,
        ITenantContext tenantContext,
        ILogger<QboMappingService> logger)
    {
        _db = db;
        _syncService = syncService;
        _venueService = venueService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<QboAccountMappingsResponse> GetMappingsAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mappings = await _db.QboAccountMappings
            .AsNoTracking()
            .Where(m => m.VenueId == venueId)
            .OrderBy(m => m.QboAccountName)
            .Select(m => ToDto(m))
            .ToListAsync(cancellationToken);

        return new QboAccountMappingsResponse(venueId, mappings);
    }

    public async Task<QboAccountMappingDto> CreateMappingAsync(
        Guid venueId,
        CreateMappingRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        if (string.IsNullOrWhiteSpace(request.QboAccountId))
            throw new ValidationException("QBO account ID is required.");
        if (string.IsNullOrWhiteSpace(request.QboAccountName))
            throw new ValidationException("QBO account name is required.");
        if (string.IsNullOrWhiteSpace(request.MappedCategoryLabel))
            throw new ValidationException("Mapped category label is required.");

        var exists = await _db.QboAccountMappings
            .AsNoTracking()
            .AnyAsync(m => m.VenueId == venueId && m.QboAccountId == request.QboAccountId, cancellationToken);

        if (exists)
            throw new QboMappingConflictException(
                $"A mapping already exists for account {request.QboAccountId} at this venue.");

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var mapping = new QboAccountMapping
        {
            VenueId = venueId,
            QboAccountId = request.QboAccountId.Trim(),
            QboAccountName = request.QboAccountName.Trim(),
            MappedCategoryLabel = request.MappedCategoryLabel.Trim(),
            MappedLineItemId = request.MappedLineItemId
        };

        _db.QboAccountMappings.Add(mapping);
        await _db.SaveChangesAsync(cancellationToken);

        await ReprocessUnmappedForAccountAsync(venueId, mapping.QboAccountId, mapping.MappedLineItemId, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        _logger.LogInformation(
            "QBO mapping created for venue {VenueId}, account {AccountId}",
            venueId,
            mapping.QboAccountId);

        return ToDto(mapping);
    }

    public async Task<QboAccountMappingDto> UpdateMappingAsync(
        Guid venueId,
        Guid mappingId,
        UpdateMappingRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mapping = await _db.QboAccountMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Mapping not found.");

        if (string.IsNullOrWhiteSpace(request.MappedCategoryLabel))
            throw new ValidationException("Mapped category label is required.");

        mapping.MappedCategoryLabel = request.MappedCategoryLabel.Trim();
        mapping.MappedLineItemId = request.MappedLineItemId;
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(mapping);
    }

    public async Task DeleteMappingAsync(
        Guid venueId,
        Guid mappingId,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mapping = await _db.QboAccountMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Mapping not found.");

        _db.QboAccountMappings.Remove(mapping);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("QBO mapping {MappingId} deleted for venue {VenueId}", mappingId, venueId);
    }

    public async Task<UnmappedTransactionsResponse> GetUnmappedTransactionsAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await EnsureEventAccessibleAsync(venueId, eventId, cancellationToken);

        var transactions = await _db.UnmappedQboTransactions
            .AsNoTracking()
            .Where(u => u.EventId == eventId)
            .OrderBy(u => u.TransactionDate)
            .Select(u => new UnmappedTransactionDto(
                u.Id,
                u.QboTransactionId,
                u.QboAccountId,
                u.QboAccountName,
                u.Amount,
                u.TransactionDate,
                u.SyncedAt))
            .ToListAsync(cancellationToken);

        return new UnmappedTransactionsResponse(eventId, venueId, transactions.Count, transactions);
    }

    public async Task<UnmappedCountDto> GetUnmappedCountAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await EnsureEventAccessibleAsync(venueId, eventId, cancellationToken);

        var count = await _db.UnmappedQboTransactions
            .AsNoTracking()
            .CountAsync(u => u.EventId == eventId, cancellationToken);

        return new UnmappedCountDto(eventId, count);
    }

    internal async Task ReprocessUnmappedForAccountAsync(
        Guid venueId,
        string qboAccountId,
        Guid? mappedLineItemId,
        CancellationToken cancellationToken)
    {
        var unmappedRows = await _db.UnmappedQboTransactions
            .Where(u => u.VenueId == venueId && u.QboAccountId == qboAccountId)
            .ToListAsync(cancellationToken);

        if (unmappedRows.Count == 0)
            return;

        var syncBatchId = Guid.NewGuid();
        var syncedAt = DateTimeOffset.UtcNow;
        var affectedEvents = new HashSet<Guid>();

        foreach (var row in unmappedRows)
        {
            var alreadySynced = await _db.QboSyncLedgers
                .AsNoTracking()
                .AnyAsync(l => l.EventId == row.EventId && l.QboTransactionId == row.QboTransactionId, cancellationToken);

            if (!alreadySynced)
            {
                _db.QboSyncLedgers.Add(new QboSyncLedger
                {
                    EventId = row.EventId,
                    QboTransactionId = row.QboTransactionId,
                    QboAccountId = row.QboAccountId,
                    Amount = row.Amount,
                    TransactionDate = row.TransactionDate,
                    MappedLineItemId = mappedLineItemId,
                    SyncBatchId = syncBatchId,
                    SyncedAt = syncedAt,
                    EntryType = QboSyncLedgerEntryType.Original
                });
            }

            affectedEvents.Add(row.EventId);
            _db.UnmappedQboTransactions.Remove(row);
        }

        await _db.SaveChangesAsync(cancellationToken);

        foreach (var eventId in affectedEvents)
            await _syncService.RecomputeActualsForEventAsync(eventId, cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureVenueAccessibleAsync(Guid venueId, CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");
    }

    private async Task EnsureEventAccessibleAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var exists = await _db.Events
            .AsNoTracking()
            .AnyAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken);

        if (!exists)
            throw new NotFoundException("Event not found.");
    }

    private static QboAccountMappingDto ToDto(QboAccountMapping mapping) =>
        new(
            mapping.Id,
            mapping.QboAccountId,
            mapping.QboAccountName,
            mapping.MappedCategoryLabel,
            mapping.MappedLineItemId,
            mapping.CreatedAt);
}
