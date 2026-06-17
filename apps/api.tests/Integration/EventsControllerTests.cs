using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models.Enums;
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

    [Fact]
    public async Task CreateEvent_AllowsOptionalQboTag()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events",
            new CreateEventRequest("Untagged Show", "2026-09-01", null));
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await response.Content.ReadFromJsonAsync<EventResponse>();
        created!.QboTagName.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateEvent_UpdatesMetadata()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Original Title", "2026-08-01");

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest("Updated Title", "2026-08-15", "NEW-TAG"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<EventResponse>();
        updated!.Title.Should().Be("Updated Title");
        updated.EventDate.Should().Be("2026-08-15");
        updated.QboTagName.Should().Be("NEW-TAG");
    }

    [Fact]
    public async Task UpdateEvent_BudgetLockedPreShow_AllowsMetadata()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.PreShow, isBudgetLocked: true);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest("Locked Edit", "2026-08-20", null));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<EventResponse>();
        updated!.Title.Should().Be("Locked Edit");
    }

    [Fact]
    public async Task UpdateEvent_Settled_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.Settled, isBudgetLocked: true);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest("Blocked", "2026-08-01", null));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteEvent_UnlockedPreShow_Returns204()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{created.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteEvent_BudgetLocked_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.PreShow, isBudgetLocked: true);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{created.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteEvent_Settled_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.Settled, isBudgetLocked: true);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{created.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
