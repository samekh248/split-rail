using System.Net.Http.Json;
using SplitRail.Api.DTOs.Festivals;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

internal static class BlockSettlementTestHelpers
{
    internal static string SettlementPath(Guid venueId, Guid eventId, Guid blockId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/blocks/{blockId}/settlement";

    internal static string PreflightPath(Guid venueId, Guid eventId, Guid blockId) =>
        $"{SettlementPath(venueId, eventId, blockId)}/preflight";

    internal static string FinalizePath(Guid venueId, Guid eventId, Guid blockId) =>
        $"{SettlementPath(venueId, eventId, blockId)}/finalize";

    internal static string ReopenPath(Guid venueId, Guid eventId, Guid blockId) =>
        $"{SettlementPath(venueId, eventId, blockId)}/reopen";

    internal static string MyBlocksPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/my-blocks";

    internal static string ArtistRollupPath(Guid venueId, Guid eventId, Guid artistId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/artists/{artistId}/settlement-rollup";

    internal static async Task<(ProgrammingBlockResponse Block, RevenueBucketResponse Bucket)>
        SeedSettlementReadyBlockAsync(
            HttpClient client,
            Guid venueId,
            FestivalResponse festival,
            string title = "Headliner",
            decimal bucketAmount = 100_000m,
            decimal allocationPercent = 10m,
            decimal guarantee = 5_000m)
    {
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", bucketAmount);
        var block = await CreateBlockAsync(
            client, venueId, festival, title, "20:00", "22:00", requiresSettlement: true);

        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, allocationPercent);

        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, block.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest(
                "guarantee",
                guarantee,
                0m,
                "GROSS"));

        return (block, bucket);
    }

    internal static Task<HttpResponseMessage> FinalizeRawAsync(
        HttpClient client,
        Guid venueId,
        Guid eventId,
        Guid blockId,
        bool confirmed = true,
        decimal? expectedNetPayable = null) =>
        client.PostAsJsonAsync(
            FinalizePath(venueId, eventId, blockId),
            new FinalizeBlockSettlementRequest(confirmed, expectedNetPayable));
}
