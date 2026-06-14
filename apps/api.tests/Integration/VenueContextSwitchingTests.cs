using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Middleware;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class VenueContextSwitchingTests : IntegrationTestBase
{
    [Fact]
    public async Task ActiveVenueHeader_FiltersListedVenues()
    {
        var email = $"context-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        using var client = CreateAuthenticatedClient(token);

        var v1 = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue A"));
        var venueA = await v1.Content.ReadFromJsonAsync<VenueResponse>();
        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue B"));

        client.DefaultRequestHeaders.Add(VenueContextMiddleware.HeaderName, venueA!.Id.ToString());
        var response = await client.GetAsync("/api/venues");
        var venues = await response.Content.ReadFromJsonAsync<List<VenueResponse>>();
        venues.Should().HaveCount(1);
        venues![0].Name.Should().Be("Venue A");
    }

    [Fact]
    public async Task NoHeader_ReturnsAllAccessibleVenues()
    {
        var email = $"context-all-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        using var client = CreateAuthenticatedClient(token);

        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue 1"));
        await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue 2"));

        var response = await client.GetAsync("/api/venues");
        var venues = await response.Content.ReadFromJsonAsync<List<VenueResponse>>();
        venues.Should().HaveCount(2);
    }
}
