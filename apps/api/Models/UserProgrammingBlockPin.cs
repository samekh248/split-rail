namespace SplitRail.Api.Models;

public class UserProgrammingBlockPin
{
    public Guid UserId { get; set; }
    public Guid ProgrammingBlockId { get; set; }
    public DateTimeOffset PinnedAt { get; set; }

    public User User { get; set; } = null!;
    public ProgrammingBlock ProgrammingBlock { get; set; } = null!;
}
