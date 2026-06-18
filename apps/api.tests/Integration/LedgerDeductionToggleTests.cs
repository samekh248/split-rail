using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LedgerDeductionToggleTests : IntegrationTestBase
{
    [Fact]
    public async Task ToggleArtistDeduction_Recalculate_UpdatesTotalDeductions()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var expenseCreate = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("EXPENSES", "Production", 1, false, 2000m, 0m, null));
        expenseCreate.StatusCode.Should().Be(HttpStatusCode.Created);
        var expense = await expenseCreate.Content.ReadFromJsonAsync<LineItemDto>();

        var ledgerBefore = await client.GetFromJsonAsync<LedgerGridResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        ledgerBefore!.Summary.TotalDeductions.Should().Be(0m);
        ledgerBefore.Summary.NetShowRevenue.Should().Be(10000m);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{expense!.Id}",
            new UpdateLineItemRequest(
                "Production", 1, true, 2000m, 0m, null, false, expense.RowVersion));
        updateResponse.EnsureSuccessStatusCode();

        var recalcResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/recalculate", null);
        recalcResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var ledgerAfter = await recalcResponse.Content.ReadFromJsonAsync<LedgerGridResponse>();
        ledgerAfter!.Summary.TotalDeductions.Should().Be(2000m);
        ledgerAfter.Summary.NetShowRevenue.Should().Be(8000m);

        var toggledOff = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{expense.Id}",
            new UpdateLineItemRequest(
                "Production", 1, false, 2000m, 0m, null, false,
                (await updateResponse.Content.ReadFromJsonAsync<LineItemDto>())!.RowVersion));
        toggledOff.EnsureSuccessStatusCode();

        var recalcOff = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/recalculate", null);
        var ledgerOff = await recalcOff.Content.ReadFromJsonAsync<LedgerGridResponse>();
        ledgerOff!.Summary.TotalDeductions.Should().Be(0m);
        ledgerOff.Summary.NetShowRevenue.Should().Be(10000m);
    }
}
