namespace SplitRail.Api.Models;

public class Venue
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public ICollection<UserVenueScope> UserVenueScopes { get; set; } = [];
    public ICollection<QboAccountMapping> QboAccountMappings { get; set; } = [];
    public QboVenueCredential? QboCredential { get; set; }
}
