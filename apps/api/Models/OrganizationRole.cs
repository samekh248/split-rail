namespace SplitRail.Api.Models;

public class OrganizationRole
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string RoleName { get; set; } = string.Empty;

    public bool CanManagePermissions { get; set; }
    public bool CanLockBudget { get; set; }
    public bool CanEditSettlement { get; set; }
    public bool CanSignSettlement { get; set; }
    public bool CanTriggerQboSync { get; set; }
    public bool CanMapQboAccounts { get; set; }
    public bool CanViewFinancials { get; set; }

    public Organization Organization { get; set; } = null!;
    public ICollection<UserOrganizationMapping> UserMappings { get; set; } = [];
}
