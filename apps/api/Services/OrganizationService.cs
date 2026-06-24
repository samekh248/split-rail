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
        var name = NameValidation.Normalize(request.Name, "Organization name");

        var org = new Organization { Id = Guid.NewGuid(), Name = name };
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

    public async Task<IReadOnlyList<OrganizationResponse>> ListForUserAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        return await _db.UserOrganizationMappings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(m => m.UserId == userId && m.Organization.ArchivedAt == null)
            .Select(m => new OrganizationResponse(
                m.Organization.Id,
                m.Organization.Name,
                m.Organization.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<OrganizationResponse> UpdateOrganizationAsync(
        Guid organizationId,
        UpdateOrganizationRequest request,
        CancellationToken cancellationToken = default)
    {
        var name = NameValidation.Normalize(request.Name, "Organization name");

        var org = await _db.Organizations
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken)
            ?? throw new NotFoundException("Organization not found.");

        org.Name = name;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Organization {OrganizationId} updated", org.Id);

        return new OrganizationResponse(org.Id, org.Name, org.CreatedAt);
    }

    public async Task ArchiveOrganizationAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default)
    {
        var org = await _db.Organizations
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken)
            ?? throw new NotFoundException("Organization not found.");

        var hasVenues = await _db.Venues
            .AnyAsync(v => v.OrganizationId == org.Id, cancellationToken);
        var hasFinancialData = await _db.FinancialLineItems
            .AnyAsync(cancellationToken);

        if (hasVenues || hasFinancialData)
            throw new ConflictException(
                "Organization cannot be deleted while it still owns venues or financial data.");

        org.ArchivedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Organization {OrganizationId} archived", org.Id);
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
            CanReverseSettlement = true,
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
