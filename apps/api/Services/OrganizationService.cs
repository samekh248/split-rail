using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Services;

namespace SplitRail.Api.Services;

public class OrganizationService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<OrganizationService> _logger;

    public OrganizationService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        ILogger<OrganizationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<OrganizationResponse> CreateOrganizationAsync(
        CreateOrganizationRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Organization name is required.");

        var org = new Organization { Id = Guid.NewGuid(), Name = request.Name.Trim() };
        _db.Organizations.Add(org);

        var roles = CreateDefaultRoles(org.Id);
        _db.OrganizationRoles.AddRange(roles);

        var adminRole = roles.First(r => r.RoleName == RoleNames.Admin);
        _db.UserOrganizationMappings.Add(new UserOrganizationMapping
        {
            UserId = userId,
            OrganizationId = org.Id,
            RoleId = adminRole.Id
        });

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Organization {OrganizationId} created by user {UserId}", org.Id, userId);

        return new OrganizationResponse(org.Id, org.Name, org.CreatedAt);
    }

    public async Task<OrganizationResponse> GetCurrentOrganizationAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException("User is not a member of an organization.");

        var org = await _db.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orgId, cancellationToken)
            ?? throw new NotFoundException("Organization not found.");

        return new OrganizationResponse(org.Id, org.Name, org.CreatedAt);
    }

    private static List<OrganizationRole> CreateDefaultRoles(Guid organizationId) =>
    [
        new()
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            RoleName = RoleNames.Admin,
            CanManagePermissions = true,
            CanLockBudget = true,
            CanEditSettlement = true,
            CanSignSettlement = true,
            CanTriggerQboSync = true,
            CanMapQboAccounts = true,
            CanViewFinancials = true
        },
        new()
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            RoleName = RoleNames.VenueManager,
            CanLockBudget = true,
            CanEditSettlement = true,
            CanSignSettlement = true,
            CanTriggerQboSync = true,
            CanViewFinancials = true
        },
        new()
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            RoleName = RoleNames.Promoter,
            CanLockBudget = true,
            CanViewFinancials = true
        },
        new()
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            RoleName = RoleNames.ExternalBookkeeper,
            CanTriggerQboSync = true,
            CanMapQboAccounts = true,
            CanViewFinancials = true
        }
    ];
}
