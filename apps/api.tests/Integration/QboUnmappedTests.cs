using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboUnmappedTests : IntegrationTestBase
{
    [Fact]
    public async Task UnmappedEndpoints_ReturnCorrectCounts()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SplitRail.Api.Data.ApplicationDbContext>();
            db.UnmappedQboTransactions.Add(new SplitRail.Api.Models.UnmappedQboTransaction
            {
                EventId = evt.EventId,
                VenueId = venueId,
                QboTransactionId = "TXN-1",
                QboAccountId = "ACC-1",
                QboAccountName = "Account",
                Amount = 10m,
                TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow)
            });
            await db.SaveChangesAsync();
        }

        var countResponse = await client.GetAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/unmapped-count");
        countResponse.EnsureSuccessStatusCode();
        var count = await countResponse.Content.ReadFromJsonAsync<UnmappedCountDto>();
        count!.UnmappedCount.Should().Be(1);

        var listResponse = await client.GetAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/unmapped-transactions");
        listResponse.EnsureSuccessStatusCode();
        var list = await listResponse.Content.ReadFromJsonAsync<UnmappedTransactionsResponse>();
        list!.UnmappedCount.Should().Be(1);
        list.Transactions.Should().HaveCount(1);
    }
}
