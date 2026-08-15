using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

public class FestivalItineraryTests : IntegrationTestBase
{
    [Fact]
    public async Task Itinerary_ReturnsDaysStagesAndBlocks()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Act One", "20:00", "21:00");

        var response = await client.GetAsync(ItineraryPath(venueId, festival.EventId));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var itinerary = await response.Content.ReadFromJsonAsync<ItineraryResponse>();
        itinerary!.Days.Should().HaveCount(3);
        itinerary.Stages.Should().HaveCount(1);
        itinerary.Blocks.Should().HaveCount(1);
        itinerary.Days.First(d => d.DayDate.ToString("yyyy-MM-dd") == "2026-08-14")
            .BlockCount.Should().Be(1);
    }

    [Fact]
    public async Task Itinerary_FiltersByDay()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Day One", "20:00", "21:00", dayDate: "2026-08-14");
        await CreateBlockAsync(client, venueId, festival, "Day Two", "20:00", "21:00", dayDate: "2026-08-15");

        var response = await client.GetAsync(
            $"{ItineraryPath(venueId, festival.EventId)}?day=2026-08-15");

        var itinerary = await response.Content.ReadFromJsonAsync<ItineraryResponse>();
        itinerary!.Blocks.Should().ContainSingle().Which.Title.Should().Be("Day Two");
    }

    [Fact]
    public async Task Itinerary_FiltersByCategoryAndStatus()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Band", "20:00", "21:00");
        var vendor = await CreateBlockAsync(
            client, venueId, festival, "Taco Stand", "10:00", "18:00", category: "VENDOR");

        var byCategory = await client.GetAsync(
            $"{ItineraryPath(venueId, festival.EventId)}?category=VENDOR");
        var categoryResult = await byCategory.Content.ReadFromJsonAsync<ItineraryResponse>();
        categoryResult!.Blocks.Should().ContainSingle().Which.Title.Should().Be("Taco Stand");

        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{vendor.Id}/status",
            new SetBlockStatusRequest("CANCELED"));

        var byStatus = await client.GetAsync(
            $"{ItineraryPath(venueId, festival.EventId)}?status=CANCELED");
        var statusResult = await byStatus.Content.ReadFromJsonAsync<ItineraryResponse>();
        statusResult!.Blocks.Should().ContainSingle().Which.Title.Should().Be("Taco Stand");
    }

    [Fact]
    public async Task Itinerary_RejectsUnknownFilterValues()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        (await client.GetAsync($"{ItineraryPath(venueId, festival.EventId)}?category=CIRCUS"))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.GetAsync($"{ItineraryPath(venueId, festival.EventId)}?day=not-a-date"))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PublicItinerary_ExcludesNonPublicBlocksInThePayload()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var publicBlock = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Public Headliner", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false, IsPubliclyVisible: true,
                Description: "INTERNAL: green room is through the loading dock"));
        publicBlock.EnsureSuccessStatusCode();

        await CreateBlockAsync(client, venueId, festival, "Internal Only", "10:00", "11:00");

        var response = await client.GetAsync($"{ItineraryPath(venueId, festival.EventId)}/public");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var raw = await response.Content.ReadAsStringAsync();

        raw.Should().Contain("Public Headliner");
        raw.Should().NotContain("Internal Only", "non-public blocks must not reach the public view");
        raw.Should().NotContain("green room",
            "internal logistics must never appear in the public payload");
    }

    [Fact]
    public async Task PublicItinerary_ExcludesCanceledBlocks()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var created = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Cancelled Show", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false, IsPubliclyVisible: true));
        var block = await created.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();

        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block!.Id}/status",
            new SetBlockStatusRequest("CANCELED"));

        var response = await client.GetAsync($"{ItineraryPath(venueId, festival.EventId)}/public");
        (await response.Content.ReadAsStringAsync()).Should().NotContain("Cancelled Show");
    }

    [Fact]
    public async Task PublishVisibility_UpdatesBlocksAndIsAudited()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "To Publish", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            $"{ItineraryPath(venueId, festival.EventId)}/publish-visibility",
            new SetPublishVisibilityRequest([block.Id], true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var publicView = await client.GetAsync($"{ItineraryPath(venueId, festival.EventId)}/public");
        (await publicView.Content.ReadAsStringAsync()).Should().Contain("To Publish");
    }

    [Fact]
    public async Task Itinerary_RejectsCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        (await otherClient.GetAsync(ItineraryPath(ownerVenueId, festival.EventId)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.GetAsync($"{ItineraryPath(ownerVenueId, festival.EventId)}/public"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    internal static string ItineraryPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/itinerary";
}
