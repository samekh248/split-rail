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
}
