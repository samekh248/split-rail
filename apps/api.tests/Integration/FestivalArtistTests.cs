using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// One artist identity with many Programming Blocks — never duplicated unrelated records,
/// never collapsed into one schedule object (spec FR-008).
/// </summary>
public class FestivalArtistTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateArtist_AddsNamedArtist()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            ArtistsPath(venueId, festival.EventId),
            new CreateFestivalArtistRequest("Cody Jinks"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var artist = await response.Content.ReadFromJsonAsync<FestivalArtistResponse>();
        artist!.Name.Should().Be("Cody Jinks");
        artist.AppearanceCount.Should().Be(0);
    }

    [Fact]
    public async Task CreateArtist_RejectsDuplicateNameWithinFestival()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        await client.PostAsJsonAsync(
            ArtistsPath(venueId, festival.EventId), new CreateFestivalArtistRequest("Cody Jinks"));

        var duplicate = await client.PostAsJsonAsync(
            ArtistsPath(venueId, festival.EventId), new CreateFestivalArtistRequest("cody jinks"));

        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task MultipleAppearances_ShareOneArtistIdentity()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var first = await CreateBlockAsync(
            client, venueId, festival, "Set A", "20:00", "21:00",
            dayDate: "2026-08-14", newArtistName: "Cody Jinks");
        var second = await CreateBlockAsync(
            client, venueId, festival, "Set B", "20:00", "21:00",
            dayDate: "2026-08-15", newArtistName: "Cody Jinks");

        first.FestivalArtistId.Should().NotBeNull();
        second.FestivalArtistId.Should().Be(first.FestivalArtistId,
            "the same artist name must resolve to one identity, not duplicates");

        var artists = await client.GetFromJsonAsync<List<FestivalArtistResponse>>(
            ArtistsPath(venueId, festival.EventId));
        artists.Should().ContainSingle();
        artists![0].AppearanceCount.Should().Be(2);
    }

    [Fact]
    public async Task Appearances_ListAllBlocksForAnArtistInOrder()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        await CreateBlockAsync(client, venueId, festival, "Set B", "20:00", "21:00",
            dayDate: "2026-08-15", newArtistName: "Cody Jinks");
        var first = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            dayDate: "2026-08-14", newArtistName: "Cody Jinks");

        var appearances = await client.GetFromJsonAsync<List<ArtistAppearanceDto>>(
            $"{ArtistsPath(venueId, festival.EventId)}/{first.FestivalArtistId}/appearances");

        appearances.Should().HaveCount(2);
        appearances!.Select(a => a.Title).Should().ContainInOrder("Set A", "Set B");
        appearances[0].StageName.Should().Be("Main Stage");
    }

    [Fact]
    public async Task CopyDealTerms_AppliesSourceTermsToTargetBlocks()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var source = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            dayDate: "2026-08-14", requiresSettlement: true, newArtistName: "Cody Jinks");
        var target = await CreateBlockAsync(client, venueId, festival, "Set B", "20:00", "21:00",
            dayDate: "2026-08-15", requiresSettlement: true, newArtistName: "Cody Jinks");

        var response = await client.PostAsJsonAsync(
            $"{ArtistsPath(venueId, festival.EventId)}/{source.FestivalArtistId}/copy-deal-terms",
            new CopyDealTermsRequest(source.Id, [target.Id]));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Contain("1");
    }

    [Fact]
    public async Task CopyDealTerms_RejectsUnknownSourceBlock()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            newArtistName: "Cody Jinks");

        var response = await client.PostAsJsonAsync(
            $"{ArtistsPath(venueId, festival.EventId)}/{block.FestivalArtistId}/copy-deal-terms",
            new CopyDealTermsRequest(Guid.NewGuid(), [block.Id]));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ArtistEndpoints_RejectCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        (await otherClient.GetAsync(ArtistsPath(ownerVenueId, festival.EventId)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.PostAsJsonAsync(
            ArtistsPath(ownerVenueId, festival.EventId), new CreateFestivalArtistRequest("Sneaky")))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private static string ArtistsPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/artists";
}
