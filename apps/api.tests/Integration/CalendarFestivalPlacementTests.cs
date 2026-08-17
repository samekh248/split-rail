using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Calendar;
using SplitRail.Api.DTOs.Festivals;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class CalendarFestivalPlacementTests : IntegrationTestBase
{
    [Fact]
    public async Task GetPlacements_FestivalSpanningMonths_ReturnedInBothRanges()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "Border Fest", "2026-06-30", "2026-07-02");

        var june = await client.GetFromJsonAsync<List<CalendarPlacementDto>>(
            "/api/calendar/placements?from=2026-06-01&to=2026-06-30");
        var july = await client.GetFromJsonAsync<List<CalendarPlacementDto>>(
            "/api/calendar/placements?from=2026-07-01&to=2026-07-31");

        var junePlacement = june!.Should().ContainSingle(p => p.EventId == festival.EventId).Subject;
        junePlacement.EventDate.Should().Be("2026-06-30");
        junePlacement.EndDate.Should().Be("2026-07-02");
        junePlacement.EventType.Should().Be("FESTIVAL");

        july!.Should().ContainSingle(p => p.EventId == festival.EventId);
    }

    [Fact]
    public async Task CreateFestival_OverlappingConfirmedDate_Returns409()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        await CreateEventViaApiAsync(client, venueId, "Saturday Show", "2026-08-15");

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Weekend Fest", "2026-08-14", "2026-08-16"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
