using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Festival-scoped QBO transaction inbox: read-only QBO references with internal split
/// mapping through <see cref="ExpenseAllocation"/> (Constitution IV, research.md D9).
/// </summary>
public class FestivalQboService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAuditService _audit;

    public FestivalQboService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAuditService audit)
    {
        _db = db;
        _guard = guard;
        _audit = audit;
    }

    public async Task<IReadOnlyList<FestivalQboTransactionResponse>> ListTransactionsAsync(
        Guid venueId,
        Guid eventId,
        string? reviewState,
        string? allocationState,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        _audit.Record(eventId, FestivalAuditEntityTypes.MasterLedger, eventId,
            FestivalAuditActions.LedgerViewed);
        await _db.SaveChangesAsync(cancellationToken);

        var query = _db.UnmappedQboTransactions
            .AsNoTracking()
            .Where(t => t.EventId == eventId);

        if (!string.IsNullOrWhiteSpace(reviewState))
        {
            try
            {
                var parsedReview = QboReviewStateFormat.FromApiString(reviewState);
                query = query.Where(t => t.ReviewState == parsedReview);
            }
            catch (ArgumentOutOfRangeException)
            {
                throw new ValidationException($"Unknown review state filter '{reviewState}'.");
            }
        }

        var transactions = await query
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var allocationMap = await LoadAllocationMapAsync(eventId, cancellationToken);
        var rows = transactions
            .Select(t => ToTransactionResponse(t, festival.QboTagName, allocationMap))
            .ToList();

        if (!string.IsNullOrWhiteSpace(allocationState))
        {
            rows = rows
                .Where(r => string.Equals(r.AllocationState, allocationState, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return rows;
    }

    public async Task<BlockQboSourceTraceResponse> GetBlockSourceTransactionsAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(
            venueId, eventId, asNoTracking: true, cancellationToken);
        await _guard.RequireFullFinancialVisibilityAsync(cancellationToken);

        var blockExists = await _db.ProgrammingBlocks
            .AsNoTracking()
            .AnyAsync(b => b.EventId == eventId && b.Id == blockId, cancellationToken);
        if (!blockExists)
            throw new NotFoundException("Programming block not found.");

        var sourceIds = await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.EventId == eventId && a.TargetBlockId == blockId && a.SourceQboTransactionId != null)
            .Select(a => a.SourceQboTransactionId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var transactions = await _db.UnmappedQboTransactions
            .AsNoTracking()
            .Where(t => sourceIds.Contains(t.Id))
            .ToListAsync(cancellationToken);

        var allocationMap = await LoadAllocationMapAsync(eventId, cancellationToken);

        return new BlockQboSourceTraceResponse(
            blockId,
            transactions.Select(t => ToTransactionResponse(t, festival.QboTagName, allocationMap)).ToList());
    }

    public async Task<QboReviewResolutionResponse> ResolveReviewAsync(
        Guid venueId,
        Guid eventId,
        Guid transactionId,
        ResolveQboReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await _guard.RequireAllocationAuthorityAsync(cancellationToken);

        var transaction = await _db.UnmappedQboTransactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("QBO transaction not found.");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("A reason is required to resolve a review state.");

        var priorState = transaction.ReviewState;
        var priorAllocations = await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.SourceQboTransactionId == transactionId)
            .ToListAsync(cancellationToken);

        var priorMappingJson = System.Text.Json.JsonSerializer.Serialize(
            priorAllocations.Select(a => new
            {
                a.TargetType,
                a.TargetDayDate,
                a.TargetStageZoneId,
                a.TargetBlockId,
                a.CalculatedAmount,
                a.CountsTowardSettlement
            }));

        var resolution = request.Resolution.Trim().ToUpperInvariant();
        switch (resolution)
        {
            case "REMAP":
                transaction.ReviewState = QboReviewState.None;
                break;
            case "ACCEPTASOVERHEAD":
            case "ACCEPT_AS_OVERHEAD":
                await EnsureOverheadAllocationAsync(eventId, transaction, cancellationToken);
                transaction.ReviewState = QboReviewState.None;
                break;
            case "RECLASSIFY":
                if (priorAllocations.Any(a => a.CountsTowardSettlement))
                {
                    var finalizedBlock = await _db.ProgrammingBlocks
                        .AsNoTracking()
                        .Where(b => priorAllocations
                            .Where(a => a.TargetBlockId != null)
                            .Select(a => a.TargetBlockId!.Value)
                            .Contains(b.Id)
                            && b.SettlementStatus == BlockSettlementStatus.Finalized)
                        .Select(b => b.Title)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (finalizedBlock is not null)
                    {
                        throw new ConflictException(
                            $"Reclassification would affect finalized settlement for '{finalizedBlock}'. " +
                            "Use the adjustment or reopen flow.");
                    }
                }

                transaction.ReviewState = QboReviewState.ReclassificationRequired;
                break;
            default:
                throw new ValidationException($"Unknown review resolution '{request.Resolution}'.");
        }

        var newMappingJson = System.Text.Json.JsonSerializer.Serialize(
            await _db.ExpenseAllocations
                .AsNoTracking()
                .Where(a => a.SourceQboTransactionId == transactionId)
                .Select(a => new
                {
                    a.TargetType,
                    a.TargetDayDate,
                    a.TargetStageZoneId,
                    a.TargetBlockId,
                    a.CalculatedAmount,
                    a.CountsTowardSettlement
                })
                .ToListAsync(cancellationToken));

        _audit.Record(
            eventId,
            FestivalAuditEntityTypes.QboTransaction,
            transactionId,
            FestivalAuditActions.ReviewStateResolved,
            new { ReviewState = priorState.ToString(), Mapping = priorMappingJson },
            new { ReviewState = transaction.ReviewState.ToString(), Mapping = newMappingJson },
            request.Reason.Trim());

        await _db.SaveChangesAsync(cancellationToken);

        return new QboReviewResolutionResponse(
            transactionId,
            QboReviewStateFormat.ToApiString(priorState),
            QboReviewStateFormat.ToApiString(transaction.ReviewState),
            priorMappingJson,
            newMappingJson,
            request.Reason.Trim());
    }

    private async Task EnsureOverheadAllocationAsync(
        Guid eventId,
        UnmappedQboTransaction transaction,
        CancellationToken cancellationToken)
    {
        var allocated = await _db.ExpenseAllocations
            .Where(a => a.SourceQboTransactionId == transaction.Id)
            .SumAsync(a => (decimal?)a.CalculatedAmount, cancellationToken) ?? 0m;

        var remaining = Math.Abs(transaction.Amount) - allocated;
        if (remaining <= 0m)
            return;

        _db.ExpenseAllocations.Add(new ExpenseAllocation
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            SourceQboTransactionId = transaction.Id,
            TargetType = AllocationTargetType.Overhead,
            Method = AllocationMethod.FixedAmount,
            CalculatedAmount = remaining,
            CountsTowardSettlement = false,
            CreatedByUserId = _guard.RequireUserId(),
            CreatedAt = DateTimeOffset.UtcNow
        });
    }

    private async Task<Dictionary<Guid, List<ExpenseAllocation>>> LoadAllocationMapAsync(
        Guid eventId,
        CancellationToken cancellationToken) =>
        await _db.ExpenseAllocations
            .AsNoTracking()
            .Where(a => a.EventId == eventId && a.SourceQboTransactionId != null)
            .GroupBy(a => a.SourceQboTransactionId!.Value)
            .ToDictionaryAsync(g => g.Key, g => g.ToList(), cancellationToken);

    private static FestivalQboTransactionResponse ToTransactionResponse(
        UnmappedQboTransaction transaction,
        string? masterTag,
        Dictionary<Guid, List<ExpenseAllocation>> allocationMap)
    {
        var allocations = allocationMap.GetValueOrDefault(transaction.Id) ?? [];
        var totalAllocated = allocations.Sum(a => a.CalculatedAmount);
        var sourceAmount = Math.Abs(transaction.Amount);
        var remaining = sourceAmount - totalAllocated;

        return new FestivalQboTransactionResponse(
            transaction.Id,
            transaction.QboTransactionId,
            transaction.QboAccountId,
            transaction.QboAccountName,
            sourceAmount,
            transaction.TransactionDate.ToString("yyyy-MM-dd"),
            QboReviewStateFormat.ToApiString(transaction.ReviewState),
            masterTag,
            totalAllocated,
            remaining,
            ClassifyAllocationState(totalAllocated, sourceAmount, allocations),
            allocations.Select(a => new FestivalQboAllocationTraceDto(
                a.Id,
                AllocationTargetTypeFormat.ToApiString(a.TargetType),
                a.TargetDayDate?.ToString("yyyy-MM-dd"),
                a.TargetStageZoneId,
                a.TargetBlockId,
                a.CalculatedAmount,
                a.CountsTowardSettlement,
                a.CreatedByUserId,
                a.CreatedAt)).ToList());
    }

    private static string ClassifyAllocationState(
        decimal totalAllocated,
        decimal sourceAmount,
        List<ExpenseAllocation> allocations)
    {
        if (totalAllocated == 0m)
            return "Unallocated";

        if (allocations.All(a => a.TargetType == AllocationTargetType.Overhead))
            return "Overhead";

        if (totalAllocated >= sourceAmount)
            return "Full";

        return "Partial";
    }
}
