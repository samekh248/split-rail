using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Isolated sub-settlement execution for a single Programming Block.
///
/// Finalization is all-or-nothing and mirrors the proven event-settlement pipeline:
///   Phase A — validate, snapshot, render PDF, stage the artifact (no DB transaction)
///   Phase B — short locked transaction: re-check state, re-check bucket over-allocation,
///             write the finalized record + revision + audit
///   Phase C — promote the staged artifact and record dispatch
/// Any failure at any step leaves the settlement in Draft with nothing partially applied
/// (spec FR-029).
/// </summary>
public class BlockSettlementService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAllocationService _allocations;
    private readonly FestivalAuditService _audit;
    private readonly ISettlementArchiveStore _archiveStore;
    private readonly IBlockSettlementDocumentRenderer _documentRenderer;
    private readonly IFrozenEventSaveContext _saveContext;
    private readonly ILogger<BlockSettlementService> _logger;

    public BlockSettlementService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAllocationService allocations,
        FestivalAuditService audit,
        ISettlementArchiveStore archiveStore,
        IBlockSettlementDocumentRenderer documentRenderer,
        IFrozenEventSaveContext saveContext,
        ILogger<BlockSettlementService> logger)
    {
        _db = db;
        _guard = guard;
        _allocations = allocations;
        _audit = audit;
        _archiveStore = archiveStore;
        _documentRenderer = documentRenderer;
        _saveContext = saveContext;
        _logger = logger;
    }

    // ---- Sheet -----------------------------------------------------------

    public async Task<BlockSettlementSheetResponse> GetSheetAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: false, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        return await BuildSheetAsync(block, cancellationToken);
    }

    public async Task<BlockSettlementSheetResponse> UpdateDealTermsAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        UpdateBlockDealTermsRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAdjustAuthorityAsync(cancellationToken);

        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);
        AssertDraft(block);

        block.DealType = ParseDealType(request.DealType);
        block.BaseGuarantee = NonNegative(request.BaseGuarantee, "Guarantee");
        block.BackendPercentage = NonNegative(request.BackendPercentage, "Backend percentage");
        block.PercentBasis = PercentBasisFormat.FromApiString(request.PercentBasis);
        block.CapAmount = request.CapAmount;
        block.FloorAmount = request.FloorAmount;
        block.BonusThresholdAmount = request.BonusThresholdAmount;
        block.BonusAmount = request.BonusAmount;
        block.TaxWithholdingPercentage = NonNegative(
            request.TaxWithholdingPercentage, "Tax withholding percentage");
        block.CustomFormulaExpression = request.CustomFormulaExpression;

        if (block.SettlementStatus == BlockSettlementStatus.NotRequired)
        {
            block.RequiresSettlement = true;
            block.SettlementStatus = BlockSettlementStatus.Draft;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return await BuildSheetAsync(block, cancellationToken);
    }

    public async Task<BlockSettlementLineItemDto> AddLineItemAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CreateBlockSettlementLineItemRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAdjustAuthorityAsync(cancellationToken);

        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);
        AssertDraft(block);

        var lineType = BlockSettlementLineTypeFormat.FromApiString(request.LineType);
        var label = (request.Label ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(label))
            throw new ValidationException("Line item label is required.");

        var lineItem = new BlockSettlementLineItem
        {
            Id = Guid.NewGuid(),
            ProgrammingBlockId = blockId,
            LineType = lineType,
            Label = label,
            Amount = request.Amount,
            EnteredByUserId = _guard.RequireUserId(),
            EnteredAt = DateTimeOffset.UtcNow
        };

        _db.BlockSettlementLineItems.Add(lineItem);
        await _db.SaveChangesAsync(cancellationToken);

        return new BlockSettlementLineItemDto(
            lineItem.Id,
            BlockSettlementLineTypeFormat.ToApiString(lineItem.LineType),
            lineItem.Label,
            lineItem.Amount,
            lineItem.EnteredAt);
    }

    public async Task DeleteLineItemAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        Guid lineItemId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAdjustAuthorityAsync(cancellationToken);

        var block = await RequireBlockAsync(eventId, blockId, tracked: false, cancellationToken);
        AssertDraft(block);

        var lineItem = await _db.BlockSettlementLineItems
            .FirstOrDefaultAsync(
                l => l.Id == lineItemId && l.ProgrammingBlockId == blockId, cancellationToken)
            ?? throw new NotFoundException("Settlement line item not found.");

        _db.BlockSettlementLineItems.Remove(lineItem);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ---- Preflight -------------------------------------------------------

    /// <summary>
    /// Pure read — viewing, saving, or previewing must never finalize anything
    /// (spec FR-027).
    /// </summary>
    public async Task<FinalizePreflightResponse> GetPreflightAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: false, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        var (blockers, computed) = await EvaluatePreflightAsync(block, cancellationToken);

        return new FinalizePreflightResponse(
            blockers.Count == 0,
            blockers,
            blockers.Count == 0 ? computed.NetPayable : null);
    }

    private async Task<(List<PreflightBlockerDto> Blockers, BlockSettlementComputedDto Computed)>
        EvaluatePreflightAsync(ProgrammingBlock block, CancellationToken cancellationToken)
    {
        var blockers = new List<PreflightBlockerDto>();

        if (!block.RequiresSettlement)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.MissingSettlementFields,
                "This block is not marked as requiring settlement.",
                "deal-terms"));
        }

        var basis = await _allocations.GetAllocationBasisAsync(block.Id, cancellationToken);
        var isGuaranteeOnly = block.BaseGuarantee > 0m && block.BackendPercentage == 0m;

        // A percentage deal with no revenue mapped cannot produce a defensible payout.
        if (basis == 0m && !isGuaranteeOnly)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.MissingRevenueMapping,
                "No revenue is allocated to this block and the deal is not a flat guarantee.",
                "allocations"));
        }

        if (block.BaseGuarantee == 0m && block.BackendPercentage == 0m)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.MissingSettlementFields,
                "Set a guarantee, a percentage, or both before finalizing.",
                "deal-terms"));
        }

        // Any bucket this block draws from must be within its allocable amount.
        var overAllocated = await _db.RevenueAllocations
            .AsNoTracking()
            .Where(a => a.ProgrammingBlockId == block.Id)
            .Select(a => a.RevenueBucket)
            .Distinct()
            .Where(b => (b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m) > b.Amount)
            .Select(b => b.Name)
            .ToListAsync(cancellationToken);

        foreach (var bucketName in overAllocated)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.AllocationConflict,
                $"'{bucketName}' is over-allocated. Resolve it before finalizing.",
                "allocations"));
        }

        // Expense splits flagged for settlement but sourced from an unresolved transaction.
        var unresolvedExpense = await _db.ExpenseAllocations
            .AsNoTracking()
            .AnyAsync(a => a.TargetBlockId == block.Id
                           && a.CountsTowardSettlement
                           && a.SourceQboTransaction != null
                           && a.SourceQboTransaction.ReviewState != QboReviewState.None,
                cancellationToken);

        if (unresolvedExpense)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.MissingExpenseMapping,
                "An expense mapped to this block comes from a transaction still under review.",
                "expenses"));
        }

        if (block.RequiresSettlementReview)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.UnresolvedScheduleChange,
                "This block changed after settlement work started. Review the change before finalizing.",
                "history"));
        }

        if (!block.ScheduleStatus.IsActive()
            && block.ScheduleStatus != BlockScheduleStatus.PartiallyCompleted)
        {
            blockers.Add(new PreflightBlockerDto(
                PreflightBlockerCategories.UnresolvedScheduleChange,
                "A canceled block cannot be finalized without review.",
                "history"));
        }

        var computed = await ComputeAsync(block, basis, cancellationToken);
        return (blockers, computed);
    }

    // ---- Finalize --------------------------------------------------------

    public async Task<BlockSettlementResultDto> FinalizeAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        FinalizeBlockSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _guard.RequireUserId();
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireFinalizeAuthorityAsync(cancellationToken);

        if (!request.Confirmed)
            throw new SettlementStateException("Settlement finalization must be explicitly confirmed.");

        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
            throw new SettlementStateException("This settlement is already finalized.");

        string? stagingPath = null;
        var failedStep = "validation";

        try
        {
            // ---- Phase A: validate, snapshot, render, stage ----
            var (blockers, computed) = await EvaluatePreflightAsync(block, cancellationToken);
            if (blockers.Count > 0)
            {
                throw new SettlementStateException(
                    "Settlement cannot be finalized yet: " +
                    string.Join(" ", blockers.Select(b => b.Message)));
            }

            if (request.ExpectedNetPayable is decimal expected && expected != computed.NetPayable)
            {
                throw new ConcurrencyConflictException(
                    $"The payable amount changed (expected {expected:N2}, now {computed.NetPayable:N2}). " +
                    "Refresh and review before finalizing.");
            }

            failedStep = "snapshot";
            var revisionNumber = await NextRevisionNumberAsync(blockId, cancellationToken);
            var snapshot = await BuildSheetAsync(block, cancellationToken);
            var snapshotJson = JsonSerializer.Serialize(snapshot);

            failedStep = "pdf-render";
            var pdfBytes = _documentRenderer.Render(snapshotJson);

            failedStep = "archive-staging";
            var settlementId = Guid.NewGuid();
            stagingPath = $"staging/festival/{eventId}/{blockId}/{settlementId}.pdf";
            var finalPath = $"festival/{eventId}/{blockId}/{settlementId}.pdf";
            await _archiveStore.StageAsync(stagingPath, pdfBytes, cancellationToken);

            // ---- Phase B: short locked transaction ----
            failedStep = "finalized-write";
            await using (var transaction = await _db.Database.BeginTransactionAsync(cancellationToken))
            {
                try
                {
                    // Re-check inside the transaction so two concurrent finalizations against
                    // the same bucket cannot both pass a stale read (research.md D6/D8).
                    await _allocations.AssertBucketsNotOverAllocatedAsync(blockId, cancellationToken);

                    var current = await _db.ProgrammingBlocks
                        .FirstAsync(b => b.Id == blockId, cancellationToken);

                    if (current.SettlementStatus == BlockSettlementStatus.Finalized)
                        throw new ConcurrencyConflictException();

                    var finalizedAt = DateTimeOffset.UtcNow;
                    current.SettlementStatus = BlockSettlementStatus.Finalized;
                    current.CalculatedNetPayout = computed.NetPayable;
                    current.FinalizedAt = finalizedAt;
                    current.FinalizedByUserId = userId;
                    current.SettlementPdfUrl = finalPath;
                    current.FinalizedSnapshotJson = snapshotJson;

                    _db.BlockSettlementRevisions.Add(new BlockSettlementRevision
                    {
                        Id = Guid.NewGuid(),
                        ProgrammingBlockId = blockId,
                        RevisionNumber = revisionNumber,
                        SnapshotJson = snapshotJson,
                        FinalizedByUserId = userId,
                        FinalizedAt = finalizedAt,
                        PdfUrl = finalPath,
                        DispatchOutcome = "PENDING"
                    });

                    await _allocations.LockBucketsForBlockAsync(blockId, userId, cancellationToken);
                    await _allocations.RollBlockExpensesToMasterLedgerAsync(blockId, cancellationToken);

                    _audit.Record(eventId, FestivalAuditEntityTypes.BlockSettlement, blockId,
                        FestivalAuditActions.SettlementFinalized, null,
                        new { computed.NetPayable, RevisionNumber = revisionNumber });

                    await _db.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);

                    block = current;
                }
                catch (DbUpdateConcurrencyException)
                {
                    throw new ConcurrencyConflictException();
                }
            }

            // ---- Phase C: promote artifact, record dispatch ----
            failedStep = "document-dispatch";
            try
            {
                await _archiveStore.PromoteAsync(stagingPath, finalPath, cancellationToken);
            }
            catch (SettlementArchiveException)
            {
                await CompensateFailedPromoteAsync(blockId, eventId, cancellationToken);
                throw;
            }

            await _archiveStore.DeleteStagedAsync(stagingPath, cancellationToken);
            stagingPath = null;

            var revision = await _db.BlockSettlementRevisions
                .FirstAsync(r => r.ProgrammingBlockId == blockId && r.RevisionNumber == revisionNumber,
                    cancellationToken);
            revision.DispatchOutcome = "DISPATCHED";
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Block settlement finalized for block {BlockId} in festival {EventId} by user {UserId}",
                blockId, eventId, userId);

            return new BlockSettlementResultDto(
                blockId,
                BlockSettlementStatusFormat.ToApiString(block.SettlementStatus),
                block.FinalizedAt,
                block.CalculatedNetPayout,
                finalPath,
                "DISPATCHED",
                revisionNumber);
        }
        catch (Exception ex) when (ex is not ConcurrencyConflictException)
        {
            // Nothing partial survives: the DB transaction either committed or rolled back,
            // and any staged artifact is cleaned up below.
            _logger.LogWarning(
                "Block settlement finalization failed at step {FailedStep} for block {BlockId}",
                failedStep, blockId);

            _audit.Record(eventId, FestivalAuditEntityTypes.BlockSettlement, blockId,
                FestivalAuditActions.FinalizeFailed, null, new { FailedStep = failedStep });
            await _db.SaveChangesAsync(CancellationToken.None);

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
                catch (Exception cleanupEx)
                {
                    _logger.LogWarning(
                        "Failed to clean up staged settlement artifact for block {BlockId}: {Reason}",
                        blockId, cleanupEx.GetType().Name);
                }
            }
        }
    }

    // ---- Reopen ----------------------------------------------------------

    public async Task<BlockSettlementSheetResponse> ReopenAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        ReopenBlockSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _guard.RequireUserId();
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireOverrideAuthorityAsync(cancellationToken);

        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);

        if (block.SettlementStatus != BlockSettlementStatus.Finalized)
            throw new SettlementStateException("Only a finalized settlement can be reopened.");

        if (string.IsNullOrWhiteSpace(request.ReasonCode))
            throw new ValidationException("A reason code is required to reopen a settlement.");
        if (string.IsNullOrWhiteSpace(request.Note))
            throw new ValidationException("A note is required to reopen a settlement.");

        var latest = await _db.BlockSettlementRevisions
            .Where(r => r.ProgrammingBlockId == blockId)
            .OrderByDescending(r => r.RevisionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        // A dispatched document is already in the artist's hands — require explicit
        // acknowledgement before it can be superseded (spec FR-033).
        if (latest?.DispatchOutcome == "DISPATCHED" && !request.AcknowledgeDispatched)
        {
            throw new ConflictException(
                "This settlement document was already dispatched. " +
                "Acknowledge the dispatch to reopen it.");
        }

        if (latest is not null)
        {
            latest.ReasonCode = request.ReasonCode;
            latest.Note = request.Note;
            latest.ReopenedByUserId = userId;
            latest.ReopenedAt = DateTimeOffset.UtcNow;
        }

        block.SettlementStatus = BlockSettlementStatus.Draft;
        block.FinalizedAt = null;
        block.FinalizedByUserId = null;

        _audit.Record(eventId, FestivalAuditEntityTypes.BlockSettlement, blockId,
            FestivalAuditActions.SettlementReopened,
            new { PriorNetPayable = block.CalculatedNetPayout },
            new { Status = "DRAFT" },
            $"{request.ReasonCode}: {request.Note}");

        using (_saveContext.Authorize(FrozenEventSaveReason.BlockSettlementReopen))
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return await BuildSheetAsync(block, cancellationToken);
    }

    public async Task<BlockSettlementLineItemDto> AddAdjustmentAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CreateBlockSettlementLineItemRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAdjustAuthorityAsync(cancellationToken);

        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
            await _guard.RequireOverrideAuthorityAsync(cancellationToken);

        var lineType = BlockSettlementLineTypeFormat.FromApiString(request.LineType);
        if (lineType != BlockSettlementLineType.Adjustment
            && lineType != BlockSettlementLineType.RoundingAdjustment)
        {
            throw new ValidationException("Adjustments must use the ADJUSTMENT or ROUNDING_ADJUSTMENT line type.");
        }

        var label = (request.Label ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(label))
            throw new ValidationException("Line item label is required.");

        var lineItem = new BlockSettlementLineItem
        {
            Id = Guid.NewGuid(),
            ProgrammingBlockId = blockId,
            LineType = lineType,
            Label = label,
            Amount = request.Amount,
            EnteredByUserId = _guard.RequireUserId(),
            EnteredAt = DateTimeOffset.UtcNow
        };

        _db.BlockSettlementLineItems.Add(lineItem);
        await _db.SaveChangesAsync(cancellationToken);

        return new BlockSettlementLineItemDto(
            lineItem.Id,
            BlockSettlementLineTypeFormat.ToApiString(lineItem.LineType),
            lineItem.Label,
            lineItem.Amount,
            lineItem.EnteredAt);
    }

    // ---- Work queue & rollup ---------------------------------------------

    public async Task<IReadOnlyList<BlockWorkQueueItemDto>> GetMyBlocksAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var assignedStages = await _guard.GetAssignedStageIdsAsync(eventId, cancellationToken);

        var blocks = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Include(b => b.StageZone)
            .Where(b => b.EventId == eventId
                        && b.RequiresSettlement
                        && (assignedStages.Count == 0 || assignedStages.Contains(b.StageZoneId)))
            .OrderBy(b => b.DayDate).ThenBy(b => b.StartTime)
            .ToListAsync(cancellationToken);

        var items = new List<BlockWorkQueueItemDto>(blocks.Count);
        foreach (var block in blocks)
        {
            var (blockers, _) = await EvaluatePreflightAsync(block, cancellationToken);
            items.Add(new BlockWorkQueueItemDto(
                block.Id,
                block.Title,
                block.DayDate.ToString("yyyy-MM-dd"),
                block.StageZone.Name,
                block.StartTime.ToString("HH:mm"),
                BlockSettlementStatusFormat.ToApiString(block.SettlementStatus),
                block.RequiresSettlementReview,
                blockers.Count == 0));
        }

        return items;
    }

    public async Task<ArtistSettlementRollupDto> GetArtistRollupAsync(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var artist = await _db.FestivalArtists
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == artistId && a.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Artist not found in this festival.");

        var blocks = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Include(b => b.StageZone)
            .Where(b => b.EventId == eventId && b.FestivalArtistId == artistId)
            .OrderBy(b => b.DayDate).ThenBy(b => b.StartTime)
            .ToListAsync(cancellationToken);

        var blockIds = blocks.Select(b => b.Id).ToList();
        var totalAllocated = await _db.RevenueAllocations
            .AsNoTracking()
            .Where(a => blockIds.Contains(a.ProgrammingBlockId))
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

        return new ArtistSettlementRollupDto(
            artist.Id,
            artist.Name,
            blocks.Count,
            blocks.Sum(b => b.CalculatedNetPayout),
            totalAllocated,
            blocks.Select(b => new ArtistAppearanceDto(
                b.Id,
                b.Title,
                b.DayDate.ToString("yyyy-MM-dd"),
                b.StageZone.Name,
                b.StartTime.ToString("HH:mm"),
                b.EndTime.ToString("HH:mm"),
                BlockScheduleStatusFormat.ToApiString(b.ScheduleStatus),
                BlockSettlementStatusFormat.ToApiString(b.SettlementStatus),
                b.SettlementStatus == BlockSettlementStatus.Finalized ? b.CalculatedNetPayout : null,
                BlockBookingStatusFormat.ToApiString(b.BookingStatus))).ToList());
    }

    // ---- internals -------------------------------------------------------

    private async Task<BlockSettlementComputedDto> ComputeAsync(
        ProgrammingBlock block,
        decimal allocationBasis,
        CancellationToken cancellationToken)
    {
        var deductionLines = await _db.BlockSettlementLineItems
            .AsNoTracking()
            .Where(l => l.ProgrammingBlockId == block.Id)
            .SumAsync(l => (decimal?)l.Amount, cancellationToken) ?? 0m;

        var expenseDeductions = await _allocations.GetBlockExpenseDeductionsAsync(
            block.Id, cancellationToken);

        var deductions = DealMathEngine.RoundMoney(deductionLines + expenseDeductions);

        var gross = block.PercentBasis == PercentBasis.Net
            ? DealMathEngine.CalculateBlockGrossPayout(
                Math.Max(0m, allocationBasis - deductions),
                block.BaseGuarantee,
                block.BackendPercentage,
                block.BonusThresholdAmount,
                block.BonusAmount,
                block.CapAmount,
                block.FloorAmount)
            : DealMathEngine.CalculateBlockGrossPayout(
                allocationBasis,
                block.BaseGuarantee,
                block.BackendPercentage,
                block.BonusThresholdAmount,
                block.BonusAmount,
                block.CapAmount,
                block.FloorAmount);

        var netPayable = DealMathEngine.CalculateBlockPayout(
            allocationBasis,
            deductions,
            block.PercentBasis,
            block.BaseGuarantee,
            block.BackendPercentage,
            block.TaxWithholdingPercentage,
            block.BonusThresholdAmount,
            block.BonusAmount,
            block.CapAmount,
            block.FloorAmount);

        var taxWithheld = DealMathEngine.RoundMoney(
            Math.Max(0m, (block.PercentBasis == PercentBasis.Net ? gross : gross - deductions)
                          * block.TaxWithholdingPercentage / 100m));

        return new BlockSettlementComputedDto(
            allocationBasis, gross, deductions, taxWithheld, netPayable);
    }

    private async Task<BlockSettlementSheetResponse> BuildSheetAsync(
        ProgrammingBlock block,
        CancellationToken cancellationToken)
    {
        var hydrated = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Include(b => b.StageZone)
            .Include(b => b.FestivalArtist)
            .FirstAsync(b => b.Id == block.Id, cancellationToken);

        // Only this block's own allocation lines, named by source bucket — never the
        // bucket's totals or any other block's terms (spec FR-026).
        var allocations = await _db.RevenueAllocations
            .AsNoTracking()
            .Include(a => a.RevenueBucket)
            .Where(a => a.ProgrammingBlockId == block.Id)
            .Select(a => new BlockAllocationLineDto(
                a.RevenueBucket.Name,
                RevenueAllocationTypeFormat.ToApiString(a.AllocationType),
                a.CalculatedAmount))
            .ToListAsync(cancellationToken);

        var lineItems = await _db.BlockSettlementLineItems
            .AsNoTracking()
            .Where(l => l.ProgrammingBlockId == block.Id)
            .OrderBy(l => l.EnteredAt)
            .Select(l => new BlockSettlementLineItemDto(
                l.Id,
                BlockSettlementLineTypeFormat.ToApiString(l.LineType),
                l.Label,
                l.Amount,
                l.EnteredAt))
            .ToListAsync(cancellationToken);

        var revisions = await _db.BlockSettlementRevisions
            .AsNoTracking()
            .Where(r => r.ProgrammingBlockId == block.Id)
            .OrderBy(r => r.RevisionNumber)
            .Select(r => new BlockSettlementRevisionDto(
                r.RevisionNumber, r.FinalizedAt, r.PdfUrl, r.DispatchOutcome, r.ReasonCode))
            .ToListAsync(cancellationToken);

        var basis = allocations.Sum(a => a.CalculatedAmount);
        var computed = await ComputeAsync(hydrated, basis, cancellationToken);

        return new BlockSettlementSheetResponse(
            hydrated.Id,
            hydrated.Title,
            hydrated.DayDate.ToString("yyyy-MM-dd"),
            hydrated.StageZone.Name,
            hydrated.StartTime.ToString("HH:mm"),
            hydrated.EndTime.ToString("HH:mm"),
            hydrated.FestivalArtist?.Name,
            BlockSettlementStatusFormat.ToApiString(hydrated.SettlementStatus),
            hydrated.RequiresSettlementReview,
            new BlockDealTermsDto(
                hydrated.DealType.ToStorage(),
                hydrated.BaseGuarantee,
                hydrated.BackendPercentage,
                PercentBasisFormat.ToApiString(hydrated.PercentBasis),
                hydrated.CapAmount,
                hydrated.FloorAmount,
                hydrated.BonusThresholdAmount,
                hydrated.BonusAmount,
                hydrated.TaxWithholdingPercentage,
                hydrated.CustomFormulaExpression),
            allocations,
            lineItems,
            computed,
            revisions);
    }

    private async Task CompensateFailedPromoteAsync(
        Guid blockId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var block = await _db.ProgrammingBlocks.FirstAsync(b => b.Id == blockId, cancellationToken);
        block.SettlementStatus = BlockSettlementStatus.Draft;
        block.FinalizedAt = null;
        block.FinalizedByUserId = null;
        block.SettlementPdfUrl = null;
        block.FinalizedSnapshotJson = null;
        block.CalculatedNetPayout = 0m;

        await _allocations.ReverseBlockExpenseRollupAsync(blockId, cancellationToken);

        using (_saveContext.Authorize(FrozenEventSaveReason.BlockSettlementReopen))
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogWarning(
            "Rolled back block settlement state for block {BlockId} after archive promote failure",
            blockId);
    }

    private async Task<int> NextRevisionNumberAsync(Guid blockId, CancellationToken cancellationToken)
    {
        var hasRevisions = await _db.BlockSettlementRevisions
            .AnyAsync(r => r.ProgrammingBlockId == blockId, cancellationToken);

        if (!hasRevisions)
            return 1;

        return await _db.BlockSettlementRevisions
            .Where(r => r.ProgrammingBlockId == blockId)
            .MaxAsync(r => r.RevisionNumber, cancellationToken) + 1;
    }

    private static void AssertDraft(ProgrammingBlock block)
    {
        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This settlement is finalized. Reopen it before making changes.");
        }
    }

    private static decimal NonNegative(decimal value, string label) =>
        value < 0m ? throw new ValidationException($"{label} cannot be negative.") : value;

    private static DealType ParseDealType(string value) => value?.ToLowerInvariant() switch
    {
        "guarantee" => DealType.Guarantee,
        "door_split" => DealType.DoorSplit,
        "custom" => DealType.Custom,
        _ => throw new ValidationException($"Unknown deal type '{value}'.")
    };

    private async Task<ProgrammingBlock> RequireBlockAsync(
        Guid eventId,
        Guid blockId,
        bool tracked,
        CancellationToken cancellationToken)
    {
        var query = _db.ProgrammingBlocks.Where(b => b.Id == blockId && b.EventId == eventId);
        if (!tracked)
            query = query.AsNoTracking();

        return await query.FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Programming block not found.");
    }
}
