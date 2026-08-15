namespace SplitRail.Api.Models;

/// <summary>
/// A per-festival stage or zone (Main Stage, Rodeo Arena). Stages are not reusable
/// across events in v1 — they exist only within their Festival Wrapper (research.md D3).
/// </summary>
public class StageZone
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public uint Xmin { get; set; }

    public Event Event { get; set; } = null!;
    public ICollection<ProgrammingBlock> ProgrammingBlocks { get; set; } = [];
    public ICollection<StageZoneAssignment> Assignments { get; set; } = [];
}
