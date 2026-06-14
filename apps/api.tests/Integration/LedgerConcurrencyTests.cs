using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LedgerConcurrencyTests : IntegrationTestBase
{
    [Fact]
    public async Task UpdateLineItem_StaleRowVersion_Returns409()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        var staleVersion = "AAAAAAAAAAA=";

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}",
            new UpdateLineItemRequest("GA Tickets", 0, false, 6000m, 0m, null, false, staleVersion));

        updateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
