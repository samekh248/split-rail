namespace SplitRail.Api.Models;

/// <summary>
/// Scopes a stage manager to a specific Stage/Zone. A user holding FinalizeSettlements WITH
/// assignments is limited to their assigned stages for both settlement visibility and
/// finalize authority (research.md D10).
/// </summary>
public class StageZoneAssignment
{
    public Guid Id { get; set; }
    public Guid StageZoneId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public StageZone StageZone { get; set; } = null!;
    public User User { get; set; } = null!;
}
