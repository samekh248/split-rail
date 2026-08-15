using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementConcurrencyTests : IntegrationTestBase
{
    [Fact]
    public async Task ParallelFinalize_OnSameBlock_OneSucceedsOneConflicts()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var preflight = await client.GetFromJsonAsync<FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));
        var request = new FinalizeBlockSettlementRequest(true, preflight!.FinalPayable);
        var url = FinalizePath(venueId, festival.EventId, block.Id);

        var task1 = client.PostAsJsonAsync(url, request);
        var task2 = client.PostAsJsonAsync(url, request);
        var responses = await Task.WhenAll(task1, task2);

        var statuses = responses.Select(r => r.StatusCode).ToArray();
        statuses.Count(s => s == HttpStatusCode.OK).Should().Be(1);
        statuses.Should().Contain(s => s != HttpStatusCode.OK);
        ArchiveStore.StoredObjectCount.Should().Be(1);
    }
}
