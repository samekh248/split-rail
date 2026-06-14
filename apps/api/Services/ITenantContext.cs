namespace SplitRail.Api.Services;

public interface ITenantContext
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    Guid? ActiveVenueId { get; }
    void SetContext(Guid? userId, Guid? organizationId);
    void SetActiveVenueId(Guid? venueId);
}

public sealed class TenantContext : ITenantContext
{
    public Guid? UserId { get; private set; }
    public Guid? OrganizationId { get; private set; }
    public Guid? ActiveVenueId { get; private set; }

    public void SetContext(Guid? userId, Guid? organizationId)
    {
        UserId = userId;
        OrganizationId = organizationId;
    }

    public void SetActiveVenueId(Guid? venueId) => ActiveVenueId = venueId;
}
