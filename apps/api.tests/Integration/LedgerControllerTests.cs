using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Venues;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LedgerControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateLineItem_AndGetLedger_ReturnsGroupedBlocksAndTotals()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var ledgerResponse = await client.GetAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        ledgerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var ledger = await ledgerResponse.Content.ReadFromJsonAsync<LedgerGridResponse>();
        ledger!.Summary.GrossRevenue.Should().Be(10000m);
        ledger.Blocks.Should().HaveCount(3);
        ledger.Blocks.Single(b => b.BlockType == "REVENUE").Rows.Should().HaveCount(1);
        ledger.Editability.Proforma.Should().Be("editable");
    }

    [Fact]
    public async Task AddArtistGuarantee_AutoRecalculatesPayout()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 70m, 0m));
        artistResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var artist = await artistResponse.Content.ReadFromJsonAsync<EventArtistDto>();
        artist!.CalculatedNetPayout.Should().Be(7000m);
    }

    [Fact]
    public async Task AddArtistDoorSplit_UsesNetRevenueAfterDeductions()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("EXPENSES", "Catering", 1, true, 2000m, 0m, null));

        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Support", 2, "door_split", null, 0m, 50m, 0m));
        artistResponse.EnsureSuccessStatusCode();

        var artist = await artistResponse.Content.ReadFromJsonAsync<EventArtistDto>();
        artist!.CalculatedNetPayout.Should().Be(4000m);
    }

    [Fact]
    public async Task UpdateLineItem_RecalculatesSummary()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}",
            new UpdateLineItemRequest("GA Tickets", 0, false, 12000m, 0m, null, false, lineItem.RowVersion));
        updateResponse.EnsureSuccessStatusCode();

        var ledger = await client.GetFromJsonAsync<LedgerGridResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        ledger!.Summary.GrossRevenue.Should().Be(12000m);
    }

    [Fact]
    public async Task DeleteLineItem_Returns204()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 5000m, 0m, null));
        var lineItem = await createResponse.Content.ReadFromJsonAsync<LineItemDto>();

        var deleteResponse = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CustomArtist_InvalidFormula_Returns422()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Custom Act", 1, "custom", "GrossRevenue + +", 0m, 0m, 0m));

        artistResponse.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task CustomArtist_ValidFormula_CalculatesPayout()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var artistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest(
                "Custom Act", 1, "custom",
                "(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee",
                1000m, 50m, 0m));

        artistResponse.EnsureSuccessStatusCode();
        var artist = await artistResponse.Content.ReadFromJsonAsync<EventArtistDto>();
        artist!.CalculatedNetPayout.Should().Be(4000m);
    }

    [Fact]
    public async Task Recalculate_ReturnsUpdatedGrid()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var recalcResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/recalculate", null);
        recalcResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateArtist_RecalculatesPayout()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "GA Tickets", 0, false, 10000m, 0m, null));

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 70m, 0m));
        var artist = await createResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}",
            new UpdateArtistRequest("Headliner", 1, "guarantee", null, 3000m, 70m, 0m, artist.RowVersion));
        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await updateResponse.Content.ReadFromJsonAsync<EventArtistDto>();
        updated!.CalculatedNetPayout.Should().Be(7000m);
    }

    [Fact]
    public async Task DeleteArtist_Returns204()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 70m, 0m));
        var artist = await createResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        var deleteResponse = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
