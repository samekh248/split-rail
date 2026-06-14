namespace SplitRail.Api.Models;

public static class InvitationStatus
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Expired = "expired";
}

public class Invitation
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Email { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string Status { get; set; } = InvitationStatus.Pending;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public OrganizationRole Role { get; set; } = null!;
    public ICollection<InvitationVenueScope> VenueScopes { get; set; } = [];
}
