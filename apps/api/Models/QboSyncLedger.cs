namespace SplitRail.Api.Models;

public class QboSyncLedger
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string QboTransactionId { get; set; } = string.Empty;
    public string QboAccountId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public Guid? MappedLineItemId { get; set; }
    public Guid SyncBatchId { get; set; }
    public DateTimeOffset SyncedAt { get; set; }

    public Event Event { get; set; } = null!;
    public FinancialLineItem? MappedLineItem { get; set; }
}
