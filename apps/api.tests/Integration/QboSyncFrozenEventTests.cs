using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboSyncFrozenEventTests : IntegrationTestBase
{
    protected override bool EnableLogCapture => true;

    [Fact]
    public async Task SettledEvent_SyncWithNewTransaction_Returns400_AndSnapshotUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-FROZEN", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-FROZEN", "ACC-FROZEN", 175m, evt!.QboTagName);
        var response = await PostSyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.AsNoTracking()
            .SingleAsync(li => li.Id == seed.LineItem.Id);
        lineItem.SettlementValue.Should().Be(100m);
        lineItem.ProformaValue.Should().Be(100m);
        lineItem.QboActualValue.Should().Be(0m);
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task ReconciledEvent_SyncWithNewTransaction_Returns200_ActualsOnly()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-RECON", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-RECON", "ACC-RECON", 275m, evt!.QboTagName);
        var response = await PostSyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.AsNoTracking()
            .SingleAsync(li => li.Id == seed.LineItem.Id);
        lineItem.QboActualValue.Should().Be(275m);
        lineItem.SettlementValue.Should().Be(100m);
        lineItem.ProformaValue.Should().Be(100m);
    }

    [Fact]
    public async Task ReconciledEvent_Sync_PdfBytesUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-PDF", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-PDF", "ACC-PDF", 300m, evt!.QboTagName);
        var response = await PostSyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task SettledEvent_SyncRejection_LogsQboSyncRecomputeAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-AUDIT", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-AUDIT", "ACC-AUDIT", 180m, evt!.QboTagName);
        LogCollector!.Clear();

        var response = await PostSyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        AssertFrozenAuditLog(
            seed.EventId,
            venueId,
            seed.UserId,
            FrozenEventMutationOperation.QboSyncRecompute,
            "SETTLED");
    }

    [Fact]
    public async Task ReconciledEvent_SuccessfulSync_NoRejectionAuditLog()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-NO-AUDIT", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-NO-AUDIT", "ACC-NO-AUDIT", 190m, evt!.QboTagName);
        LogCollector!.Clear();

        var response = await PostSyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        GetFrozenAuditLogs().Should().BeEmpty();
    }

    [Fact]
    public async Task VenueBatchSync_MixedStates_IsolatesSettledFailure()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var preShow = await CreateEventViaApiAsync(client, venueId, "Pre Show", "2026-08-01", "EVENT-PRESHOW-BATCH");
        var preShowLineId = await SeedLineItemDirectAsync(token, preShow.EventId, settlementValue: 500m);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-PRESHOW", preShowLineId);

        var settled = await SeedFinalizedEventAsync(client, venueId, token);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-SETTLED-BATCH", settled.LineItem.Id);
        await SeedQboCredentialDirectAsync(token, venueId);

        var preShowEvt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{preShow.EventId}");
        var settledEvt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{settled.EventId}");

        var qboJson = $$"""
        {
          "QueryResponse": {
            "Purchase": [
              {
                "Id": "TXN-PRESHOW",
                "TotalAmt": 100,
                "TxnDate": "2026-06-10",
                "Tag": [{ "Name": "{{preShowEvt!.QboTagName}}" }],
                "AccountRef": { "value": "ACC-PRESHOW", "name": "Account" }
              },
              {
                "Id": "TXN-SETTLED",
                "TotalAmt": 200,
                "TxnDate": "2026-06-10",
                "Tag": [{ "Name": "{{settledEvt!.QboTagName}}" }],
                "AccountRef": { "value": "ACC-SETTLED-BATCH", "name": "Account" }
              }
            ]
          }
        }
        """;

        var handler = new RecordingQboHandler(qboJson);
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var response = await customClient.PostAsync($"/api/venues/{venueId}/sync", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<VenueSyncResultDto>();
        result!.Results.Should().Contain(r => r.EventId == preShow.EventId && r.Success);
        result.Results.Should().Contain(r => r.EventId == settled.EventId && !r.Success);
    }

    private async Task<HttpResponseMessage> PostSyncWithHandlerAsync(
        HttpClient client,
        Guid venueId,
        Guid eventId,
        string qboJson)
    {
        var handler = new RecordingQboHandler(qboJson);
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        return await customClient.PostAsync(
            $"/api/venues/{venueId}/events/{eventId}/sync",
            null);
    }

    private static string BuildQboPurchaseResponse(
        string txnId,
        string accountId,
        decimal amount,
        string tagName) =>
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
