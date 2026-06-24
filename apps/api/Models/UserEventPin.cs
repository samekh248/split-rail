namespace SplitRail.Api.Models;

public class UserEventPin
{
    public Guid UserId { get; set; }
    public Guid EventId { get; set; }
    public DateTimeOffset PinnedAt { get; set; }

    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
}
