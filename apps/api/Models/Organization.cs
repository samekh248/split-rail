namespace SplitRail.Api.Models;

public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }

    public ICollection<Venue> Venues { get; set; } = [];
    public ICollection<OrganizationRole> Roles { get; set; } = [];
    public ICollection<UserOrganizationMapping> UserMappings { get; set; } = [];
    public ICollection<Invitation> Invitations { get; set; } = [];
}
