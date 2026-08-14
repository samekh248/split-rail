using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Revenue buckets, revenue allocations, and rule-based expense splits.
///
/// The governing rule throughout: allocation is opt-in per bucket, over-allocation is
/// visible immediately as a draft warning but can never survive into a finalized settlement,
/// and every number traces back to a named source (spec FR-018 – FR-024).
/// </summary>
public class FestivalAllocationService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAuditService _audit;

    public FestivalAllocationService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAuditService audit)
    {
        _db = db;
        _guard = guard;
        _audit = audit;
    }

    // ---- Revenue buckets -------------------------------------------------

    public async Task<IReadOnlyList<RevenueBucketResponse>> ListBucketsAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        _audit.Record(eventId, FestivalAuditEntityTypes.MasterLedger, eventId,
            FestivalAuditActions.LedgerViewed);
        await _db.SaveChangesAsync(cancellationToken);

        return await _db.RevenueBuckets
            .AsNoTracking()
            .Where(b => b.EventId == eventId)
            .OrderBy(b => b.Name)
            .Select(b => new RevenueBucketResponse(
                b.Id,
                b.Name,
                b.IsAllocable,
                b.Amount,
                b.LinkedLineItemId,
                b.LockedAt,
                b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m,
                b.Amount - (b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m)))
            .ToListAsync(cancellationToken);
    }

    public async Task<RevenueBucketResponse> CreateBucketAsync(
        Guid venueId,
        Guid eventId,
        CreateRevenueBucketRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var name = ValidateName(request.Name, "Bucket name");
        if (request.Amount < 0m)
            throw new ValidationException("Bucket amount cannot be negative.");

        if (await _db.RevenueBuckets.AnyAsync(
                b => b.EventId == eventId && b.Name.ToLower() == name.ToLower(), cancellationToken))
        {
            throw new ConflictException($"A bucket named '{name}' already exists in this festival.");
        }

        await ValidateLinkedLineItemAsync(eventId, request.LinkedLineItemId, cancellationToken);

        var bucket = new RevenueBucket
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = name,
            Amount = request.Amount,
            IsAllocable = request.IsAllocable,
            LinkedLineItemId = request.LinkedLineItemId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.RevenueBuckets.Add(bucket);
        await _db.SaveChangesAsync(cancellationToken);

        return new RevenueBucketResponse(
            bucket.Id, bucket.Name, bucket.IsAllocable, bucket.Amount,
            bucket.LinkedLineItemId, null, 0m, bucket.Amount);
    }

    public async Task<RevenueBucketResponse> UpdateBucketAsync(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        UpdateRevenueBucketRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var bucket = await RequireBucketAsync(eventId, bucketId, tracked: true, cancellationToken);

        // Buckets lock once a settlement that references them is finalized, so the basis of a
        // signed payout cannot shift underneath it (spec FR-020).
        if (bucket.LockedAt is not null
            && !await _guard.HasPermissionAsync(r => r.CanOverrideSettlements, cancellationToken))
        {
            throw new ConflictException(
                "This bucket is locked by a finalized settlement. " +
                "Override permission is required to change it.");
        }

        var name = ValidateName(request.Name, "Bucket name");
        if (request.Amount < 0m)
            throw new ValidationException("Bucket amount cannot be negative.");

        var totalAllocated = await SumAllocationsAsync(bucketId, cancellationToken);
        if (request.Amount < totalAllocated)
        {
            throw new AllocationConflictException(
                $"This bucket already has {totalAllocated:N2} allocated. " +
                $"Lower the allocations before reducing the amount to {request.Amount:N2}.",
                request.Amount, totalAllocated, totalAllocated - request.Amount);
        }

        await ValidateLinkedLineItemAsync(eventId, request.LinkedLineItemId, cancellationToken);

        var prior = new { bucket.Name, bucket.Amount, bucket.IsAllocable };

        bucket.Name = name;
        bucket.Amount = request.Amount;
        bucket.IsAllocable = request.IsAllocable;
        bucket.LinkedLineItemId = request.LinkedLineItemId;

        _audit.Record(eventId, FestivalAuditEntityTypes.RevenueBucket, bucketId,
            FestivalAuditActions.BucketEdit, prior,
            new { bucket.Name, bucket.Amount, bucket.IsAllocable });

        await _db.SaveChangesAsync(cancellationToken);

        return new RevenueBucketResponse(
            bucket.Id, bucket.Name, bucket.IsAllocable, bucket.Amount,
            bucket.LinkedLineItemId, bucket.LockedAt, totalAllocated,
            bucket.Amount - totalAllocated);
    }

    public async Task DeleteBucketAsync(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var bucket = await RequireBucketAsync(eventId, bucketId, tracked: true, cancellationToken);

        if (await _db.RevenueAllocations.AnyAsync(a => a.RevenueBucketId == bucketId, cancellationToken))
            throw new ConflictException("Remove this bucket's allocations before deleting it.");

        _db.RevenueBuckets.Remove(bucket);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // ---- Revenue allocations ---------------------------------------------

    public async Task<IReadOnlyList<RevenueAllocationResponse>> ListAllocationsAsync(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        var bucket = await RequireBucketAsync(eventId, bucketId, tracked: false, cancellationToken);
        var totalAllocated = await SumAllocationsAsync(bucketId, cancellationToken);
        var remaining = bucket.Amount - totalAllocated;

        return await _db.RevenueAllocations
            .AsNoTracking()
            .Include(a => a.RevenueBucket)
            .Include(a => a.ProgrammingBlock)
            .Where(a => a.RevenueBucketId == bucketId)
            .OrderBy(a => a.CreatedAt)
            .Select(a => new RevenueAllocationResponse(
                a.Id,
                a.RevenueBucketId,
                a.RevenueBucket.Name,
                a.ProgrammingBlockId,
                a.ProgrammingBlock.Title,
                RevenueAllocationTypeFormat.ToApiString(a.AllocationType),
                a.Percentage,
                a.Amount,
                a.CalculatedAmount,
                remaining,
                new List<FestivalWarning>(),
                null))
            .ToListAsync(cancellationToken);
    }

    public async Task<RevenueAllocationResponse> CreateAllocationAsync(
        Guid venueId,
        Guid eventId,
        CreateRevenueAllocationRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var bucket = await RequireBucketAsync(
            eventId, request.RevenueBucketId, tracked: false, cancellationToken);

        // Only explicitly flagged buckets may feed deal math (spec FR-018).
        if (!bucket.IsAllocable)
        {
            throw new ValidationException(
                $"'{bucket.Name}' is not marked allocable to sub-settlements.");
        }

        var block = await _db.ProgrammingBlocks
            .AsNoTracking()
            .FirstOrDefaultAsync(
                b => b.Id == request.ProgrammingBlockId && b.EventId == eventId, cancellationToken)
            ?? throw new ValidationException("The selected block is not part of this festival.");

        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This block's settlement is finalized. Reopen it before changing allocations.");
        }

        var calculated = ResolveAllocationAmount(request, bucket.Amount, out var allocationType);

        var allocation = new RevenueAllocation
        {
            Id = Guid.NewGuid(),
            RevenueBucketId = bucket.Id,
            ProgrammingBlockId = block.Id,
            AllocationType = allocationType,
            Percentage = request.Percentage,
            Amount = request.Amount,
            CalculatedAmount = calculated,
            CreatedByUserId = _guard.RequireUserId(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.RevenueAllocations.Add(allocation);

        _audit.Record(eventId, FestivalAuditEntityTypes.RevenueAllocation, allocation.Id,
            FestivalAuditActions.AllocationEdit, null,
            new { bucket.Name, block.Title, allocation.CalculatedAmount });

        await _db.SaveChangesAsync(cancellationToken);

        var totalAllocated = await SumAllocationsAsync(bucket.Id, cancellationToken);
        var remaining = bucket.Amount - totalAllocated;
        var warnings = BuildOverAllocationWarnings(bucket, totalAllocated);

        // Draft over-allocation is allowed but must be loud; finalization re-checks and blocks.
        if (remaining < 0m
            && !await _guard.HasPermissionAsync(r => r.CanOverrideSettlements, cancellationToken))
        {
            throw new AllocationConflictException(
                $"Allocating this would exceed '{bucket.Name}' by {Math.Abs(remaining):N2}.",
                bucket.Amount, totalAllocated, Math.Abs(remaining));
        }

        return new RevenueAllocationResponse(
            allocation.Id, bucket.Id, bucket.Name, block.Id, block.Title,
            RevenueAllocationTypeFormat.ToApiString(allocationType),
            allocation.Percentage, allocation.Amount, allocation.CalculatedAmount,
            remaining, warnings);
    }

    public async Task<RevenueAllocationResponse> UpdateAllocationAsync(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        UpdateRevenueAllocationRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var allocation = await _db.RevenueAllocations
            .Include(a => a.RevenueBucket)
            .Include(a => a.ProgrammingBlock)
            .FirstOrDefaultAsync(
                a => a.Id == allocationId && a.ProgrammingBlock.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Allocation not found.");

        if (allocation.ProgrammingBlock.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This block's settlement is finalized. Reopen it before changing allocations.");
        }

        var bucket = allocation.RevenueBucket;
        if (!bucket.IsAllocable)
        {
            throw new ValidationException(
                $"'{bucket.Name}' is not marked allocable to sub-settlements.");
        }

        var createRequest = new CreateRevenueAllocationRequest(
            bucket.Id,
            allocation.ProgrammingBlockId,
            request.AllocationType,
            request.Percentage,
            request.Amount);

        var calculated = ResolveAllocationAmount(createRequest, bucket.Amount, out var allocationType);
        var prior = new
        {
            allocation.AllocationType,
            allocation.Percentage,
            allocation.Amount,
            allocation.CalculatedAmount
        };

        allocation.AllocationType = allocationType;
        allocation.Percentage = request.Percentage;
        allocation.Amount = request.Amount;
        allocation.CalculatedAmount = calculated;

        _audit.Record(eventId, FestivalAuditEntityTypes.RevenueAllocation, allocationId,
            FestivalAuditActions.AllocationEdit, prior,
            new
            {
                allocation.AllocationType,
                allocation.Percentage,
                allocation.Amount,
                allocation.CalculatedAmount
            });

        await _db.SaveChangesAsync(cancellationToken);

        var totalAllocated = await SumAllocationsAsync(bucket.Id, cancellationToken);
        var remaining = bucket.Amount - totalAllocated;
        var warnings = BuildOverAllocationWarnings(bucket, totalAllocated);

        if (remaining < 0m
            && !await _guard.HasPermissionAsync(r => r.CanOverrideSettlements, cancellationToken))
        {
            throw new AllocationConflictException(
                $"Allocating this would exceed '{bucket.Name}' by {Math.Abs(remaining):N2}.",
                bucket.Amount, totalAllocated, Math.Abs(remaining));
        }

        return new RevenueAllocationResponse(
            allocation.Id, bucket.Id, bucket.Name, allocation.ProgrammingBlockId,
            allocation.ProgrammingBlock.Title,
            RevenueAllocationTypeFormat.ToApiString(allocationType),
            allocation.Percentage, allocation.Amount, allocation.CalculatedAmount,
            remaining, warnings);
    }

    public async Task DeleteAllocationAsync(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var allocation = await _db.RevenueAllocations
            .Include(a => a.ProgrammingBlock)
            .FirstOrDefaultAsync(
                a => a.Id == allocationId && a.ProgrammingBlock.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Allocation not found.");

        if (allocation.ProgrammingBlock.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This block's settlement is finalized. Reopen it before removing allocations.");
        }

        _audit.Record(eventId, FestivalAuditEntityTypes.RevenueAllocation, allocationId,
            FestivalAuditActions.AllocationEdit,
            new { allocation.CalculatedAmount }, null);

        _db.RevenueAllocations.Remove(allocation);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// The authoritative over-allocation check, re-run inside the settlement transaction so
    /// two concurrent finalizations cannot both pass a stale read (research.md D6/D8).
    /// </summary>
    public async Task AssertBucketsNotOverAllocatedAsync(
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var offending = await _db.RevenueAllocations
            .AsNoTracking()
            .Where(a => a.ProgrammingBlockId == blockId)
            .Select(a => a.RevenueBucket)
            .Distinct()
            .Select(b => new
            {
                b.Name,
                b.Amount,
                Allocated = b.Allocations.Sum(a => (decimal?)a.CalculatedAmount) ?? 0m
            })
            .Where(x => x.Allocated > x.Amount)
            .FirstOrDefaultAsync(cancellationToken);

        if (offending is not null)
        {
            throw new AllocationConflictException(
                $"'{offending.Name}' is over-allocated by " +
                $"{offending.Allocated - offending.Amount:N2}. Resolve it before finalizing.",
                offending.Amount, offending.Allocated, offending.Allocated - offending.Amount);
        }
    }

    /// <summary>Locks every bucket a block draws from, at finalization time.</summary>
    public async Task LockBucketsForBlockAsync(
        Guid blockId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var buckets = await _db.RevenueBuckets
            .Where(b => b.Allocations.Any(a => a.ProgrammingBlockId == blockId) && b.LockedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var bucket in buckets)
        {
            bucket.LockedAt = DateTimeOffset.UtcNow;
            bucket.LockedByUserId = userId;
        }
    }

    /// <summary>
    /// Rolls block settlement expenses into the master ledger by accumulating each
    /// allocation's amount onto its source line item's settlement value (spec FR-031).
    /// </summary>
    public async Task RollBlockExpensesToMasterLedgerAsync(
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var allocations = await _db.ExpenseAllocations
            .Where(a => a.TargetBlockId == blockId && a.CountsTowardSettlement)
            .ToListAsync(cancellationToken);

        foreach (var allocation in allocations)
        {
            if (allocation.SourceLineItemId is not Guid lineItemId)
                continue;

            var lineItem = await _db.FinancialLineItems
                .FirstAsync(l => l.Id == lineItemId, cancellationToken);

            lineItem.SettlementValue = DealMathEngine.RoundMoney(
                lineItem.SettlementValue + allocation.CalculatedAmount);
        }
    }

    /// <summary>Reverses a prior expense rollup when finalization fails after Phase B.</summary>
    public async Task ReverseBlockExpenseRollupAsync(
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var allocations = await _db.ExpenseAllocations
            .Where(a => a.TargetBlockId == blockId && a.CountsTowardSettlement)
            .ToListAsync(cancellationToken);

        foreach (var allocation in allocations)
        {
            if (allocation.SourceLineItemId is not Guid lineItemId)
                continue;

            var lineItem = await _db.FinancialLineItems
                .FirstAsync(l => l.Id == lineItemId, cancellationToken);

            lineItem.SettlementValue = DealMathEngine.RoundMoney(
                Math.Max(0m, lineItem.SettlementValue - allocation.CalculatedAmount));
        }
    }

    public async Task<decimal> GetAllocationBasisAsync(
        Guid blockId,
        CancellationToken cancellationToken = default) =>
        await _db.RevenueAllocations
            .AsNoTracking()
            .Where(a => a.ProgrammingBlockId == blockId)
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

    // ---- Expense splits --------------------------------------------------

    public async Task<IReadOnlyList<ExpenseAllocationResponse>> ListExpenseAllocationsAsync(
        Guid venueId,
        Guid eventId,
        string? sourceType,
        string? targetType,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        var query = _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.EventId == eventId);

        if (!string.IsNullOrWhiteSpace(sourceType))
        {
            query = sourceType.ToUpperInvariant() switch
            {
                "LEDGER_LINE" => query.Where(a => a.SourceLineItemId != null),
                "QBO_TRANSACTION" => query.Where(a => a.SourceQboTransactionId != null),
                _ => query
            };
        }

        if (!string.IsNullOrWhiteSpace(targetType)
            && AllocationTargetTypeTryParse(targetType, out var parsedTarget))
        {
            query = query.Where(a => a.TargetType == parsedTarget);
        }

        var rows = await query
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return rows.Select(ToExpenseResponse).ToList();
    }

    public async Task<ExpenseAllocationResponse> CreateExpenseAllocationAsync(
        Guid venueId,
        Guid eventId,
        CreateExpenseAllocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        if ((request.SourceLineItemId is null) == (request.SourceQboTransactionId is null))
            throw new ValidationException("Provide exactly one source: a ledger line or a QBO transaction.");

        if (!AllocationMethodFormatTryParse(request.Method, out var method))
            throw new ValidationException($"Unknown split method '{request.Method}'.");

        if (!AllocationTargetTypeTryParse(request.TargetType, out var targetType))
            throw new ValidationException($"Unknown target type '{request.TargetType}'.");

        var (sourceAmount, reviewState) = await ResolveSourceAsync(
            eventId, request.SourceLineItemId, request.SourceQboTransactionId, cancellationToken);

        // Transactions flagged for review never flow into settlement-impacting allocation
        // until a financial user resolves them (spec FR-043).
        if (request.CountsTowardSettlement && reviewState.RequiresReview())
        {
            throw new ValidationException(
                "This transaction is flagged for review and cannot count toward settlement yet.");
        }

        if (request.Targets is { Count: > 0 })
        {
            return await CreateMultiTargetExpenseAllocationAsync(
                festival, eventId, request, method, sourceAmount, cancellationToken);
        }

        var targetDayDate = await ValidateTargetAsync(
            festival, eventId, targetType, request, cancellationToken);

        var amount = method switch
        {
            AllocationMethod.Equal => throw new ValidationException(
                "Equal splits require a targets array with at least two entries."),
            AllocationMethod.ManualLine => request.Amount
                ?? throw new ValidationException("Amount is required for a manual-line split."),
            AllocationMethod.Percentage => DealMathEngine.RoundMoney(
                sourceAmount * (request.Percentage
                    ?? throw new ValidationException("Percentage is required for a percentage split."))
                / 100m),
            _ => request.Amount
                 ?? throw new ValidationException("Amount is required for this split method.")
        };

        if (amount < 0m)
            throw new ValidationException("Split amount cannot be negative.");

        var alreadyAllocated = await SumExpenseAllocationsAsync(
            request.SourceLineItemId, request.SourceQboTransactionId, cancellationToken);

        // Split lines plus retained overhead can never exceed the original amount (FR-041).
        if (alreadyAllocated + amount > sourceAmount)
        {
            throw new AllocationConflictException(
                $"This split would exceed the source amount of {sourceAmount:N2} " +
                $"({alreadyAllocated + amount:N2} allocated).",
                sourceAmount, alreadyAllocated + amount, alreadyAllocated + amount - sourceAmount);
        }

        var allocation = new ExpenseAllocation
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            SourceLineItemId = request.SourceLineItemId,
            SourceQboTransactionId = request.SourceQboTransactionId,
            TargetType = targetType,
            TargetDayDate = targetDayDate,
            TargetStageZoneId = request.TargetStageZoneId,
            TargetBlockId = request.TargetBlockId,
            Method = method,
            Percentage = request.Percentage,
            CalculatedAmount = amount,
            CountsTowardSettlement = request.CountsTowardSettlement,
            CreatedByUserId = _guard.RequireUserId(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ExpenseAllocations.Add(allocation);

        _audit.Record(eventId, FestivalAuditEntityTypes.ExpenseAllocation, allocation.Id,
            FestivalAuditActions.AllocationEdit, null,
            new { TargetType = request.TargetType, allocation.CalculatedAmount });

        await _db.SaveChangesAsync(cancellationToken);

        return ToExpenseResponse(allocation);
    }

    public async Task<ExpenseSourceSummaryResponse> GetExpenseSourceSummaryAsync(
        Guid venueId,
        Guid eventId,
        Guid? sourceLineItemId,
        Guid? sourceQboTransactionId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        if ((sourceLineItemId is null) == (sourceQboTransactionId is null))
            throw new ValidationException("Provide exactly one source.");

        var (sourceAmount, _) = await ResolveSourceAsync(
            eventId, sourceLineItemId, sourceQboTransactionId, cancellationToken);

        var allocations = await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.EventId == eventId
                        && (sourceLineItemId == null || a.SourceLineItemId == sourceLineItemId)
                        && (sourceQboTransactionId == null || a.SourceQboTransactionId == sourceQboTransactionId))
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        var totalAllocated = allocations.Sum(a => a.CalculatedAmount);

        return new ExpenseSourceSummaryResponse(
            sourceLineItemId ?? sourceQboTransactionId!.Value,
            sourceLineItemId is not null ? "LEDGER_LINE" : "QBO_TRANSACTION",
            sourceLineItemId is not null ? "Ledger line" : "QBO transaction",
            sourceAmount,
            totalAllocated,
            sourceAmount - totalAllocated,
            allocations.Select(ToExpenseResponse).ToList());
    }

    public async Task DeleteExpenseAllocationAsync(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var allocation = await _db.ExpenseAllocations
            .FirstOrDefaultAsync(a => a.Id == allocationId && a.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Expense allocation not found.");

        _db.ExpenseAllocations.Remove(allocation);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Deductions pushed down to one block that count toward its settlement.</summary>
    public async Task<decimal> GetBlockExpenseDeductionsAsync(
        Guid blockId,
        CancellationToken cancellationToken = default) =>
        await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.TargetBlockId == blockId && a.CountsTowardSettlement)
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

    // ---- internals -------------------------------------------------------

    private async Task<ExpenseAllocationResponse> CreateMultiTargetExpenseAllocationAsync(
        Event festival,
        Guid eventId,
        CreateExpenseAllocationRequest request,
        AllocationMethod method,
        decimal sourceAmount,
        CancellationToken cancellationToken)
    {
        var targets = request.Targets!;
        if (targets.Count < 2 && method == AllocationMethod.Equal)
        {
            throw new ValidationException("Equal splits require at least two targets.");
        }

        var alreadyAllocated = await SumExpenseAllocationsAsync(
            request.SourceLineItemId, request.SourceQboTransactionId, cancellationToken);

        decimal[] amounts;
        switch (method)
        {
            case AllocationMethod.Equal:
            {
                var equalPct = 100m / targets.Count;
                var percentages = Enumerable.Repeat(equalPct, targets.Count).ToArray();
                amounts = DealMathEngine.AllocateByPercentage(sourceAmount, percentages);
                break;
            }
            case AllocationMethod.Percentage:
            {
                var percentages = targets.Select(t =>
                    t.Percentage ?? throw new ValidationException(
                        "Each target needs a percentage for a percentage split.")).ToArray();
                var pctTotal = percentages.Sum();
                if (pctTotal > 100m)
                {
                    throw new AllocationConflictException(
                        $"Target percentages total {pctTotal:N2}%, which exceeds 100%.",
                        sourceAmount, DealMathEngine.RoundMoney(sourceAmount * pctTotal / 100m),
                        DealMathEngine.RoundMoney(sourceAmount * (pctTotal - 100m) / 100m));
                }

                amounts = DealMathEngine.AllocateByPercentage(sourceAmount, percentages);
                break;
            }
            case AllocationMethod.ManualLine:
            {
                amounts = targets.Select(t =>
                    t.Amount ?? throw new ValidationException(
                        "Each target needs an amount for a manual-line split.")).ToArray();
                break;
            }
            default:
                throw new ValidationException(
                    $"Method '{AllocationMethodFormat.ToApiString(method)}' does not support multi-target splits.");
        }

        var batchTotal = amounts.Sum();
        if (alreadyAllocated + batchTotal > sourceAmount)
        {
            throw new AllocationConflictException(
                $"This split would exceed the source amount of {sourceAmount:N2} " +
                $"({alreadyAllocated + batchTotal:N2} allocated).",
                sourceAmount, alreadyAllocated + batchTotal,
                alreadyAllocated + batchTotal - sourceAmount);
        }

        ExpenseAllocationResponse? first = null;
        for (var i = 0; i < targets.Count; i++)
        {
            var target = targets[i];
            if (!AllocationTargetTypeTryParse(target.TargetType, out var targetType))
                throw new ValidationException($"Unknown target type '{target.TargetType}'.");

            var singleRequest = new CreateExpenseAllocationRequest(
                target.TargetType,
                request.Method,
                request.SourceLineItemId,
                request.SourceQboTransactionId,
                target.TargetDayDate,
                target.TargetStageZoneId,
                target.TargetBlockId,
                target.Percentage,
                amounts[i],
                request.CountsTowardSettlement);

            var targetDayDate = await ValidateTargetAsync(
                festival, eventId, targetType, singleRequest, cancellationToken);

            var allocation = new ExpenseAllocation
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                SourceLineItemId = request.SourceLineItemId,
                SourceQboTransactionId = request.SourceQboTransactionId,
                TargetType = targetType,
                TargetDayDate = targetDayDate,
                TargetStageZoneId = target.TargetStageZoneId,
                TargetBlockId = target.TargetBlockId,
                Method = method,
                Percentage = target.Percentage,
                CalculatedAmount = amounts[i],
                CountsTowardSettlement = request.CountsTowardSettlement,
                CreatedByUserId = _guard.RequireUserId(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _db.ExpenseAllocations.Add(allocation);

            _audit.Record(eventId, FestivalAuditEntityTypes.ExpenseAllocation, allocation.Id,
                FestivalAuditActions.AllocationEdit, null,
                new { TargetType = target.TargetType, allocation.CalculatedAmount });

            first ??= ToExpenseResponse(allocation);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return first!;
    }

    private static List<FestivalWarning> BuildOverAllocationWarnings(
        RevenueBucket bucket,
        decimal totalAllocated)
    {
        var warnings = new List<FestivalWarning>();
        if (totalAllocated > bucket.Amount)
        {
            warnings.Add(new FestivalWarning(
                FestivalWarningCodes.BucketOverAllocated,
                $"'{bucket.Name}' is over-allocated by {totalAllocated - bucket.Amount:N2}."));
        }
        return warnings;
    }

    private static decimal ResolveAllocationAmount(
        CreateRevenueAllocationRequest request,
        decimal bucketAmount,
        out RevenueAllocationType allocationType)
    {
        allocationType = request.AllocationType?.ToUpperInvariant() switch
        {
            "FIXED_AMOUNT" => RevenueAllocationType.FixedAmount,
            "PERCENT_OF_BUCKET" => RevenueAllocationType.PercentOfBucket,
            _ => throw new ValidationException($"Unknown allocation type '{request.AllocationType}'.")
        };

        if (allocationType == RevenueAllocationType.PercentOfBucket)
        {
            var percentage = request.Percentage
                ?? throw new ValidationException("Percentage is required for a percent-of-bucket allocation.");
            if (percentage <= 0m)
                throw new ValidationException("Percentage must be greater than zero.");

            return DealMathEngine.RoundMoney(bucketAmount * percentage / 100m);
        }

        var amount = request.Amount
            ?? throw new ValidationException("Amount is required for a fixed-amount allocation.");
        if (amount <= 0m)
            throw new ValidationException("Amount must be greater than zero.");

        return DealMathEngine.RoundMoney(amount);
    }

    private async Task<decimal> SumAllocationsAsync(Guid bucketId, CancellationToken cancellationToken) =>
        await _db.RevenueAllocations
            .AsNoTracking()
            .Where(a => a.RevenueBucketId == bucketId)
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

    private async Task<decimal> SumExpenseAllocationsAsync(
        Guid? sourceLineItemId,
        Guid? sourceQboTransactionId,
        CancellationToken cancellationToken) =>
        await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => (sourceLineItemId != null && a.SourceLineItemId == sourceLineItemId)
                        || (sourceQboTransactionId != null && a.SourceQboTransactionId == sourceQboTransactionId))
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

    private async Task<(decimal Amount, QboReviewState ReviewState)> ResolveSourceAsync(
        Guid eventId,
        Guid? sourceLineItemId,
        Guid? sourceQboTransactionId,
        CancellationToken cancellationToken)
    {
        if (sourceLineItemId is Guid lineItemId)
        {
            var line = await _db.FinancialLineItems
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == lineItemId && l.EventId == eventId, cancellationToken)
                ?? throw new ValidationException("The source ledger line is not part of this festival.");

            var amount = line.SettlementValue != 0m ? line.SettlementValue : line.ProformaValue;
            return (Math.Abs(amount), QboReviewState.None);
        }

        var transaction = await _db.UnmappedQboTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                t => t.Id == sourceQboTransactionId && t.EventId == eventId, cancellationToken)
            ?? throw new ValidationException("The source transaction is not part of this festival.");

        return (Math.Abs(transaction.Amount), transaction.ReviewState);
    }

    private async Task<DateOnly?> ValidateTargetAsync(
        Event festival,
        Guid eventId,
        AllocationTargetType targetType,
        CreateExpenseAllocationRequest request,
        CancellationToken cancellationToken)
    {
        switch (targetType)
        {
            case AllocationTargetType.Overhead:
                return null;

            case AllocationTargetType.Day:
            {
                if (!DateOnly.TryParse(request.TargetDayDate, out var day))
                    throw new ValidationException("A valid target day is required for a day split.");

                var lastDay = festival.EndDate ?? festival.EventDate;
                if (day < festival.EventDate || day > lastDay)
                    throw new ValidationException("The target day falls outside the festival range.");

                return day;
            }

            case AllocationTargetType.Stage:
            {
                var stageId = request.TargetStageZoneId
                    ?? throw new ValidationException("A target stage is required for a stage split.");
                if (!await _db.StageZones.AnyAsync(
                        s => s.Id == stageId && s.EventId == eventId, cancellationToken))
                {
                    throw new ValidationException("The target stage is not part of this festival.");
                }
                return null;
            }

            case AllocationTargetType.Block:
            {
                var blockId = request.TargetBlockId
                    ?? throw new ValidationException("A target block is required for a block split.");
                if (!await _db.ProgrammingBlocks.AnyAsync(
                        b => b.Id == blockId && b.EventId == eventId, cancellationToken))
                {
                    throw new ValidationException("The target block is not part of this festival.");
                }
                return null;
            }

            default:
                throw new ValidationException("Unsupported target type.");
        }
    }

    private async Task ValidateLinkedLineItemAsync(
        Guid eventId,
        Guid? linkedLineItemId,
        CancellationToken cancellationToken)
    {
        if (linkedLineItemId is not Guid id)
            return;

        var exists = await _db.FinancialLineItems
            .AnyAsync(l => l.Id == id && l.EventId == eventId, cancellationToken);

        if (!exists)
            throw new ValidationException("The linked ledger line is not part of this festival.");
    }

    private async Task<RevenueBucket> RequireBucketAsync(
        Guid eventId,
        Guid bucketId,
        bool tracked,
        CancellationToken cancellationToken)
    {
        var query = _db.RevenueBuckets.Where(b => b.Id == bucketId && b.EventId == eventId);
        if (!tracked)
            query = query.AsNoTracking();

        return await query.FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Revenue bucket not found.");
    }

    private static ExpenseAllocationResponse ToExpenseResponse(ExpenseAllocation a) =>
        new(
            a.Id,
            a.SourceLineItemId,
            a.SourceQboTransactionId,
            AllocationTargetTypeFormat.ToApiString(a.TargetType),
            a.TargetDayDate?.ToString("yyyy-MM-dd"),
            a.TargetStageZoneId,
            a.TargetBlockId,
            AllocationMethodFormat.ToApiString(a.Method),
            a.Percentage,
            a.CalculatedAmount,
            a.CountsTowardSettlement,
            a.CreatedAt);

    private static bool AllocationMethodFormatTryParse(string? value, out AllocationMethod method)
    {
        try
        {
            method = AllocationMethodFormat.FromApiString(value ?? string.Empty);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            method = default;
            return false;
        }
    }

    private static bool AllocationTargetTypeTryParse(string? value, out AllocationTargetType targetType)
    {
        try
        {
            targetType = AllocationTargetTypeFormat.FromApiString(value ?? string.Empty);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            targetType = default;
            return false;
        }
    }

    private static string ValidateName(string name, string label)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ValidationException($"{label} is required.");
        if (trimmed.Length > 255)
            throw new ValidationException($"{label} must be 255 characters or fewer.");
        return trimmed;
    }
}
