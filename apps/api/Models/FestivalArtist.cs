namespace SplitRail.Api.Models;

/// <summary>
/// One artist identity within a single festival, linking that artist's many Programming
/// Blocks. Deliberately per-festival rather than an org-wide artist directory (research.md D5).
/// </summary>
public class FestivalArtist
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public Event Event { get; set; } = null!;
    public ICollection<ProgrammingBlock> ProgrammingBlocks { get; set; } = [];
}
