using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementImmutabilityTests : IntegrationTestBase
{
    [Fact]
    public async Task PostSettle_MutationsReturn400_AndPdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 100m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var storedPath = ArchiveStore.StoredObjectPaths.Single();
        var originalBytes = ArchiveStore.GetStoredPdf(storedPath)!;

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, lineItem.RowVersion));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        lockResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        ArchiveStore.GetStoredPdf(storedPath).Should().Equal(originalBytes);
    }
}
