using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class SettlementService
{
    private const int PromoteMaxAttempts = 3;

    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;
    private readonly SignatureValidator _signatureValidator;
    private readonly ISettlementPdfRenderer _pdfRenderer;
    private readonly ISettlementArchiveStore _archiveStore;
    private readonly SettlementArchiveOptions _archiveOptions;
    private readonly IFrozenEventSaveContext _saveContext;
    private readonly ILogger<SettlementService> _logger;

    public SettlementService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        SignatureValidator signatureValidator,
        ISettlementPdfRenderer pdfRenderer,
        ISettlementArchiveStore archiveStore,
        IOptions<SettlementArchiveOptions> archiveOptions,
        IFrozenEventSaveContext saveContext,
        ILogger<SettlementService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _signatureValidator = signatureValidator;
        _pdfRenderer = pdfRenderer;
        _archiveStore = archiveStore;
        _archiveOptions = archiveOptions.Value;
        _saveContext = saveContext;
        _logger = logger;
    }

    public async Task<SettlementResultDto> FinalizeAsync(
        Guid venueId,
        Guid eventId,
        FinalizeSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!request.Confirmed)
            throw new SettlementStateException("Settlement finalization must be explicitly confirmed.");

        var strokes = _signatureValidator.ValidateAndParse(request.SignatureData);

        string? stagingPath = null;
        try
        {
            // Phase A — validate, snapshot, render, stage (no DB transaction)
            var previewEvent = await LoadEventForFinalizeReadAsync(venueId, eventId, cancellationToken);
            ValidateFinalizePreconditions(previewEvent);

            var snapshot = BuildSnapshot(previewEvent);
            var pdfBytes = _pdfRenderer.Render(snapshot, strokes);

            var settlementId = Guid.NewGuid();
            stagingPath = BuildStagingPath(previewEvent, settlementId);
            var finalPath = BuildObjectPath(previewEvent, settlementId);

            await _archiveStore.StageAsync(stagingPath, pdfBytes, cancellationToken);

            // Phase B — short DB transaction for state mutation
            Event evt;
            await using (var transaction = await _db.Database.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    evt = await LoadEventForFinalizeWithLockAsync(venueId, eventId, cancellationToken);

                    if (evt.Status is EventStatus.Settled or EventStatus.Reconciled)
                        throw new ConcurrencyConflictException();

                    ValidateFinalizePreconditions(evt);

                    var settledAt = DateTimeOffset.UtcNow;
                    evt.ArtistSignatureData = request.SignatureData.Trim();
                    evt.SettledAt = settledAt;
                    evt.SettledByUserId = userId;
                    evt.SettlementPdfUrl = BuildObjectReference(finalPath);
                    evt.Status = EventStatus.Settled;

                    await _db.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                }
                catch (DbUpdateConcurrencyException)
                {
                    throw new ConcurrencyConflictException();
                }
            }

            // Phase C — promote to WORM archive, delete staging
            try
            {
                await PromoteWithRetriesAsync(stagingPath, finalPath, cancellationToken);
            }
            catch (SettlementArchiveException)
            {
                await CompensateFailedPromoteAsync(evt, cancellationToken);
                throw;
            }

            await _archiveStore.DeleteStagedAsync(stagingPath, cancellationToken);
            stagingPath = null;

            _logger.LogInformation(
                "Settlement finalized for event {EventId} at venue {VenueId} by user {UserId}",
                eventId,
                venueId,
                userId);

            return ToResultDto(evt);
        }
        catch (ConcurrencyConflictException)
        {
            throw;
        }
        finally
        {
            if (stagingPath is not null)
            {
                try
                {
                    await _archiveStore.DeleteStagedAsync(stagingPath, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to delete staged settlement PDF for event {EventId} at venue {VenueId}",
                        eventId,
                        venueId);
                }
            }
        }
    }

    public async Task<SettlementResultDto> ReverseAsync(
        Guid venueId,
        Guid eventId,
        ReverseSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("Reversal reason is required.");

        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);

        if (evt.Status is not EventStatus.Settled)
            throw new SettlementStateException("Only settled events can be reversed.");

        if (string.IsNullOrWhiteSpace(evt.SettlementPdfUrl))
            throw new SettlementStateException("Event has no settlement PDF to reverse.");

        var previousPdfUrl = evt.SettlementPdfUrl;

        _db.SettlementReversals.Add(new SettlementReversal
        {
            EventId = evt.Id,
            ReversedByUserId = userId,
            Reason = request.Reason.Trim(),
            PreviousPdfUrl = previousPdfUrl,
            ReversedAt = DateTimeOffset.UtcNow
        });

        evt.Status = EventStatus.PreShow;
        evt.SettlementPdfUrl = null;

        using (_saveContext.Authorize(FrozenEventSaveReason.SettlementReversal))
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Settlement reversed for event {EventId} at venue {VenueId} by user {UserId}",
            eventId,
            venueId,
            userId);

        return ToResultDto(evt);
    }

    public async Task<SettlementPdfLinkDto> GetPdfLinkAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        var evt = await _db.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (string.IsNullOrWhiteSpace(evt.SettlementPdfUrl))
            throw new NotFoundException("Settlement PDF is not available for this event.");

        var objectPath = ExtractObjectPath(evt.SettlementPdfUrl);
        var ttl = TimeSpan.FromMinutes(_archiveOptions.SignedUrlTtlMinutes);
        var (url, expiresAt) = await _archiveStore.CreateSignedUrlAsync(objectPath, ttl, cancellationToken);

        return new SettlementPdfLinkDto(url, expiresAt);
    }

    public async Task<EventResponse> ReconcileAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        try
        {
            var evt = await LoadEventForReconcileWithLockAsync(venueId, eventId, cancellationToken);

            if (evt.Status is not EventStatus.Settled)
                throw new SettlementStateException("Event must be in SETTLED status to reconcile.");

            var reconciledAt = DateTimeOffset.UtcNow;
            evt.Status = EventStatus.Reconciled;
            evt.ReconciledAt = reconciledAt;
            evt.ReconciledByUserId = userId;

            using (_saveContext.Authorize(FrozenEventSaveReason.EventReconciliation))
            {
                await _db.SaveChangesAsync(cancellationToken);
            }

            _logger.LogInformation(
                "Event reconciled for event {EventId} at venue {VenueId} by user {UserId}",
                eventId,
                venueId,
                userId);

            return EventService.ToEventResponse(evt);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException();
        }
    }

    internal static SettlementSnapshotDto BuildSnapshot(Event evt)
    {
        var useSettlement = evt.IsBudgetLocked;
        decimal ActiveValue(FinancialLineItem li) => useSettlement ? li.SettlementValue : li.ProformaValue;

        var grossRevenue = evt.LineItems
            .Where(li => li.BlockType == BlockType.Revenue.ToStorage())
            .Sum(ActiveValue);

        var totalDeductions = evt.LineItems
            .Where(li => li.IsArtistDeduction)
            .Sum(ActiveValue);

        var netShowRevenue = grossRevenue - totalDeductions;

        return new SettlementSnapshotDto(
            evt.Title,
            evt.EventDate.ToString("yyyy-MM-dd"),
            evt.Venue.Name,
            evt.Venue.Organization?.Name ?? string.Empty,
            evt.LineItems
                .OrderBy(li => li.BlockType)
                .ThenBy(li => li.SortOrder)
                .Select(li => new SettlementLineItemSnapshot(
                    li.BlockType,
                    li.RowLabel,
                    li.SortOrder,
                    li.IsArtistDeduction,
                    MoneyFormat.ToMoneyString(li.SettlementValue)))
                .ToList(),
            evt.Artists
                .OrderBy(a => a.PerformanceOrder)
                .Select(a => new SettlementArtistSnapshot(
                    a.ArtistName,
                    a.PerformanceOrder,
                    a.DealType,
                    MoneyFormat.ToMoneyString(a.CalculatedNetPayout)))
                .ToList(),
            new SettlementSummarySnapshot(
                MoneyFormat.ToMoneyString(grossRevenue),
                MoneyFormat.ToMoneyString(totalDeductions),
                MoneyFormat.ToMoneyString(netShowRevenue)));
    }

    private async Task PromoteWithRetriesAsync(
        string stagingPath,
        string finalPath,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= PromoteMaxAttempts; attempt++)
        {
            try
            {
                await _archiveStore.PromoteAsync(stagingPath, finalPath, cancellationToken);
                return;
            }
            catch (SettlementArchiveException) when (attempt < PromoteMaxAttempts)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(100 * attempt), cancellationToken);
            }
        }
    }

    private async Task CompensateFailedPromoteAsync(Event evt, CancellationToken cancellationToken)
    {
        evt.Status = EventStatus.PreShow;
        evt.SettlementPdfUrl = null;
        evt.SettledAt = null;
        evt.SettledByUserId = null;
        evt.ArtistSignatureData = null;

        using (_saveContext.Authorize(FrozenEventSaveReason.SettlementReversal))
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogWarning(
            "Rolled back settlement state for event {EventId} after archive promote failure",
            evt.Id);
    }

    private async Task<Event> LoadEventForFinalizeReadAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        if (!await _venueService.IsVenueAccessibleAsync(_tenantContext.UserId!.Value, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
                .ThenInclude(v => v.Organization)
            .Include(e => e.LineItems)
            .Include(e => e.Artists)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return evt;
    }

    private async Task<Event> LoadEventForFinalizeWithLockAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        if (!await _venueService.IsVenueAccessibleAsync(_tenantContext.UserId!.Value, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
             SELECT 1 FROM events
             WHERE id = {eventId} AND venue_id = {venueId}
             FOR UPDATE
             """,
            cancellationToken);

        var evt = await _db.Events
            .Include(e => e.Venue)
                .ThenInclude(v => v.Organization)
            .Include(e => e.LineItems)
            .Include(e => e.Artists)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return evt;
    }

    private async Task<Event> LoadEventForMutationAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        var evt = await _db.Events
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return evt;
    }

    private async Task<Event> LoadEventForReconcileWithLockAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        if (!await _venueService.IsVenueAccessibleAsync(_tenantContext.UserId!.Value, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
             SELECT 1 FROM events
             WHERE id = {eventId} AND venue_id = {venueId}
             FOR UPDATE
             """,
            cancellationToken);

        var evt = await _db.Events
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return evt;
    }

    private static void ValidateFinalizePreconditions(Event evt)
    {
        if (evt.Status is not EventStatus.PreShow)
            throw new SettlementStateException("Settlement can only be finalized while the event is in PRE_SHOW status.");

        if (evt.Status is EventStatus.Settled or EventStatus.Reconciled)
            throw new SettlementStateException("Event is already settled or reconciled.");

        if (!evt.IsBudgetLocked)
            throw new SettlementStateException("Budget must be locked before settlement can be finalized.");
    }

    private static string BuildObjectPath(Event evt, Guid settlementId)
    {
        var orgId = evt.Venue.OrganizationId;
        return $"settlements/{orgId}/{evt.VenueId}/{evt.Id}/{settlementId}.pdf";
    }

    private static string BuildStagingPath(Event evt, Guid settlementId)
    {
        var orgId = evt.Venue.OrganizationId;
        return $"staging/settlements/{orgId}/{evt.VenueId}/{evt.Id}/{settlementId}.pdf";
    }

    private string BuildObjectReference(string objectPath) =>
        string.IsNullOrWhiteSpace(_archiveOptions.BucketName)
            ? objectPath
            : $"gs://{_archiveOptions.BucketName}/{objectPath}";

    internal static string ExtractObjectPath(string storedReference)
    {
        if (storedReference.StartsWith("gs://", StringComparison.OrdinalIgnoreCase))
        {
            var withoutScheme = storedReference["gs://".Length..];
            var slashIndex = withoutScheme.IndexOf('/');
            return slashIndex >= 0 ? withoutScheme[(slashIndex + 1)..] : withoutScheme;
        }

        return storedReference;
    }

    private static SettlementResultDto ToResultDto(Event evt) =>
        new(
            evt.Id,
            EventStatusFormat.ToApiString(evt.Status),
            evt.SettledAt,
            evt.SettledByUserId,
            !string.IsNullOrWhiteSpace(evt.SettlementPdfUrl),
            LedgerService.GetEditability(evt.Status, evt.IsBudgetLocked));
}
