using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class UsersControllerTests : IntegrationTestBase
{
    private async Task<(HttpClient AdminClient, string AdminEmail, Guid AdminUserId, Guid PromoterRoleId)> SetupAsync()
    {
        var email = $"users-{Guid.NewGuid():N}@example.com";
        var (token, _, userId) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        var client = CreateAuthenticatedClient(token);
        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;
        return (client, email, userId, promoterRoleId);
    }

    [Fact]
    public async Task ListUsers_Returns200()
    {
        var (client, _, _, _) = await SetupAsync();
        var response = await client.GetAsync("/api/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangeLastAdminRole_Returns400()
    {
        var (client, _, adminUserId, promoterRoleId) = await SetupAsync();
        var response = await client.PatchAsJsonAsync($"/api/users/{adminUserId}/role",
            new ChangeRoleRequest(promoterRoleId));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RemoveLastAdmin_Returns400()
    {
        var (client, _, adminUserId, _) = await SetupAsync();
        var response = await client.DeleteAsync($"/api/users/{adminUserId}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangeRole_WithSecondAdmin_Succeeds()
    {
        var (client, adminEmail, adminUserId, promoterRoleId) = await SetupAsync();
        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;

        var venueResponse = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Users Test Venue"));
        venueResponse.EnsureSuccessStatusCode();

        var secondAdminEmail = $"second-admin-{Guid.NewGuid():N}@example.com";
        var login = await Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(adminEmail, "SecurePass1"));
        var adminToken = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
        var rawToken = await SendInvitationViaServiceAsync(adminToken, secondAdminEmail, adminRoleId, null);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));

        var response = await client.PatchAsJsonAsync($"/api/users/{adminUserId}/role",
            new ChangeRoleRequest(promoterRoleId));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateVenueScopes_Returns200()
    {
        var (client, adminEmail, _, _) = await SetupAsync();
        var venue = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Scope Venue"));
        var venueId = (await venue.Content.ReadFromJsonAsync<VenueResponse>())!.Id;

        var login = await Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(adminEmail, "SecurePass1"));
        var adminToken = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;
        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var memberEmail = $"scoped-member-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, memberEmail, promoterRoleId, [venueId]);
        var accept = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        var member = await accept.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        var memberUserId = ParseTokenClaims(member!.AccessToken).UserId;

        var response = await client.PutAsJsonAsync($"/api/users/{memberUserId}/venue-scopes",
            new UpdateVenueScopesRequest([venueId]));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RemoveUser_WithSecondAdmin_Succeeds()
    {
        var (client, adminEmail, _, _) = await SetupAsync();
        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        var promoterRoleId = roles.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var login = await Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(adminEmail, "SecurePass1"));
        var adminToken = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.AccessToken;

        var secondAdminEmail = $"remove-admin-{Guid.NewGuid():N}@example.com";
        var secondAdminToken = await SendInvitationViaServiceAsync(adminToken, secondAdminEmail, adminRoleId, null);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(secondAdminToken, "SecurePass1"));

        var memberEmail = $"remove-member-{Guid.NewGuid():N}@example.com";
        var memberToken = await SendInvitationViaServiceAsync(adminToken, memberEmail, promoterRoleId, null);
        var accept = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(memberToken, "SecurePass1"));
        var member = await accept.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        var memberUserId = ParseTokenClaims(member!.AccessToken).UserId;

        var response = await client.DeleteAsync($"/api/users/{memberUserId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
