namespace SplitRail.Api.DTOs.Organizations;

public record CreateOrganizationRequest(string Name);
public record UpdateOrganizationRequest(string Name);
public record OrganizationResponse(Guid Id, string Name, DateTimeOffset CreatedAt);
