using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class UsersControllerTests : IntegrationTestBase
{
    private async Task<(HttpClient AdminClient, Guid AdminUserId, Guid PromoterRoleId)> SetupAsync()
    {
        var email = $"users-{Guid.NewGuid():N}@example.com";
        var (token, _, userId) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        var client = CreateAuthenticatedClient(token);
        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;
        return (client, userId, promoterRoleId);
    }

    [Fact]
    public async Task ListUsers_Returns200()
    {
        var (client, _, _) = await SetupAsync();
        var response = await client.GetAsync("/api/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangeLastAdminRole_Returns400()
    {
        var (client, adminUserId, promoterRoleId) = await SetupAsync();
        var response = await client.PatchAsJsonAsync($"/api/users/{adminUserId}/role",
            new ChangeRoleRequest(promoterRoleId));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RemoveLastAdmin_Returns400()
    {
        var (client, adminUserId, _) = await SetupAsync();
        var response = await client.DeleteAsync($"/api/users/{adminUserId}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
