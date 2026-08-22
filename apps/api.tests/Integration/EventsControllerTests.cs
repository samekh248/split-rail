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

    // --- Show start time (spec 086 US2) --------------------------------------

    [Fact]
    public async Task UpdateEvent_ConfirmedShowStartAfterDoors_Persists()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Confirmed Show");
        created.BookingPlacementStatus.Should().Be("CONFIRMED");

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                DoorsTime: "19:00", ShowStartTime: "20:00"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<EventResponse>();
        updated!.DoorsTime.Should().Be("19:00");
        updated.ShowStartTime.Should().Be("20:00");

        var reread = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        var event2 = await reread.Content.ReadFromJsonAsync<EventResponse>();
        event2!.ShowStartTime.Should().Be("20:00");
    }

    [Fact]
    public async Task UpdateEvent_ShowStartOnHold_Returns400()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Held Show");
        await SetBookingPlacementStatusDirectAsync(created.EventId, BookingPlacementStatus.Hold1);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                ShowStartTime: "20:00"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateEvent_ShowStartOnCancelled_Returns400()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Cancelled Show");
        await SetBookingPlacementStatusDirectAsync(created.EventId, BookingPlacementStatus.Cancelled);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                ShowStartTime: "20:00"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateEvent_ShowStartBeforeDoors_RejectedAndPriorTimesUnchanged()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Timed Show");

        var seed = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                DoorsTime: "19:00", ShowStartTime: "20:00"));
        seed.StatusCode.Should().Be(HttpStatusCode.OK);

        var conflicting = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                DoorsTime: "19:00", ShowStartTime: "18:00"));
        conflicting.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var reread = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        var unchanged = await reread.Content.ReadFromJsonAsync<EventResponse>();
        unchanged!.DoorsTime.Should().Be("19:00");
        unchanged.ShowStartTime.Should().Be("20:00");
    }

    [Fact]
    public async Task ShowStartTime_RetainedAcrossPlacementChange_AndVisibleAgainWhenReconfirmed()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Retention Show");

        var seed = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                DoorsTime: "19:00", ShowStartTime: "20:00"));
        seed.StatusCode.Should().Be(HttpStatusCode.OK);

        // Promote/cancel are the only placement transitions the API exposes; a direct write
        // simulates whatever mechanism moves a confirmed booking to a hold (tasks.md T012).
        await SetBookingPlacementStatusDirectAsync(created.EventId, BookingPlacementStatus.Hold1);

        var whileHold = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        var heldEvent = await whileHold.Content.ReadFromJsonAsync<EventResponse>();
        heldEvent!.ShowStartTime.Should().Be("20:00", "the value must be retained, not cleared, while off confirmed");

        await SetBookingPlacementStatusDirectAsync(created.EventId, BookingPlacementStatus.Confirmed);

        var reconfirmed = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        var confirmedAgain = await reconfirmed.Content.ReadFromJsonAsync<EventResponse>();
        confirmedAgain!.ShowStartTime.Should().Be("20:00");
    }

    [Fact]
    public async Task UpdateEvent_ShowStartOnSettledEvent_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Settled Show");
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.Settled, isBudgetLocked: true);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                ShowStartTime: "20:00"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- Notes (spec 086 US4) -------------------------------------------------

    [Fact]
    public async Task UpdateEvent_NotesWithLineBreaks_RoundTripsIntact()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Notes Show");
        const string notes = "Line one\nLine two\n\nLine four";

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                Notes: notes));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<EventResponse>();
        updated!.Notes.Should().Be(notes);

        var reread = await client.GetAsync($"/api/venues/{venueId}/events/{created.EventId}");
        var event2 = await reread.Content.ReadFromJsonAsync<EventResponse>();
        event2!.Notes.Should().Be(notes);
    }

    [Fact]
    public async Task UpdateEvent_NotesBeyondMaxLength_Returns400WithLimit()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Notes Limit Show");
        var tooLong = new string('a', 2001);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                Notes: tooLong));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("2000");
    }

    [Fact]
    public async Task UpdateEvent_NotesOnSettledEvent_Returns400()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId, "Notes Settled Show");
        await SetEventStatusDirectAsync(token, created.EventId, EventStatus.Settled, isBudgetLocked: true);

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{created.EventId}",
            new UpdateEventRequest(
                created.Title, created.EventDate, created.QboTagName,
                Notes: "Blocked note"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
