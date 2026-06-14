using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class TenantIsolationTests : IntegrationTestBase
{
    [Fact]
    public async Task OrgA_UserCannotSeeOrgB_Venues()
    {
        var emailA = "orga@example.com";
        var (tokenA, _, _) = await RegisterAndLoginAsync(emailA);
        tokenA = await CreateOrgAndGetTokenAsync(tokenA, emailA, "SecurePass1", "Org A");

        using var clientA = CreateAuthenticatedClient(tokenA);
        await clientA.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Org A Venue"));

        var emailB = "orgb@example.com";
        var (tokenB, _, _) = await RegisterAndLoginAsync(emailB);
        tokenB = await CreateOrgAndGetTokenAsync(tokenB, emailB, "SecurePass1", "Org B");

        using var clientB = CreateAuthenticatedClient(tokenB);
        var venuesResponse = await clientB.GetAsync("/api/venues");
        venuesResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var venues = await venuesResponse.Content.ReadFromJsonAsync<List<VenueResponse>>();
        venues.Should().BeEmpty();
    }

    [Fact]
    public async Task OrgA_UserGets404ForOrgB_VenueById()
    {
        var emailA = "orga2@example.com";
        var (tokenA, _, _) = await RegisterAndLoginAsync(emailA);
        tokenA = await CreateOrgAndGetTokenAsync(tokenA, emailA, "SecurePass1", "Org A2");

        using var clientA = CreateAuthenticatedClient(tokenA);
        var createResponse = await clientA.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Secret Venue"));
        var venue = await createResponse.Content.ReadFromJsonAsync<VenueResponse>();

        var emailB = "orgb2@example.com";
        var (tokenB, _, _) = await RegisterAndLoginAsync(emailB);
        tokenB = await CreateOrgAndGetTokenAsync(tokenB, emailB, "SecurePass1", "Org B2");

        using var clientB = CreateAuthenticatedClient(tokenB);
        var getResponse = await clientB.GetAsync($"/api/venues/{venue!.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task OrgB_UserSeesOnlyOrgB_Roles()
    {
        var emailA = "rolesa@example.com";
        var (tokenA, _, _) = await RegisterAndLoginAsync(emailA);
        tokenA = await CreateOrgAndGetTokenAsync(tokenA, emailA, "SecurePass1", "Roles Org A");

        var emailB = "rolesb@example.com";
        var (tokenB, _, _) = await RegisterAndLoginAsync(emailB);
        tokenB = await CreateOrgAndGetTokenAsync(tokenB, emailB, "SecurePass1", "Roles Org B");

        using var clientB = CreateAuthenticatedClient(tokenB);
        var rolesResponse = await clientB.GetAsync("/api/roles");
        var roles = await rolesResponse.Content.ReadFromJsonAsync<List<RoleResponse>>();
        roles.Should().HaveCount(4);
        roles!.Should().OnlyContain(r => r.RoleName is RoleNames.Admin or RoleNames.VenueManager
            or RoleNames.Promoter or RoleNames.ExternalBookkeeper);
    }
}
