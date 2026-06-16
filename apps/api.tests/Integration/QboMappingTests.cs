using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboMappingTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateMapping_ReprocessesUnmappedTransactions()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.UnmappedQboTransactions.Add(new SplitRail.Api.Models.UnmappedQboTransaction
            {
                EventId = evt.EventId,
                VenueId = venueId,
                QboTransactionId = "TXN-U-1",
                QboAccountId = "ACC-NEW",
                QboAccountName = "New Account",
                Amount = 75m,
                TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow)
            });
            await db.SaveChangesAsync();
        }

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/mappings",
            new CreateMappingRequest("ACC-NEW", "New Account", "Production", lineItemId));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        (await verifyDb.UnmappedQboTransactions.CountAsync()).Should().Be(0);
        (await verifyDb.QboSyncLedgers.CountAsync()).Should().Be(1);

        var lineItem = await verifyDb.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(75m);
    }

    [Fact]
    public async Task DuplicateMapping_Returns409()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboMappingDirectAsync(token, venueId, "ACC-DUP", null);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/mappings",
            new CreateMappingRequest("ACC-DUP", "Dup", "Cat", null));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task GetMappings_ReturnsVenueMappings()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboMappingDirectAsync(token, venueId, "ACC-LIST", null, "Listed Account");

        var response = await client.GetAsync($"/api/venues/{venueId}/mappings");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var mappings = await response.Content.ReadFromJsonAsync<QboAccountMappingsResponse>();
        mappings!.Mappings.Should().ContainSingle(m => m.QboAccountId == "ACC-LIST");
    }

    [Fact]
    public async Task UpdateMapping_ReturnsUpdatedMapping()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var mappingId = await SeedQboMappingDirectAsync(token, venueId, "ACC-UPD", null);

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/mappings/{mappingId}",
            new UpdateMappingRequest("Updated Category", null));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await response.Content.ReadFromJsonAsync<QboAccountMappingDto>();
        updated!.MappedCategoryLabel.Should().Be("Updated Category");
    }

    [Fact]
    public async Task DeleteMapping_Returns204()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var mappingId = await SeedQboMappingDirectAsync(token, venueId, "ACC-DEL", null);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/mappings/{mappingId}");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<QboAccountMappingsResponse>($"/api/venues/{venueId}/mappings");
        list!.Mappings.Should().NotContain(m => m.Id == mappingId);
    }
}
