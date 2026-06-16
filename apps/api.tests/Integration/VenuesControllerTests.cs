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

    // ---- User Story 2: Venue update ----

    private async Task<(HttpClient Client, Guid VenueId)> SetupAdminWithVenueAsync(string venueName = "The Roxy")
    {
        var client = await SetupAdminClientAsync();
        var create = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest(venueName));
        var venue = await create.Content.ReadFromJsonAsync<VenueResponse>();
        return (client, venue!.Id);
    }

    [Fact]
    public async Task UpdateVenue_PermittedInScope_Returns200AndPersists()
    {
        var (client, venueId) = await SetupAdminWithVenueAsync();

        var response = await client.PutAsJsonAsync($"/api/venues/{venueId}",
            new UpdateVenueRequest("The Roxy (Updated)"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<VenueResponse>();
        updated!.Name.Should().Be("The Roxy (Updated)");

        var fetched = await client.GetFromJsonAsync<VenueResponse>($"/api/venues/{venueId}");
        fetched!.Name.Should().Be("The Roxy (Updated)");
    }

    [Fact]
    public async Task UpdateVenue_TrimsWhitespace()
    {
        var (client, venueId) = await SetupAdminWithVenueAsync();

        var response = await client.PutAsJsonAsync($"/api/venues/{venueId}",
            new UpdateVenueRequest("   Trimmed Venue   "));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<VenueResponse>();
        updated!.Name.Should().Be("Trimmed Venue");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdateVenue_EmptyOrWhitespaceName_Returns400(string name)
    {
        var (client, venueId) = await SetupAdminWithVenueAsync();

        var response = await client.PutAsJsonAsync($"/api/venues/{venueId}",
            new UpdateVenueRequest(name));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateVenue_NameOver200Chars_Returns400()
    {
        var (client, venueId) = await SetupAdminWithVenueAsync();

        var response = await client.PutAsJsonAsync($"/api/venues/{venueId}",
            new UpdateVenueRequest(new string('a', 201)));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateVenue_UnknownVenue_Returns404()
    {
        var (client, _) = await SetupAdminWithVenueAsync();

        var response = await client.PutAsJsonAsync($"/api/venues/{Guid.NewGuid()}",
            new UpdateVenueRequest("Ghost Venue"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateVenue_OutOfScopeUser_Returns404AndUnchanged()
    {
        var adminEmail = $"admin-vu-{Guid.NewGuid():N}@example.com";
        var (adminToken, _, _) = await RegisterAndLoginAsync(adminEmail);
        adminToken = await CreateOrgAndGetTokenAsync(adminToken, adminEmail, "SecurePass1");
        using var adminClient = CreateAuthenticatedClient(adminToken);

        var inScope = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("In Scope"));
        var inScopeVenue = await inScope.Content.ReadFromJsonAsync<VenueResponse>();
        var outOfScope = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Out Of Scope"));
        var outOfScopeVenue = await outOfScope.Content.ReadFromJsonAsync<VenueResponse>();

        var memberEmail = $"scoped-{Guid.NewGuid():N}@example.com";
        var (scopedClient, _) = await CreateScopedVenueUserAsync(adminToken, inScopeVenue!.Id, memberEmail);

        var response = await scopedClient.PutAsJsonAsync($"/api/venues/{outOfScopeVenue!.Id}",
            new UpdateVenueRequest("Hijacked"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var unchanged = await adminClient.GetFromJsonAsync<VenueResponse>($"/api/venues/{outOfScopeVenue.Id}");
        unchanged!.Name.Should().Be("Out Of Scope");
    }

    [Fact]
    public async Task UpdateVenue_MissingPermission_Returns403AndUnchanged()
    {
        var adminEmail = $"admin-perm-{Guid.NewGuid():N}@example.com";
        var (adminToken, _, _) = await RegisterAndLoginAsync(adminEmail);
        adminToken = await CreateOrgAndGetTokenAsync(adminToken, adminEmail, "SecurePass1");
        using var adminClient = CreateAuthenticatedClient(adminToken);

        var create = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Members Venue"));
        var venue = await create.Content.ReadFromJsonAsync<VenueResponse>();

        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;
        var memberEmail = $"promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, memberEmail, promoterRoleId, [venue!.Id]);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));
        var memberLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(memberEmail, "SecurePass1"));
        var memberAuth = await memberLogin.Content.ReadFromJsonAsync<AuthResponse>();
        using var memberClient = CreateAuthenticatedClient(memberAuth!.AccessToken);

        var response = await memberClient.PutAsJsonAsync($"/api/venues/{venue.Id}",
            new UpdateVenueRequest("Renamed By Promoter"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var unchanged = await adminClient.GetFromJsonAsync<VenueResponse>($"/api/venues/{venue.Id}");
        unchanged!.Name.Should().Be("Members Venue");
    }

    [Fact]
    public async Task UpdateVenue_WithoutAuth_Returns401()
    {
        var response = await Client.PutAsJsonAsync($"/api/venues/{Guid.NewGuid()}",
            new UpdateVenueRequest("No Auth"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateVenue_EmptyOrWhitespaceName_Returns400(string name)
    {
        using var client = await SetupAdminClientAsync();

        var response = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest(name));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateVenue_NameOver200Chars_Returns400()
    {
        using var client = await SetupAdminClientAsync();

        var response = await client.PostAsJsonAsync("/api/venues",
            new CreateVenueRequest(new string('a', 201)));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
