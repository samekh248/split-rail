namespace SplitRail.Api.Models;

public class InvitationVenueScope
{
    public Guid InvitationId { get; set; }
    public Guid VenueId { get; set; }

    public Invitation Invitation { get; set; } = null!;
    public Venue Venue { get; set; } = null!;
}
