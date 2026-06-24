using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
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

    private async Task<(HttpClient Client, Guid OrgId, string Email)> SetupAdminAsync(string? orgName = null)
    {
        var email = $"org-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1", orgName ?? "Acme Venues");
        var client = CreateAuthenticatedClient(token);
        var org = await client.GetFromJsonAsync<OrganizationResponse>("/api/organizations/current");
        return (client, org!.Id, email);
    }

    // ---- User Story 1: Organization update ----

    [Fact]
    public async Task UpdateOrganization_AsAdmin_Returns200AndPersists()
    {
        var (client, orgId, _) = await SetupAdminAsync();

        var response = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest("Renamed Org"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<OrganizationResponse>();
        updated!.Name.Should().Be("Renamed Org");

        var current = await client.GetFromJsonAsync<OrganizationResponse>("/api/organizations/current");
        current!.Name.Should().Be("Renamed Org");
    }

    [Fact]
    public async Task UpdateOrganization_TrimsWhitespace()
    {
        var (client, orgId, _) = await SetupAdminAsync();

        var response = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest("   Spaced Org   "));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<OrganizationResponse>();
        updated!.Name.Should().Be("Spaced Org");
    }

    [Fact]
    public async Task UpdateOrganization_SameName_IsIdempotent()
    {
        var (client, orgId, _) = await SetupAdminAsync("Acme Venues");

        var response = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest("Acme Venues"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<OrganizationResponse>();
        updated!.Name.Should().Be("Acme Venues");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task UpdateOrganization_EmptyOrWhitespaceName_Returns400(string name)
    {
        var (client, orgId, _) = await SetupAdminAsync();

        var response = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest(name));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateOrganization_NameOver200Chars_Returns400()
    {
        var (client, orgId, _) = await SetupAdminAsync();

        var response = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest(new string('a', 201)));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateOrganization_AsNonAdmin_Returns403AndUnchanged()
    {
        var (adminClient, orgId, adminEmail) = await SetupAdminAsync("Original Name");

        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;
        var memberEmail = $"member-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(
            await TokenForAsync(adminEmail), memberEmail, promoterRoleId);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));
        using var memberClient = CreateAuthenticatedClient(await TokenForAsync(memberEmail));

        var response = await memberClient.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest("Hacked Name"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var current = await adminClient.GetFromJsonAsync<OrganizationResponse>("/api/organizations/current");
        current!.Name.Should().Be("Original Name");
    }

    [Fact]
    public async Task UpdateOrganization_DifferentOrg_Returns404()
    {
        var (_, otherOrgId, _) = await SetupAdminAsync("Org B");
        var (client, _, _) = await SetupAdminAsync("Org A");

        var response = await client.PutAsJsonAsync($"/api/organizations/{otherOrgId}",
            new UpdateOrganizationRequest("Cross Tenant"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateOrganization_WithoutAuth_Returns401()
    {
        var response = await Client.PutAsJsonAsync($"/api/organizations/{Guid.NewGuid()}",
            new UpdateOrganizationRequest("No Auth"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ---- User Story 3: Organization list ----

    [Fact]
    public async Task ListOrganizations_ReturnsOnlyMemberOrgs()
    {
        var (client, _, _) = await SetupAdminAsync("My Org");
        await SetupAdminAsync("Someone Elses Org");

        var orgs = await client.GetFromJsonAsync<List<OrganizationResponse>>("/api/organizations");

        orgs.Should().ContainSingle();
        orgs![0].Name.Should().Be("My Org");
    }

    [Fact]
    public async Task ListOrganizations_NoMembership_ReturnsEmptyList()
    {
        var email = $"nomember-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        using var client = CreateAuthenticatedClient(token);

        var response = await client.GetAsync("/api/organizations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var orgs = await response.Content.ReadFromJsonAsync<List<OrganizationResponse>>();
        orgs.Should().BeEmpty();
    }

    [Fact]
    public async Task ListOrganizations_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/organizations");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ---- User Story 4: Organization delete (archive) ----

    [Fact]
    public async Task DeleteOrganization_EmptyOrg_Returns204AndExcludedFromReads()
    {
        var (client, orgId, _) = await SetupAdminAsync("Empty Org");

        var response = await client.DeleteAsync($"/api/organizations/{orgId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var orgs = await client.GetFromJsonAsync<List<OrganizationResponse>>("/api/organizations");
        orgs.Should().BeEmpty();
        var current = await client.GetAsync("/api/organizations/current");
        current.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteOrganization_WithVenues_Returns409AndStaysActive()
    {
        var (client, orgId, _) = await SetupAdminAsync("Org With Venue");
        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("A Venue"));

        var response = await client.DeleteAsync($"/api/organizations/{orgId}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var current = await client.GetFromJsonAsync<OrganizationResponse>("/api/organizations/current");
        current!.Name.Should().Be("Org With Venue");
    }

    [Fact]
    public async Task DeleteOrganization_DifferentOrg_Returns404()
    {
        var (_, otherOrgId, _) = await SetupAdminAsync("Org B");
        var (client, _, _) = await SetupAdminAsync("Org A");

        var response = await client.DeleteAsync($"/api/organizations/{otherOrgId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- User Story 5: Error-contract & create/update validation consistency ----

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateOrganization_EmptyOrWhitespaceName_Returns400(string name)
    {
        var email = $"create-val-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        using var client = CreateAuthenticatedClient(token);

        var response = await client.PostAsJsonAsync("/api/organizations",
            new CreateOrganizationRequest(name));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateOrganization_NameOver200Chars_Returns400()
    {
        var email = $"create-val-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        using var client = CreateAuthenticatedClient(token);

        var response = await client.PostAsJsonAsync("/api/organizations",
            new CreateOrganizationRequest(new string('a', 201)));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task OrganizationErrors_UseStandardErrorContract()
    {
        var (client, orgId, _) = await SetupAdminAsync();

        // validation error envelope
        var validation = await client.PutAsJsonAsync($"/api/organizations/{orgId}",
            new UpdateOrganizationRequest(""));
        validation.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var validationBody = await validation.Content.ReadFromJsonAsync<ErrorEnvelope>();
        validationBody!.Type.Should().Be("validation");
        validationBody.Detail.Should().NotBeNullOrWhiteSpace();

        // not-found envelope (cross-tenant id)
        var notFound = await client.PutAsJsonAsync($"/api/organizations/{Guid.NewGuid()}",
            new UpdateOrganizationRequest("Whatever"));
        notFound.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var notFoundBody = await notFound.Content.ReadFromJsonAsync<ErrorEnvelope>();
        notFoundBody!.Type.Should().Be("not_found");
    }

    private sealed record ErrorEnvelope(string Type, string Detail, List<string>? Errors);

    private async Task<string> TokenForAsync(string email, string password = "SecurePass1")
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }
}
