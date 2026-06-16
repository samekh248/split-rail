using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class OrganizationServiceTests
{
    [Fact]
    public async Task CreateOrganizationAsync_SeedsDefaultRolesAndAdminMapping()
    {
        var (service, db, tenantContext) = CreateSut();
        var userId = Guid.NewGuid();
        tenantContext.SetContext(userId, null);

        var result = await service.CreateOrganizationAsync(new CreateOrganizationRequest("New Org"), userId);

        result.Name.Should().Be("New Org");
        (await db.OrganizationRoles.CountAsync(r => r.OrganizationId == result.Id)).Should().Be(4);
        (await db.UserOrganizationMappings.CountAsync(m => m.UserId == userId)).Should().Be(1);
    }

    [Fact]
    public async Task GetCurrentOrganizationAsync_ReturnsOrganizationForTenant()
    {
        var (service, db, tenantContext) = CreateSut();
        var userId = Guid.NewGuid();
        tenantContext.SetContext(userId, null);

        var created = await service.CreateOrganizationAsync(new CreateOrganizationRequest("Current Org"), userId);
        tenantContext.SetContext(userId, created.Id);

        var current = await service.GetCurrentOrganizationAsync();
        current.Id.Should().Be(created.Id);
        current.Name.Should().Be("Current Org");
    }

    [Fact]
    public async Task CreateOrganizationAsync_RejectsEmptyName()
    {
        var (service, _, tenantContext) = CreateSut();
        var userId = Guid.NewGuid();
        tenantContext.SetContext(userId, null);

        var act = () => service.CreateOrganizationAsync(new CreateOrganizationRequest("  "), userId);
        await act.Should().ThrowAsync<SplitRail.Api.Exceptions.ValidationException>();
    }

    private static (OrganizationService Service, ApplicationDbContext Db, TenantContext TenantContext) CreateSut()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ApplicationDbContext(options, tenantContext);
        var service = new OrganizationService(db, tenantContext, NullLogger<OrganizationService>.Instance);
        return (service, db, tenantContext);
    }
}
