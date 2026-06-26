using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboTrackingMappingTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateTrackingMapping_AsAdmin_PersistsMapping()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);
        var eventId = (await CreateEventViaApiAsync(client, venueId)).EventId;

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/qbo/tracking-mappings",
            new CreateTrackingMappingRequest("Tag", "tag-1", "Summer Series", "Event", eventId));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await response.Content.ReadFromJsonAsync<QboTrackingMappingDto>();
        dto!.QboTrackingName.Should().Be("Summer Series");
        dto.TargetTier.Should().Be("Event");
    }

    [Fact]
    public async Task GetTrackingCatalog_AsAdmin_ReturnsOk()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/tracking-catalog");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
