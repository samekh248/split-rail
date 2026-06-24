using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class QboSyncCorrectionService
{
    private readonly ApplicationDbContext _db;

    public QboSyncCorrectionService(ApplicationDbContext db)
    {
        _db = db;
    }

    public static decimal CalculateNetToTargetOffset(decimal targetUpstreamAmount, decimal netSum) =>
        targetUpstreamAmount - netSum;

    public async Task<int> ApplyCorrectionsAsync(
        Guid eventId,
        IReadOnlyList<QboFetchedTransaction> fetchedTransactions,
        Guid syncBatchId,
        DateTimeOffset syncedAt,
        CancellationToken cancellationToken = default)
    {
        var fetchedById = fetchedTransactions
            .GroupBy(t => t.TransactionId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Last(), StringComparer.Ordinal);

        var fetchedIds = fetchedById.Keys.ToHashSet(StringComparer.Ordinal);

        var ledgerRows = await _db.QboSyncLedgers
            .Where(l => l.EventId == eventId)
            .ToListAsync(cancellationToken);

        if (ledgerRows.Count == 0)
            return 0;

        var byTxnId = ledgerRows
            .GroupBy(l => l.QboTransactionId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var offsetsCreated = 0;

        foreach (var txn in fetchedById.Values)
        {
            if (!byTxnId.TryGetValue(txn.TransactionId, out var rows))
                continue;

            var netSum = rows.Sum(r => r.Amount);
            if (netSum == txn.Amount)
                continue;

            if (HasExistingOffset(rows, QboSyncCorrectionType.AmountChange, targetAbsent: false, targetAmount: txn.Amount))
                continue;

            var reference = GetReferenceRow(rows);
            var offsetAmount = CalculateNetToTargetOffset(txn.Amount, netSum);

            _db.QboSyncLedgers.Add(CreateOffsetEntry(
                eventId,
                reference,
                correctedEntry: reference,
                offsetAmount,
                syncBatchId,
                syncedAt,
                QboSyncCorrectionType.AmountChange,
                targetAbsent: false,
                targetAmount: txn.Amount,
                txn));

            offsetsCreated++;
        }

        foreach (var (txnId, rows) in byTxnId)
        {
            if (fetchedIds.Contains(txnId))
                continue;

            var netSum = rows.Sum(r => r.Amount);
            if (netSum == 0m)
                continue;

            if (HasExistingOffset(rows, QboSyncCorrectionType.VoidRemoval, targetAbsent: true, targetAmount: null))
                continue;

            var reference = GetReferenceRow(rows);
            var offsetAmount = CalculateNetToTargetOffset(0m, netSum);

            _db.QboSyncLedgers.Add(CreateOffsetEntry(
                eventId,
                reference,
                correctedEntry: reference,
                offsetAmount,
                syncBatchId,
                syncedAt,
                QboSyncCorrectionType.VoidRemoval,
                targetAbsent: true,
                targetAmount: null));

            offsetsCreated++;
        }

        return offsetsCreated;
    }

    internal static bool HasExistingOffset(
        IReadOnlyList<QboSyncLedger> rows,
        QboSyncCorrectionType correctionType,
        bool? targetAbsent,
        decimal? targetAmount) =>
        rows.Any(r =>
            r.EntryType == QboSyncLedgerEntryType.OffsetCorrection &&
            r.CorrectionType == correctionType &&
            r.TargetStateAbsent == targetAbsent &&
            r.TargetStateAmount == targetAmount);

    private static QboSyncLedger GetReferenceRow(IReadOnlyList<QboSyncLedger> rows) =>
        rows.FirstOrDefault(r => r.EntryType == QboSyncLedgerEntryType.Original)
        ?? rows.OrderBy(r => r.SyncedAt).First();

    private static QboSyncLedger CreateOffsetEntry(
        Guid eventId,
        QboSyncLedger reference,
        QboSyncLedger correctedEntry,
        decimal offsetAmount,
        Guid syncBatchId,
        DateTimeOffset syncedAt,
        QboSyncCorrectionType correctionType,
        bool? targetAbsent,
        decimal? targetAmount,
        QboFetchedTransaction? txnOverride = null) =>
        new()
        {
            EventId = eventId,
            QboTransactionId = txnOverride?.TransactionId ?? reference.QboTransactionId,
            QboAccountId = txnOverride?.AccountId ?? reference.QboAccountId,
            Amount = offsetAmount,
            TransactionDate = txnOverride?.TransactionDate ?? reference.TransactionDate,
            MappedLineItemId = reference.MappedLineItemId,
            SyncBatchId = syncBatchId,
            SyncedAt = syncedAt,
            EntryType = QboSyncLedgerEntryType.OffsetCorrection,
            CorrectionType = correctionType,
            TargetStateAbsent = targetAbsent,
            TargetStateAmount = targetAmount,
            CorrectedLedgerEntryId = correctedEntry.Id == Guid.Empty ? null : correctedEntry.Id
        };
}
