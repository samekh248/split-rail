using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class LedgerService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;
    private readonly DealMathEngine _dealMathEngine;
    private readonly FrozenEventMutationAuditor _frozenEventAuditor;
    private readonly QboTokenService _tokenService;
    private readonly IQboPayloadFilter _payloadFilter;
    private readonly ILogger<LedgerService> _logger;

    public LedgerService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        DealMathEngine dealMathEngine,
        FrozenEventMutationAuditor frozenEventAuditor,
        QboTokenService tokenService,
        IQboPayloadFilter payloadFilter,
        ILogger<LedgerService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _dealMathEngine = dealMathEngine;
        _frozenEventAuditor = frozenEventAuditor;
        _tokenService = tokenService;
        _payloadFilter = payloadFilter;
        _logger = logger;
    }

    public async Task<LedgerGridResponse> GetLedgerAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForReadAsync(venueId, eventId, cancellationToken);
        var hidePromoterRows = await IsPromoterRoleAsync(cancellationToken);
        var correctionLineItemIds = await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.EventId == eventId
                && l.EntryType == QboSyncLedgerEntryType.OffsetCorrection
                && l.MappedLineItemId != null)
            .Select(l => l.MappedLineItemId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);
        var connected = await _tokenService.IsConnectedAsync(venueId, cancellationToken);
        var grid = BuildLedgerGrid(evt, hidePromoterRows, correctionLineItemIds.ToHashSet());
        return _payloadFilter.Apply(grid, connected);
    }

    public async Task<LedgerGridResponse> RecalculateAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertNotSettledOrReconciled(evt, venueId, FrozenEventMutationOperation.Recalculate);
        await RecalculateAndPersistAsync(evt, cancellationToken);
        var hidePromoterRows = await IsPromoterRoleAsync(cancellationToken);
        var correctionLineItemIds = await _db.QboSyncLedgers
            .AsNoTracking()
            .Where(l => l.EventId == eventId
                && l.EntryType == QboSyncLedgerEntryType.OffsetCorrection
                && l.MappedLineItemId != null)
            .Select(l => l.MappedLineItemId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);
        return BuildLedgerGrid(evt, hidePromoterRows, correctionLineItemIds.ToHashSet());
    }

    public async Task<EventResponse> LockBudgetAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);

        _frozenEventAuditor.RejectIfFrozen(
            evt,
            venueId,
            _tenantContext.UserId,
            FrozenEventMutationOperation.LockBudget,
            "Cannot lock budget when event is settled or reconciled.");

        if (evt.IsBudgetLocked)
            return EventService.ToEventResponse(evt);

        evt.IsBudgetLocked = true;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Budget locked for event {EventId}", eventId);

        return EventService.ToEventResponse(evt);
    }

    public async Task<LineItemDto> CreateLineItemAsync(
        Guid venueId,
        Guid eventId,
        CreateLineItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertNotSettledOrReconciled(evt, venueId, FrozenEventMutationOperation.CreateLineItem);
        await ValidateLineItemStructuralEditAsync(evt, cancellationToken);
        ValidateBlockType(request.BlockType);

        var canEditSettlement = await HasPermissionAsync(r => r.CanEditSettlement, cancellationToken);
        await ValidateLineItemColumnEditAsync(
            evt,
            request.ProformaValue,
            request.SettlementValue,
            0m,
            0m,
            canEditSettlement,
            cancellationToken);

        var lineItem = new FinancialLineItem
        {
            EventId = evt.Id,
            BlockType = BlockTypeExtensions.FromStorage(request.BlockType).ToStorage(),
            RowLabel = request.RowLabel.Trim(),
            SortOrder = request.SortOrder,
            IsArtistDeduction = request.IsArtistDeduction,
            ProformaValue = request.ProformaValue,
            SettlementValue = request.SettlementValue,
            Notes = request.Notes,
            IsHiddenFromPromoter = request.IsHiddenFromPromoter,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.FinancialLineItems.Add(lineItem);
        await _db.SaveChangesAsync(cancellationToken);

        await RecalculateAndPersistAsync(evt, cancellationToken);

        await _db.Entry(lineItem).ReloadAsync(cancellationToken);

        return ToLineItemDto(lineItem);
    }

    public async Task<LineItemDto> UpdateLineItemAsync(
        Guid venueId,
        Guid eventId,
        Guid lineItemId,
        UpdateLineItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertNotSettledOrReconciled(evt, venueId, FrozenEventMutationOperation.UpdateLineItem);
        await ValidateLineItemStructuralEditAsync(evt, cancellationToken);

        var lineItem = await _db.FinancialLineItems
            .FirstOrDefaultAsync(li => li.Id == lineItemId && li.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Line item not found.");

        var canEditSettlement = await HasPermissionAsync(r => r.CanEditSettlement, cancellationToken);
        await ValidateLineItemColumnEditAsync(
            evt,
            request.ProformaValue,
            request.SettlementValue,
            lineItem.ProformaValue,
            lineItem.SettlementValue,
            canEditSettlement,
            cancellationToken);

        lineItem.RowLabel = request.RowLabel.Trim();
        lineItem.SortOrder = request.SortOrder;
        lineItem.IsArtistDeduction = request.IsArtistDeduction;
        lineItem.ProformaValue = request.ProformaValue;
        lineItem.SettlementValue = request.SettlementValue;
        lineItem.Notes = request.Notes;
        lineItem.IsHiddenFromPromoter = request.IsHiddenFromPromoter;
        lineItem.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Entry(lineItem).Property(li => li.Xmin).OriginalValue =
            RowVersionFormat.FromRowVersion(request.RowVersion);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException();
        }

        await RecalculateAndPersistAsync(evt, cancellationToken);
        await _db.Entry(lineItem).ReloadAsync(cancellationToken);

        return ToLineItemDto(lineItem);
    }

    public async Task DeleteLineItemAsync(
        Guid venueId,
        Guid eventId,
        Guid lineItemId,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertNotSettledOrReconciled(evt, venueId, FrozenEventMutationOperation.DeleteLineItem);
        await ValidateLineItemStructuralEditAsync(evt, cancellationToken);

        var lineItem = await _db.FinancialLineItems
            .FirstOrDefaultAsync(li => li.Id == lineItemId && li.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Line item not found.");

        _db.FinancialLineItems.Remove(lineItem);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException();
        }

        await RecalculateAndPersistAsync(evt, cancellationToken);
    }

    public async Task<EventArtistDto> CreateArtistAsync(
        Guid venueId,
        Guid eventId,
        CreateArtistRequest request,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertArtistEditable(evt, venueId, FrozenEventMutationOperation.CreateArtist);
        await ValidateArtistStructuralEditAsync(evt, cancellationToken);

        var dealType = ParseDealType(request.DealType);
        ValidateArtistDeal(dealType, request.CustomFormulaExpression);

        var artist = new EventArtist
        {
            EventId = evt.Id,
            ArtistName = request.ArtistName.Trim(),
            PerformanceOrder = request.PerformanceOrder,
            DealType = dealType.ToStorage(),
            CustomFormulaExpression = request.CustomFormulaExpression,
            BaseGuarantee = request.BaseGuarantee,
            BackendPercentage = request.BackendPercentage,
            TaxWithholdingPercentage = request.TaxWithholdingPercentage
        };

        _db.EventArtists.Add(artist);
        await _db.SaveChangesAsync(cancellationToken);

        try
        {
            await RecalculateAndPersistAsync(evt, cancellationToken);
        }
        catch (FormulaEvaluationException ex)
        {
            _db.EventArtists.Remove(artist);
            await _db.SaveChangesAsync(cancellationToken);
            throw new FormulaEvaluationException(ex.Message, artist.Id);
        }

        await _db.Entry(artist).ReloadAsync(cancellationToken);

        return ToArtistDto(artist);
    }

    public async Task<EventArtistDto> UpdateArtistAsync(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        UpdateArtistRequest request,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertArtistEditable(evt, venueId, FrozenEventMutationOperation.UpdateArtist);
        await ValidateArtistStructuralEditAsync(evt, cancellationToken);

        var artist = await _db.EventArtists
            .FirstOrDefaultAsync(a => a.Id == artistId && a.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Artist not found.");

        var dealType = ParseDealType(request.DealType);
        ValidateArtistDeal(dealType, request.CustomFormulaExpression);

        artist.ArtistName = request.ArtistName.Trim();
        artist.PerformanceOrder = request.PerformanceOrder;
        artist.DealType = dealType.ToStorage();
        artist.CustomFormulaExpression = request.CustomFormulaExpression;
        artist.BaseGuarantee = request.BaseGuarantee;
        artist.BackendPercentage = request.BackendPercentage;
        artist.TaxWithholdingPercentage = request.TaxWithholdingPercentage;
        _db.Entry(artist).Property(a => a.Xmin).OriginalValue =
            RowVersionFormat.FromRowVersion(request.RowVersion);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            await RecalculateAndPersistAsync(evt, cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException();
        }
        catch (FormulaEvaluationException ex)
        {
            throw new FormulaEvaluationException(ex.Message, artist.Id);
        }

        await _db.Entry(artist).ReloadAsync(cancellationToken);

        return ToArtistDto(artist);
    }

    public async Task DeleteArtistAsync(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken = default)
    {
        var evt = await LoadEventForMutationAsync(venueId, eventId, cancellationToken);
        AssertArtistEditable(evt, venueId, FrozenEventMutationOperation.DeleteArtist);
        await ValidateArtistStructuralEditAsync(evt, cancellationToken);

        var artist = await _db.EventArtists
            .FirstOrDefaultAsync(a => a.Id == artistId && a.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Artist not found.");

        _db.EventArtists.Remove(artist);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConcurrencyConflictException();
        }

        await RecalculateAndPersistAsync(evt, cancellationToken);
    }

    public static EditabilityDto GetEditability(EventStatus status, bool isBudgetLocked) =>
        status switch
        {
            EventStatus.Settled => new EditabilityDto("read-only", "read-only", "read-only"),
            EventStatus.Reconciled => new EditabilityDto("read-only", "read-only", "read-only"),
            EventStatus.PreShow when !isBudgetLocked => new EditabilityDto("editable", "locked", "locked"),
            EventStatus.PreShow => new EditabilityDto("read-only", "editable", "locked"),
            _ => new EditabilityDto("locked", "locked", "locked")
        };

    private void AssertNotSettledOrReconciled(Event evt, Guid venueId, string operation) =>
        _frozenEventAuditor.RejectIfFrozen(evt, venueId, _tenantContext.UserId, operation);

    private void AssertArtistEditable(Event evt, Guid venueId, string operation)
    {
        if (evt.Status is EventStatus.PreShow)
            return;

        if (evt.Status is EventStatus.Settled or EventStatus.Reconciled)
        {
            _frozenEventAuditor.RejectIfFrozen(
                evt,
                venueId,
                _tenantContext.UserId,
                operation,
                "Artist configuration is only permitted while event is in PRE_SHOW status.");
        }

        throw new LedgerStateException(
            "Artist configuration is only permitted while event is in PRE_SHOW status.");
    }

    private async Task RecalculateAndPersistAsync(Event evt, CancellationToken cancellationToken)
    {
        await _db.Entry(evt).Collection(e => e.LineItems).LoadAsync(cancellationToken);
        await _db.Entry(evt).Collection(e => e.Artists).LoadAsync(cancellationToken);

        var (grossRevenue, totalDeductions, netShowRevenue) = ComputeSummary(evt);

        foreach (var artist in evt.Artists)
        {
            try
            {
                var dealType = DealTypeExtensions.FromStorage(artist.DealType);
                artist.CalculatedNetPayout = _dealMathEngine.CalculateNetPayout(
                    dealType,
                    netShowRevenue,
                    grossRevenue,
                    totalDeductions,
                    artist.BaseGuarantee,
                    artist.BackendPercentage,
                    artist.TaxWithholdingPercentage,
                    artist.CustomFormulaExpression);
            }
            catch (FormulaEvaluationException ex)
            {
                throw new FormulaEvaluationException(ex.Message, artist.Id);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static (decimal GrossRevenue, decimal TotalDeductions, decimal NetShowRevenue) ComputeSummary(Event evt)
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

        return (grossRevenue, totalDeductions, netShowRevenue);
    }

    private LedgerGridResponse BuildLedgerGrid(
        Event evt,
        bool hidePromoterRows,
        IReadOnlySet<Guid> correctionLineItemIds)
    {
        var lineItems = hidePromoterRows
            ? evt.LineItems.Where(li => !li.IsHiddenFromPromoter).ToList()
            : evt.LineItems.ToList();

        var blockTypes = new[] { BlockType.Revenue, BlockType.Expenses, BlockType.DealMath };
        var blocks = blockTypes.Select(blockType =>
        {
            var rows = lineItems
                .Where(li => li.BlockType == blockType.ToStorage())
                .OrderBy(li => li.SortOrder)
                .Select(li => ToLineItemDto(li, correctionLineItemIds.Contains(li.Id)))
                .ToList();

            var blockTotals = new BlockTotalsDto(
                rows.Sum(r => r.ProformaValue),
                rows.Sum(r => r.SettlementValue),
                rows.Sum(r => r.QboActualValue));

            return new LedgerBlockDto(blockType.ToStorage(), rows, blockTotals);
        }).ToList();

        var (grossRevenue, totalDeductions, netShowRevenue) = ComputeSummary(evt);

        return new LedgerGridResponse(
            evt.Id,
            evt.VenueId,
            evt.Title,
            evt.EventDate.ToString("yyyy-MM-dd"),
            EventStatusFormat.ToApiString(evt.Status),
            evt.IsBudgetLocked,
            evt.QboTagName,
            GetEditability(evt.Status, evt.IsBudgetLocked),
            blocks,
            evt.Artists.OrderBy(a => a.PerformanceOrder).Select(ToArtistDto).ToList(),
            new LedgerSummaryDto(grossRevenue, totalDeductions, netShowRevenue),
            evt.SettledAt,
            !string.IsNullOrWhiteSpace(evt.SettlementPdfUrl));
    }

    private async Task<Event> LoadEventForReadAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
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
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var evt = await _db.Events
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        return evt;
    }

    private async Task EnsureVenueAccessibleAsync(Guid venueId, CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");
    }

    private async Task ValidateLineItemStructuralEditAsync(
        Event evt,
        CancellationToken cancellationToken)
    {
        if (evt.Status is not EventStatus.PreShow)
            throw new LedgerStateException("Event is not in PRE_SHOW and cannot be modified.");

        if (evt.IsBudgetLocked)
        {
            if (!await HasPermissionAsync(r => r.CanEditSettlement, cancellationToken))
                throw new AuthorizationException("Missing permission to edit settlement values.");
        }
        else if (!await HasPermissionAsync(r => r.CanViewFinancials, cancellationToken))
        {
            throw new AuthorizationException("Missing permission to edit proforma values.");
        }
    }

    private Task ValidateArtistStructuralEditAsync(
        Event evt,
        CancellationToken cancellationToken) =>
        ValidateLineItemStructuralEditAsync(evt, cancellationToken);

    private async Task ValidateLineItemColumnEditAsync(
        Event evt,
        decimal newProforma,
        decimal newSettlement,
        decimal oldProforma,
        decimal oldSettlement,
        bool canEditSettlement,
        CancellationToken cancellationToken)
    {
        var proformaChanged = newProforma != oldProforma;
        var settlementChanged = newSettlement != oldSettlement;

        if (proformaChanged)
        {
            if (evt.Status is not EventStatus.PreShow || evt.IsBudgetLocked)
                throw new LedgerStateException("Proforma column is not editable in the current event state.");

            if (!await HasPermissionAsync(r => r.CanViewFinancials, cancellationToken))
                throw new AuthorizationException("Missing permission to edit proforma values.");
        }

        if (settlementChanged)
        {
            if (evt.Status is not EventStatus.PreShow || !evt.IsBudgetLocked)
                throw new LedgerStateException("Settlement column is not editable in the current event state.");

            if (!canEditSettlement)
                throw new AuthorizationException("Missing permission to edit settlement values.");
        }
    }

    private async Task<bool> HasPermissionAsync(
        Func<Models.OrganizationRole, bool> predicate,
        CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId || _tenantContext.OrganizationId is not Guid orgId)
            return false;

        var role = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Role)
            .Where(m => m.UserId == userId && m.OrganizationId == orgId)
            .Select(m => m.Role)
            .FirstOrDefaultAsync(cancellationToken);

        return role is not null && predicate(role);
    }

    private async Task<bool> IsPromoterRoleAsync(CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId || _tenantContext.OrganizationId is not Guid orgId)
            return false;

        var roleName = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Role)
            .Where(m => m.UserId == userId && m.OrganizationId == orgId)
            .Select(m => m.Role.RoleName)
            .FirstOrDefaultAsync(cancellationToken);

        return roleName == RoleNames.Promoter;
    }

    private static LineItemDto ToLineItemDto(FinancialLineItem li, bool hasQboCorrection = false)
    {
        var variance = li.QboActualValue - li.SettlementValue;
        return new LineItemDto(
            li.Id,
            li.RowLabel,
            li.SortOrder,
            li.IsArtistDeduction,
            li.ProformaValue,
            li.SettlementValue,
            Math.Abs(variance) > 0m,
            li.Notes,
            li.IsHiddenFromPromoter,
            RowVersionFormat.ToRowVersion(li.Xmin),
            li.QboActualValue,
            variance,
            hasQboCorrection);
    }

    private static EventArtistDto ToArtistDto(EventArtist artist) =>
        new(
            artist.Id,
            artist.ArtistName,
            artist.PerformanceOrder,
            artist.DealType,
            artist.CustomFormulaExpression,
            artist.BaseGuarantee,
            artist.BackendPercentage,
            artist.TaxWithholdingPercentage,
            artist.CalculatedNetPayout,
            RowVersionFormat.ToRowVersion(artist.Xmin));

    private static void ValidateBlockType(string blockType)
    {
        try
        {
            BlockTypeExtensions.FromStorage(blockType);
        }
        catch (ArgumentOutOfRangeException)
        {
            throw new ValidationException($"Invalid block type: {blockType}");
        }
    }

    private static DealType ParseDealType(string dealType)
    {
        try
        {
            return DealTypeExtensions.FromStorage(dealType);
        }
        catch (ArgumentOutOfRangeException)
        {
            throw new ValidationException($"Invalid deal type: {dealType}");
        }
    }

    private static void ValidateArtistDeal(DealType dealType, string? customFormulaExpression)
    {
        if (dealType == DealType.Custom && string.IsNullOrWhiteSpace(customFormulaExpression))
            throw new ValidationException("Custom formula expression is required for custom deal type.");
    }
}
