namespace SplitRail.Api.DTOs.Venues;

public record CreateVenueRequest(string Name, Guid? RegionId = null);
public record UpdateVenueRequest(string Name, Guid? RegionId = null);
public record VenueResponse(
    Guid Id,
    string Name,
    Guid OrganizationId,
    DateTimeOffset CreatedAt,
    Guid? RegionId = null);
