using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboOffsetCorrectionTests : IntegrationTestBase
{
    [Fact]
    public async Task AmountChange_CreatesOffset_PreservesOriginal()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
            lineItem.QboActualValue = 100m;
            await db.SaveChangesAsync();
        }

        var originalId = await GetOriginalLedgerIdAsync(evt.EventId, "TXN-1");
        var qboJson = BuildQboResponse("TXN-1", "ACC-1", 150m, evt.QboTagName);
        await SyncWithHandlerAsync(client, venueId, evt.EventId, qboJson);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var ledger = await verifyDb.QboSyncLedgers.AsNoTracking()
            .Where(l => l.EventId == evt.EventId)
            .OrderBy(l => l.SyncedAt)
            .ToListAsync();

        ledger.Should().HaveCount(2);
        ledger[0].Id.Should().Be(originalId);
        ledger[0].Amount.Should().Be(100m);
        ledger[0].EntryType.Should().Be(QboSyncLedgerEntryType.Original);
        ledger[1].EntryType.Should().Be(QboSyncLedgerEntryType.OffsetCorrection);
        ledger[1].Amount.Should().Be(50m);
        ledger[1].CorrectionType.Should().Be(QboSyncCorrectionType.AmountChange);

        var updatedLineItem = await verifyDb.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        updatedLineItem.QboActualValue.Should().Be(150m);
    }

    [Fact]
    public async Task VoidRemoval_CreatesNegatingOffset()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
            lineItem.QboActualValue = 100m;
            await db.SaveChangesAsync();
        }

        var qboJson = """{ "QueryResponse": { "Purchase": [] } }""";
        await SyncWithHandlerAsync(client, venueId, evt.EventId, qboJson);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var offset = await verifyDb.QboSyncLedgers.AsNoTracking()
            .SingleAsync(l => l.EventId == evt.EventId && l.EntryType == QboSyncLedgerEntryType.OffsetCorrection);

        offset.Amount.Should().Be(-100m);
        offset.CorrectionType.Should().Be(QboSyncCorrectionType.VoidRemoval);
        offset.TargetStateAbsent.Should().BeTrue();

        var updatedLineItem = await verifyDb.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        updatedLineItem.QboActualValue.Should().Be(0m);
    }

    [Fact]
    public async Task ResyncUnchanged_DoesNotDuplicateOffset()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        var qboJson = BuildQboResponse("TXN-1", "ACC-1", 150m, evt.QboTagName);
        await SyncWithHandlerAsync(client, venueId, evt.EventId, qboJson);
        await SyncWithHandlerAsync(client, venueId, evt.EventId, qboJson);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var offsetCount = await verifyDb.QboSyncLedgers.AsNoTracking()
            .CountAsync(l => l.EventId == evt.EventId && l.EntryType == QboSyncLedgerEntryType.OffsetCorrection);

        offsetCount.Should().Be(1);
    }

    [Fact]
    public async Task SettledEvent_UpdatesActualsOnly()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(
            token,
            evt.EventId,
            settlementValue: 500m);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-1", lineItemId);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);
        await SetEventStatusDirectAsync(token, evt.EventId, EventStatus.Settled);

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
            lineItem.QboActualValue = 100m;
            await db.SaveChangesAsync();
        }

        var qboJson = BuildQboResponse("TXN-1", "ACC-1", 150m, evt.QboTagName);
        await SyncWithHandlerAsync(client, venueId, evt.EventId, qboJson);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var settledLineItem = await verifyDb.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        settledLineItem.QboActualValue.Should().Be(150m);
        settledLineItem.SettlementValue.Should().Be(500m);
    }

    [Fact]
    public async Task GetLedger_HasQboCorrection_TrueWhenOffsetMapped()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedOffsetLedgerEntryDirectAsync(token, evt.EventId, lineItemId, "TXN-1", "ACC-1", -25m);

        var response = await client.GetAsync($"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var ledger = await response.Content.ReadFromJsonAsync<LedgerGridResponse>();
        ledger.Should().NotBeNull();
        var row = ledger!.Blocks.SelectMany(b => b.Rows).Single(r => r.Id == lineItemId);
        row.HasQboCorrection.Should().BeTrue();
    }

    [Fact]
    public async Task GetLedger_HasQboCorrection_FalseWhenOriginalOnly()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId);
        await SeedSyncLedgerEntryDirectAsync(token, evt.EventId, "TXN-1", "ACC-1", 100m, lineItemId);

        var response = await client.GetAsync($"/api/venues/{venueId}/events/{evt.EventId}/ledger");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var ledger = await response.Content.ReadFromJsonAsync<LedgerGridResponse>();
        ledger.Should().NotBeNull();
        var row = ledger!.Blocks.SelectMany(b => b.Rows).Single(r => r.Id == lineItemId);
        row.HasQboCorrection.Should().BeFalse();
    }

    private async Task SyncWithHandlerAsync(
        HttpClient client,
        Guid venueId,
        Guid eventId,
        string qboJson)
    {
        var handler = new RecordingQboHandler(qboJson);
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var syncResponse = await customClient.PostAsync(
            $"/api/venues/{venueId}/events/{eventId}/sync",
            null);
        syncResponse.EnsureSuccessStatusCode();
    }

    private async Task<Guid> GetOriginalLedgerIdAsync(Guid eventId, string txnId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.QboSyncLedgers.AsNoTracking()
            .Where(l => l.EventId == eventId
                && l.QboTransactionId == txnId
                && l.EntryType == QboSyncLedgerEntryType.Original)
            .Select(l => l.Id)
            .SingleAsync();
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
