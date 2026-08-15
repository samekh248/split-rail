using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementRollupTests : IntegrationTestBase
{
    [Fact]
    public async Task ArtistRollup_ShowsPerAppearanceIndependence()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/artists",
            new CreateFestivalArtistRequest("Shared Artist"));
        var artist = await artistResponse.Content.ReadFromJsonAsync<FestivalArtistResponse>();

        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var first = await CreateBlockAsync(
            client, venueId, festival, "Day One", "20:00", "21:00",
            requiresSettlement: true, newArtistName: null);
        var second = await CreateBlockAsync(
            client, venueId, festival, "Day Two", "20:00", "21:00",
            requiresSettlement: true, dayDate: "2026-08-15");

        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{first.Id}",
            new UpdateProgrammingBlockRequest(
                first.Title, first.DayDate, festival.Stages[0].Id,
                first.StartTime, first.EndTime, "MUSIC", true, FestivalArtistId: artist!.Id));
        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{second.Id}",
            new UpdateProgrammingBlockRequest(
                second.Title, second.DayDate, festival.Stages[0].Id,
                second.StartTime, second.EndTime, "MUSIC", true, FestivalArtistId: artist.Id));

        await AllocateAsync(client, venueId, festival, bucket.Id, first.Id, 10m);
        await AllocateAsync(client, venueId, festival, bucket.Id, second.Id, 10m);
        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, first.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 5_000m, 0m, "GROSS"));
        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, second.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 3_000m, 0m, "GROSS"));

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, first.Id));
        (await FinalizeRawAsync(
            client, venueId, festival.EventId, first.Id, expectedNetPayable: preflight!.FinalPayable))
            .EnsureSuccessStatusCode();

        var rollup = await client.GetFromJsonAsync<ArtistSettlementRollupDto>(
            ArtistRollupPath(venueId, festival.EventId, artist.Id));

        rollup!.AppearanceCount.Should().Be(2);
        rollup.Appearances.Should().Contain(a =>
            a.BlockId == first.Id && a.SettlementStatus == "FINALIZED" && a.NetPayable.HasValue);
        rollup.Appearances.Should().Contain(a =>
            a.BlockId == second.Id && a.SettlementStatus == "DRAFT" && a.NetPayable == null);
        rollup.TotalNetPayout.Should().BeGreaterThan(0m);
    }
}
