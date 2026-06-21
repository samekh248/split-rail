using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Settlement;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementConcurrencyTests : IntegrationTestBase
{
    [Fact]
    public async Task ParallelFinalize_OneSucceedsOneConflicts_WithSingleStoredPdf()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);
        var request = new FinalizeSettlementRequest(ValidSignatureBase64(), true);
        var url = $"/api/venues/{venueId}/events/{evt.EventId}/settle";

        var task1 = client.PostAsJsonAsync(url, request);
        var task2 = client.PostAsJsonAsync(url, request);
        await Task.WhenAll(task1, task2);

        var statuses = new[] { task1.Result.StatusCode, task2.Result.StatusCode };
        statuses.Should().Contain(HttpStatusCode.OK);
        statuses.Should().Contain(s => s is HttpStatusCode.Conflict or HttpStatusCode.BadRequest);
        ArchiveStore.StoredObjectCount.Should().Be(1);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }
}
