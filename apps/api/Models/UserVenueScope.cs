namespace SplitRail.Api.Models;

public class UserVenueScope
{
    public Guid UserId { get; set; }
    public Guid VenueId { get; set; }

    public User User { get; set; } = null!;
    public Venue Venue { get; set; } = null!;
}
