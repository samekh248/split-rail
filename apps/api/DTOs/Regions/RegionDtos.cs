namespace SplitRail.Api.DTOs.Regions;

public record RegionResponse(
    Guid Id,
    string Name,
    string? Notes,
    Guid OrganizationId,
    DateTimeOffset CreatedAt,
    int VenueCount);

public record CreateRegionRequest(string Name, string? Notes);

public record UpdateRegionRequest(string Name, string? Notes);
