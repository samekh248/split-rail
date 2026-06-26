namespace SplitRail.Api.Models;

public class QboTrackingMapping
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid VenueId { get; set; }
    public string QboTrackingType { get; set; } = null!;
    public string QboTrackingId { get; set; } = null!;
    public string QboTrackingName { get; set; } = null!;
    public string TargetTier { get; set; } = null!;
    public Guid TargetEntityId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public Venue Venue { get; set; } = null!;
}
