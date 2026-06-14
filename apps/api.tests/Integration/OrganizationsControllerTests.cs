using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class OrganizationsControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateOrganization_SeedsDefaultRolesAndAdmin()
    {
        var email = "admin@example.com";
        var (accessToken, _, _) = await RegisterAndLoginAsync(email);
        accessToken = await CreateOrgAndGetTokenAsync(accessToken, email, "SecurePass1", "Acme Venues");

        using var client = CreateAuthenticatedClient(accessToken);

        var rolesResponse = await client.GetAsync("/api/roles");
        rolesResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var roles = await rolesResponse.Content.ReadFromJsonAsync<List<RoleResponse>>();
        roles.Should().HaveCount(4);
        roles!.Single(r => r.RoleName == RoleNames.Admin).CanManagePermissions.Should().BeTrue();
        roles.Single(r => r.RoleName == RoleNames.Promoter).CanEditSettlement.Should().BeFalse();

        var meResponse = await client.GetAsync("/api/users/me");
        meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await meResponse.Content.ReadFromJsonAsync<UserProfileResponse>();
        profile!.Role!.RoleName.Should().Be(RoleNames.Admin);
    }

    [Fact]
    public async Task CreateOrganization_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/organizations",
            new CreateOrganizationRequest("No Auth Org"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCurrentOrganization_Returns200()
    {
        var email = "current@example.com";
        var (accessToken, _, _) = await RegisterAndLoginAsync(email);
        accessToken = await CreateOrgAndGetTokenAsync(accessToken, email, "SecurePass1");

        using var client = CreateAuthenticatedClient(accessToken);
        var response = await client.GetAsync("/api/organizations/current");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var org = await response.Content.ReadFromJsonAsync<OrganizationResponse>();
        org!.Name.Should().Be("Test Org");
    }
}
