namespace SplitRail.Api.DTOs.Venues;

public record CreateVenueRequest(string Name);
public record UpdateVenueRequest(string Name);
public record VenueResponse(Guid Id, string Name, Guid OrganizationId, DateTimeOffset CreatedAt);
