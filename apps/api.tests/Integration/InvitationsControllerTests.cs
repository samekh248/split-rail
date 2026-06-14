using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Middleware;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class InvitationsControllerTests : IntegrationTestBase
{
    private async Task<(HttpClient AdminClient, string AdminToken, Guid VenueManagerRoleId, Guid VenueId)> SetupAdminWithVenueAsync()
    {
        var email = $"invite-admin-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        var client = CreateAuthenticatedClient(token);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var roleId = roles!.Single(r => r.RoleName == RoleNames.VenueManager).Id;

        var venueResponse = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Invite Venue"));
        var venue = await venueResponse.Content.ReadFromJsonAsync<VenueResponse>();

        return (client, token, roleId, venue!.Id);
    }

    [Fact]
    public async Task SendInvitation_Returns201()
    {
        var (client, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        var response = await client.PostAsJsonAsync("/api/invitations",
            new CreateInvitationRequest("manager@example.com", roleId, [venueId]));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AcceptInvitation_NewUser_Returns200WithTokens()
    {
        var (_, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        var rawToken = await SendInvitationViaServiceAsync(adminToken, "newinvite@example.com", roleId, [venueId]);

        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await acceptResponse.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        result!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task AcceptInvitation_ExistingUser_Returns200()
    {
        var (_, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("existing@example.com", "SecurePass1"));

        var rawToken = await SendInvitationViaServiceAsync(adminToken, "existing@example.com", roleId, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, null));
        acceptResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListInvitations_Returns200()
    {
        var (client, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        await SendInvitationViaServiceAsync(adminToken, "listed@example.com", roleId, [venueId]);
        var response = await client.GetAsync("/api/invitations");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CancelInvitation_Returns204()
    {
        var (client, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        await SendInvitationViaServiceAsync(adminToken, "cancel@example.com", roleId, [venueId]);
        var list = await client.GetFromJsonAsync<List<InvitationResponse>>("/api/invitations");
        var invitation = list!.Single(i => i.Email == "cancel@example.com");
        var response = await client.DeleteAsync($"/api/invitations/{invitation.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AcceptInvitation_SetsAcceptedStatus()
    {
        var (client, adminToken, roleId, venueId) = await SetupAdminWithVenueAsync();
        var rawToken = await SendInvitationViaServiceAsync(adminToken, "accepted@example.com", roleId, [venueId]);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));

        var list = await client.GetFromJsonAsync<List<InvitationResponse>>("/api/invitations");
        list!.Single(i => i.Email == "accepted@example.com").Status.Should().Be("accepted");
    }
}
