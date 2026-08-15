using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models.Enums;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Standard events remain untouched by festival mode (spec SC-007).
/// </summary>
public class StandardEventRegressionTests : IntegrationTestBase
{
    [Fact]
    public async Task StandardEventCreation_StillUsesSingleDayWorkflow()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var evt = await response.Content.ReadFromJsonAsync<EventResponse>();
        evt!.EventType.Should().Be("STANDARD");
        evt.EndDate.Should().BeNull();
    }

    [Fact]
    public async Task StandardEventLedgerAndSettlementEndpoints_RemainAvailable()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);

        (await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}/ledger"))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        (await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}/settlement"))
            .StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task StandardEvent_HasNoFestivalStructureEndpoints()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);

        (await client.GetAsync($"/api/venues/{venueId}/festivals/{created.EventId}/itinerary"))
            .StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }
}
