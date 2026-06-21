using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementImmutabilityTests : IntegrationTestBase
{
    [Fact]
    public async Task PostSettle_MutationsReturn400_AndPdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, seed.LineItem.RowVersion));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/lock-budget", null);
        lockResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        ArchiveStore.GetStoredPdf(seed.StoredPath).Should().Equal(seed.OriginalPdfBytes);
    }
}
