namespace SplitRail.Api.Models;

public class UserOrganizationMapping
{
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid RoleId { get; set; }

    public User User { get; set; } = null!;
    public Organization Organization { get; set; } = null!;
    public OrganizationRole Role { get; set; } = null!;
}
