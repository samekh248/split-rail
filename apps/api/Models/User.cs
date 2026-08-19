namespace SplitRail.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DateDisplayFormat { get; set; } = Constants.DateDisplayFormats.Default;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<UserOrganizationMapping> OrganizationMappings { get; set; } = [];
    public ICollection<UserVenueScope> VenueScopes { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<UserEventPin> EventPins { get; set; } = [];
    public ICollection<UserProgrammingBlockPin> ProgrammingBlockPins { get; set; } = [];
}
