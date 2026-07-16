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
        var responses = await Task.WhenAll(task1, task2);

        var statuses = responses.Select(r => r.StatusCode).ToArray();
        statuses.Should().Contain(HttpStatusCode.OK,
            because: $"one finalize must win; got [{string.Join(", ", statuses)}]");
        statuses.Should().Contain(s => s == HttpStatusCode.Conflict || s == HttpStatusCode.BadRequest,
            because: $"the loser must conflict; got [{string.Join(", ", statuses)}]");
        ArchiveStore.StoredObjectCount.Should().Be(1);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }
}
