using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class RolesControllerTests : IntegrationTestBase
{
    private async Task<(HttpClient AdminClient, Guid PromoterRoleId)> SetupAdminAsync()
    {
        var email = $"roles-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        var client = CreateAuthenticatedClient(token);

        var rolesResponse = await client.GetAsync("/api/roles");
        var roles = await rolesResponse.Content.ReadFromJsonAsync<List<RoleResponse>>();
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        return (client, promoterRoleId);
    }

    [Fact]
    public async Task ListRoles_Returns200()
    {
        var (client, _) = await SetupAdminAsync();
        var response = await client.GetAsync("/api/roles");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Admin_UpdatesPermissionFlag_Returns200()
    {
        var (client, promoterRoleId) = await SetupAdminAsync();
        var response = await client.PatchAsJsonAsync($"/api/roles/{promoterRoleId}",
            new UpdateRoleRequest(null, CanLockBudget: false, null, null, null, null, null));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var role = await response.Content.ReadFromJsonAsync<RoleResponse>();
        role!.CanLockBudget.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateRole_NonExistent_Returns404()
    {
        var (client, _) = await SetupAdminAsync();
        var response = await client.PatchAsJsonAsync($"/api/roles/{Guid.NewGuid()}",
            new UpdateRoleRequest(null, CanLockBudget: false, null, null, null, null, null));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
