using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class EventsControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task ListEvents_ReturnsCreatedEvents()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Listed Show");

        var response = await client.GetAsync($"/api/venues/{venueId}/events");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        events.Should().ContainSingle(e => e.EventId == created.EventId && e.Title == "Listed Show");
    }

    [Fact]
    public async Task GetEvent_ReturnsEventDetails()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Detail Show", "2026-08-01");

        var response = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var evt = await response.Content.ReadFromJsonAsync<EventResponse>();
        evt!.EventId.Should().Be(created.EventId);
        evt.Title.Should().Be("Detail Show");
        evt.EventDate.Should().Be("2026-08-01");
    }

    [Fact]
    public async Task GetEvent_UnknownId_Returns404()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var response = await client.GetAsync($"/api/venues/{venueId}/events/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
