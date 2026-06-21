using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboSyncLedgerAppendOnlyGuardTests : IntegrationTestBase
{
    [Fact]
    public async Task CorrectionSync_NeverModifiesExistingLedgerRows()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        Guid originalId;
        decimal originalAmount;
        QboSyncLedgerEntryType originalEntryType;

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var original = await db.QboSyncLedgers.AsNoTracking()
                .SingleAsync(l => l.EventId == evt.EventId && l.QboTransactionId == "TXN-1");
            originalId = original.Id;
            originalAmount = original.Amount;
            originalEntryType = original.EntryType;

            var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
            lineItem.QboActualValue = 100m;
            await db.SaveChangesAsync();
        }

        var qboJson = BuildQboResponse("TXN-1", "ACC-1", 150m, evt.QboTagName);

        var handler = new RecordingQboHandler(qboJson);
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var syncResponse = await customClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync",
            null);
        syncResponse.EnsureSuccessStatusCode();

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var originalAfter = await verifyDb.QboSyncLedgers.AsNoTracking()
            .SingleAsync(l => l.Id == originalId);

        originalAfter.Amount.Should().Be(originalAmount);
        originalAfter.EntryType.Should().Be(originalEntryType);
        (await verifyDb.QboSyncLedgers.AsNoTracking()
            .CountAsync(l => l.EventId == evt.EventId && l.EntryType == QboSyncLedgerEntryType.OffsetCorrection))
            .Should().Be(1);
    }

    private static string BuildQboResponse(string txnId, string accountId, decimal amount, string tagName) =>
        $$"""
        {
          "QueryResponse": {
            "Purchase": [{
              "Id": "{{txnId}}",
              "TotalAmt": {{amount}},
              "TxnDate": "2026-06-10",
              "Tag": [{ "Name": "{{tagName}}" }],
              "AccountRef": { "value": "{{accountId}}", "name": "Account" }
            }]
          }
        }
        """;
}
