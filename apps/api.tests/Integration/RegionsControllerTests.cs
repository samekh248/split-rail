using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Regions;
using SplitRail.Api.DTOs.Venues;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class RegionsControllerTests : IntegrationTestBase
{
    private async Task<HttpClient> SetupAdminClientAsync()
    {
        var email = $"regions-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        return CreateAuthenticatedClient(token);
    }

    private static async Task<RegionResponse> CreateRegionAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/regions", new CreateRegionRequest(name, null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RegionResponse>())!;
    }

    private static async Task<VenueResponse> CreateVenueAsync(HttpClient client, string name, Guid? regionId = null)
    {
        var response = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest(name, regionId));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<VenueResponse>())!;
    }

    private static Task<HttpResponseMessage> DeleteRegionAsync(
        HttpClient client,
        Guid regionId,
        DeleteRegionRequest? body = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/regions/{regionId}");
        if (body is not null)
            request.Content = JsonContent.Create(body);
        return client.SendAsync(request);
    }

    [Fact]
    public async Task DeleteRegion_ZeroVenues_Returns204()
    {
        using var client = await SetupAdminClientAsync();
        var region = await CreateRegionAsync(client, "Empty Region");

        var response = await DeleteRegionAsync(client, region.Id);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteRegion_WithVenuesAndNoResolution_Returns409()
    {
        using var client = await SetupAdminClientAsync();
        var region = await CreateRegionAsync(client, "Occupied Region");
        await CreateVenueAsync(client, "The Roxy", region.Id);

        var response = await DeleteRegionAsync(client, region.Id);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task DeleteRegion_DeleteVenuesTrue_RemovesRegionAndVenues()
    {
        using var client = await SetupAdminClientAsync();
        var region = await CreateRegionAsync(client, "Occupied Region");
        var venue = await CreateVenueAsync(client, "The Roxy", region.Id);

        var response = await DeleteRegionAsync(
            client, region.Id, new DeleteRegionRequest(DeleteVenues: true));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var venues = await client.GetFromJsonAsync<List<VenueResponse>>("/api/venues");
        venues.Should().NotContain(v => v.Id == venue.Id);

        var regions = await client.GetFromJsonAsync<List<RegionResponse>>("/api/regions");
        regions.Should().NotContain(r => r.Id == region.Id);
    }

    [Fact]
    public async Task DeleteRegion_MoveVenuesToRegionId_ReassignsVenuesAndRemovesRegion()
    {
        using var client = await SetupAdminClientAsync();
        var source = await CreateRegionAsync(client, "Source Region");
        var destination = await CreateRegionAsync(client, "Destination Region");
        var movedVenue = await CreateVenueAsync(client, "The Roxy", source.Id);
        var preExistingVenue = await CreateVenueAsync(client, "The Fillmore", destination.Id);

        var response = await DeleteRegionAsync(
            client, source.Id, new DeleteRegionRequest(MoveVenuesToRegionId: destination.Id));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var venues = await client.GetFromJsonAsync<List<VenueResponse>>("/api/venues");
        venues.Should().ContainSingle(v => v.Id == movedVenue.Id && v.RegionId == destination.Id);
        venues.Should().ContainSingle(v => v.Id == preExistingVenue.Id && v.RegionId == destination.Id);

        var regions = await client.GetFromJsonAsync<List<RegionResponse>>("/api/regions");
        regions.Should().NotContain(r => r.Id == source.Id);
    }

    [Fact]
    public async Task DeleteRegion_MoveVenuesToRegionInDifferentOrg_Returns404AndChangesNothing()
    {
        using var client = await SetupAdminClientAsync();
        var region = await CreateRegionAsync(client, "Occupied Region");
        var venue = await CreateVenueAsync(client, "The Roxy", region.Id);

        using var otherOrgClient = await SetupAdminClientAsync();
        var otherOrgRegion = await CreateRegionAsync(otherOrgClient, "Other Org Region");

        var response = await DeleteRegionAsync(
            client, region.Id, new DeleteRegionRequest(MoveVenuesToRegionId: otherOrgRegion.Id));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var venues = await client.GetFromJsonAsync<List<VenueResponse>>("/api/venues");
        venues.Should().ContainSingle(v => v.Id == venue.Id && v.RegionId == region.Id);

        var regions = await client.GetFromJsonAsync<List<RegionResponse>>("/api/regions");
        regions.Should().Contain(r => r.Id == region.Id);
    }

    [Fact]
    public async Task DeleteRegion_MoveVenuesToSelf_Returns400AndChangesNothing()
    {
        using var client = await SetupAdminClientAsync();
        var region = await CreateRegionAsync(client, "Occupied Region");
        var venue = await CreateVenueAsync(client, "The Roxy", region.Id);

        var response = await DeleteRegionAsync(
            client, region.Id, new DeleteRegionRequest(MoveVenuesToRegionId: region.Id));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var venues = await client.GetFromJsonAsync<List<VenueResponse>>("/api/venues");
        venues.Should().ContainSingle(v => v.Id == venue.Id && v.RegionId == region.Id);

        var regions = await client.GetFromJsonAsync<List<RegionResponse>>("/api/regions");
        regions.Should().Contain(r => r.Id == region.Id);
    }
}
