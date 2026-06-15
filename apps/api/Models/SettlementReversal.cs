namespace SplitRail.Api.Models;

public class SettlementReversal
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid? ReversedByUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string PreviousPdfUrl { get; set; } = string.Empty;
    public DateTimeOffset ReversedAt { get; set; }

    public Event Event { get; set; } = null!;
    public User ReversedByUser { get; set; } = null!;
}
