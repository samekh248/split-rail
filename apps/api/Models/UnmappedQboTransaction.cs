namespace SplitRail.Api.Models;

public class UnmappedQboTransaction
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid VenueId { get; set; }
    public string QboTransactionId { get; set; } = string.Empty;
    public string QboAccountId { get; set; } = string.Empty;
    public string QboAccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public DateTimeOffset SyncedAt { get; set; }

    public Event Event { get; set; } = null!;
    public Venue Venue { get; set; } = null!;
}
