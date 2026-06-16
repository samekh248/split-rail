using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class VenuesControllerTests : IntegrationTestBase
{
    private async Task<HttpClient> SetupAdminClientAsync()
    {
        var email = $"venues-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        return CreateAuthenticatedClient(token);
    }

    [Fact]
    public async Task CreateVenue_Returns201()
    {
        using var client = await SetupAdminClientAsync();
        var response = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("The Roxy"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task ListVenues_UnscopedUserSeesAll()
    {
        using var client = await SetupAdminClientAsync();
        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue 1"));
        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue 2"));

        var response = await client.GetAsync("/api/venues");
        var venues = await response.Content.ReadFromJsonAsync<List<VenueResponse>>();
        venues.Should().HaveCount(2);
    }

    [Fact]
    public async Task ScopedUser_SeesOnlyAssignedVenue()
    {
        var adminEmail = $"admin-scope-{Guid.NewGuid():N}@example.com";
        var (adminToken, _, _) = await RegisterAndLoginAsync(adminEmail);
        adminToken = await CreateOrgAndGetTokenAsync(adminToken, adminEmail, "SecurePass1");
        using var adminClient = CreateAuthenticatedClient(adminToken);

        var v1 = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Scoped Venue"));
        var venue = await v1.Content.ReadFromJsonAsync<VenueResponse>();
        await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Other Venue"));

        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var memberEmail = $"member-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, memberEmail, promoterRoleId, [venue!.Id]);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));

        var memberLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(memberEmail, "SecurePass1"));
        var memberAuth = await memberLogin.Content.ReadFromJsonAsync<AuthResponse>();

        using var memberClient = CreateAuthenticatedClient(memberAuth!.AccessToken);
        var listResponse = await memberClient.GetAsync("/api/venues");
        var memberVenues = await listResponse.Content.ReadFromJsonAsync<List<VenueResponse>>();
        memberVenues.Should().HaveCount(1);
        memberVenues![0].Name.Should().Be("Scoped Venue");
    }

    [Fact]
    public async Task DeleteVenue_Returns204()
    {
        using var client = await SetupAdminClientAsync();
        var create = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Delete Me"));
        var venue = await create.Content.ReadFromJsonAsync<VenueResponse>();
        var response = await client.DeleteAsync($"/api/venues/{venue!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetVenue_ReturnsVenueDetails()
    {
        using var client = await SetupAdminClientAsync();
        var create = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Detail Venue"));
        var venue = await create.Content.ReadFromJsonAsync<VenueResponse>();

        var response = await client.GetAsync($"/api/venues/{venue!.Id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<VenueResponse>();
        result!.Name.Should().Be("Detail Venue");
    }
}
