using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboAppendOnlyTests : IntegrationTestBase
{
    [Fact]
    public async Task ResyncWithAlteredUpstream_PreservesOriginalLedgerAmount()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);

        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue = 100m;
        await db.SaveChangesAsync();

        var ledgerBefore = await db.QboSyncLedgers.AsNoTracking().ToListAsync();
        ledgerBefore.Should().HaveCount(1);
        ledgerBefore[0].Amount.Should().Be(100m);

        var qboJson = BuildQboResponse("TXN-1", "ACC-1", 999m, evt.QboTagName);
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
        var ledgerAfter = await verifyDb.QboSyncLedgers.AsNoTracking().ToListAsync();
        ledgerAfter.Should().HaveCount(1);
        ledgerAfter[0].Amount.Should().Be(100m);

        var updatedLineItem = await verifyDb.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        updatedLineItem.QboActualValue.Should().Be(100m);
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

internal sealed class RecordingQboHandler : HttpMessageHandler
{
    private readonly string _qboQueryJson;
    public IList<string> Methods { get; } = new List<string>();

    public RecordingQboHandler(string qboQueryJson) => _qboQueryJson = qboQueryJson;

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        Methods.Add(request.Method.Method);

        if (request.Method == HttpMethod.Get)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_qboQueryJson, Encoding.UTF8, "application/json")
            });
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
    }
}
