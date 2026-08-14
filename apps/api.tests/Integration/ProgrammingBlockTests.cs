using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class ProgrammingBlockTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateBlock_RequiresOnlyCreationLevelFields()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Cody Jinks", "2026-08-14", festival.Stages[0].Id,
                "20:00", "21:30", "MUSIC", RequiresSettlement: true));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var block = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        block!.Title.Should().Be("Cody Jinks");
        block.Category.Should().Be("MUSIC");
        block.ScheduleStatus.Should().Be("SCHEDULED");
        block.SettlementStatus.Should().Be("DRAFT", "settlement-bearing blocks start as draft");
        block.Description.Should().BeNull("optional fields may be omitted at creation");
    }

    [Theory]
    [InlineData("EXHIBITION")]
    [InlineData("VENDOR")]
    [InlineData("EXPERIENCE")]
    public async Task CreateBlock_SupportsNonMusicCategoriesWithoutSettlement(string category)
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                $"{category} item", "2026-08-14", festival.Stages[0].Id,
                "10:00", "12:00", category, RequiresSettlement: false,
                Description: "Setup notes, staffing, and safety details."));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var block = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        block!.Category.Should().Be(category);
        block.SettlementStatus.Should().Be("NOT_REQUIRED",
            "lightweight blocks stay out of the settlement flow unless explicitly enabled");
        block.Description.Should().Contain("staffing");
    }

    [Fact]
    public async Task CreateBlock_RejectsDayOutsideFestivalRange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, startDate: "2026-08-14", endDate: "2026-08-16");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Late Act", "2026-08-20", festival.Stages[0].Id,
                "20:00", "21:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("outside the festival range");
    }

    [Fact]
    public async Task CreateBlock_RejectsEndTimeBeforeStartTime()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Backwards", "2026-08-14", festival.Stages[0].Id,
                "22:00", "20:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("after the start time");
    }

    [Fact]
    public async Task CreateBlock_RejectsStageFromAnotherFestival()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var first = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "First", "2026-08-14", "2026-08-15");
        var second = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "Second", "2026-09-14", "2026-09-15");

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, first.EventId),
            new CreateProgrammingBlockRequest(
                "Wrong Stage", "2026-08-14", second.Stages[0].Id,
                "20:00", "21:00", "MUSIC", false));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("not part of this festival");
    }

    [Fact]
    public async Task CreateBlock_RejectsBlankTitleAndUnknownCategory()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var blank = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "  ", "2026-08-14", festival.Stages[0].Id, "20:00", "21:00", "MUSIC", false));
        blank.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var badCategory = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Act", "2026-08-14", festival.Stages[0].Id, "20:00", "21:00", "CIRCUS", false));
        badCategory.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateBlock_ChangesPlacementAndFields()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Opening Act", "18:00", "19:00");

        var response = await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Renamed Act", "2026-08-15", festival.Stages[0].Id,
                "19:00", "20:30", "MUSIC", RequiresSettlement: true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        updated!.Title.Should().Be("Renamed Act");
        updated.DayDate.Should().Be("2026-08-15");
        updated.StartTime.Should().Be("19:00");
    }

    [Fact]
    public async Task DeleteBlock_RemovesADraftBlock()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Temp", "12:00", "13:00");

        var response = await client.DeleteAsync($"{BlocksPath(venueId, festival.EventId)}/{block.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task BlockEndpoints_RejectCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);
        var block = await CreateBlockAsync(ownerClient, ownerVenueId, festival, "Private", "20:00", "21:00");

        var (otherClient, _, _) = await SetupFinancialAdminAsync();
        var path = BlocksPath(ownerVenueId, festival.EventId);

        (await otherClient.PostAsJsonAsync(path, new CreateProgrammingBlockRequest(
            "Sneaky", "2026-08-14", festival.Stages[0].Id, "10:00", "11:00", "MUSIC", false)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.PutAsJsonAsync($"{path}/{block.Id}", new UpdateProgrammingBlockRequest(
            "Hijack", "2026-08-14", festival.Stages[0].Id, "10:00", "11:00", "MUSIC", false)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.DeleteAsync($"{path}/{block.Id}"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.GetAsync($"{path}/{block.Id}/history"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    internal static string BlocksPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/blocks";

    internal static async Task<ProgrammingBlockResponse> CreateBlockAsync(
        HttpClient client,
        Guid venueId,
        FestivalResponse festival,
        string title,
        string startTime,
        string endTime,
        Guid? stageZoneId = null,
        string dayDate = "2026-08-14",
        string category = "MUSIC",
        bool requiresSettlement = false,
        string? newArtistName = null)
    {
        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                title,
                dayDate,
                stageZoneId ?? festival.Stages[0].Id,
                startTime,
                endTime,
                category,
                requiresSettlement,
                NewArtistName: newArtistName));

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>())!;
    }
}
