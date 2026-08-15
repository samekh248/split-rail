using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Same-stage overlap is the core safety rail of the festival itinerary; cross-stage overlap
/// is the whole point of a multi-stage festival (spec FR-010).
/// </summary>
public class BlockConflictTests : IntegrationTestBase
{
    [Fact]
    public async Task SameStageOverlap_IsRejectedAndNamesTheConflictingBlock()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Headliner", "20:00", "22:00");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Overlapping Act", "2026-08-14", festival.Stages[0].Id,
                "21:00", "23:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Headliner", "the user must be told which block conflicts");
        body.Should().Contain("20:00");
    }

    [Fact]
    public async Task CrossStageOverlap_IsAllowed()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var second = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));
        var rodeo = await second.Content.ReadFromJsonAsync<StageZoneResponse>();

        await CreateBlockAsync(client, venueId, festival, "Main Act", "20:00", "22:00");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Concurrent Rodeo", "2026-08-14", rodeo!.Id,
                "20:00", "22:00", "EXHIBITION", false));

        response.StatusCode.Should().Be(HttpStatusCode.Created,
            "different stages running at the same time is core festival behavior");
    }

    [Fact]
    public async Task AdjacentBlocks_DoNotConflict()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Opener", "18:00", "19:00");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Headliner", "2026-08-14", festival.Stages[0].Id,
                "19:00", "21:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Created,
            "a block starting exactly when another ends does not overlap");
    }

    [Fact]
    public async Task SameStageSameTimeOnDifferentDays_DoNotConflict()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBlockAsync(client, venueId, festival, "Night One", "20:00", "22:00");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Night Two", "2026-08-15", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CanceledBlock_FreesItsSlot()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var existing = await CreateBlockAsync(client, venueId, festival, "Dropped Act", "20:00", "22:00");

        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{existing.Id}/status",
            new SetBlockStatusRequest("CANCELED", "Artist cancelled"));

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Replacement Act", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Created,
            "canceled blocks must not block scheduling");
    }

    [Fact]
    public async Task DelayedBlock_StillHoldsItsSlot()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var existing = await CreateBlockAsync(client, venueId, festival, "Delayed Act", "20:00", "22:00");

        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{existing.Id}/status",
            new SetBlockStatusRequest("DELAYED"));

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Another Act", "2026-08-14", festival.Stages[0].Id,
                "20:30", "21:30", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict,
            "delayed blocks stay active on the itinerary");
    }

    [Fact]
    public async Task MovingABlockToAnotherStage_FreesItsPreviousSlot()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var created = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));
        var rodeo = await created.Content.ReadFromJsonAsync<StageZoneResponse>();

        var block = await CreateBlockAsync(client, venueId, festival, "Movable", "20:00", "22:00");

        // Move it off the main stage...
        var move = await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Movable", "2026-08-14", rodeo!.Id, "20:00", "22:00", "MUSIC", false));
        move.StatusCode.Should().Be(HttpStatusCode.OK);

        // ...and the vacated main-stage slot is now free.
        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Takes The Slot", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task UpdatingABlockInPlace_DoesNotConflictWithItself()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Solo Act", "20:00", "22:00");

        var response = await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Solo Act Renamed", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SameArtistOverlap_WarnsWithoutBlocking()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var created = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Second Stage"));
        var secondStage = await created.Content.ReadFromJsonAsync<StageZoneResponse>();

        await CreateBlockAsync(
            client, venueId, festival, "Cody Jinks Set A", "20:00", "22:00",
            newArtistName: "Cody Jinks");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Cody Jinks Cameo", "2026-08-14", secondStage!.Id,
                "21:00", "21:30", "MUSIC", false, NewArtistName: "Cody Jinks"));

        response.StatusCode.Should().Be(HttpStatusCode.Created,
            "an artist double-booking is a warning, not a hard block");

        var block = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        block!.Warnings.Should().Contain(w => w.Code == "ARTIST_DOUBLE_BOOKED");
    }

    [Fact]
    public async Task ReinstatingACanceledBlock_RevalidatesTheSlot()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var original = await CreateBlockAsync(client, venueId, festival, "Original", "20:00", "22:00");

        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{original.Id}/status",
            new SetBlockStatusRequest("CANCELED"));

        // Someone takes the freed slot...
        await CreateBlockAsync(client, venueId, festival, "Replacement", "20:00", "22:00");

        // ...so the original can no longer simply come back.
        var response = await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{original.Id}/status",
            new SetBlockStatusRequest("SCHEDULED"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
