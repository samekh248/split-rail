namespace SplitRail.Api.Models;

public class QboVenueCredential
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string RealmId { get; set; } = string.Empty;
    public string EncryptedAccessToken { get; set; } = string.Empty;
    public string EncryptedRefreshToken { get; set; } = string.Empty;
    public DateTimeOffset TokenExpiresAt { get; set; }
    public DateTimeOffset ConnectedAt { get; set; }
    public Guid? ConnectedByUserId { get; set; }

    public Venue Venue { get; set; } = null!;
    public User? ConnectedByUser { get; set; }
}
