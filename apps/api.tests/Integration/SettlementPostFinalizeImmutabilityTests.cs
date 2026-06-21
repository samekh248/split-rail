using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementPostFinalizeImmutabilityTests : IntegrationTestBase
{
    protected override bool EnableLogCapture => true;

    [Fact]
    public async Task PostFinalize_DeleteLineItem_Returns400_AndLogsDeleteLineItem()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.DeleteLineItem, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_UpdateArtist_Returns400_AndLogsUpdateArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventWithArtistAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists/{seed.Artist!.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, seed.Artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.UpdateArtist, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_DeleteArtist_Returns400_AndLogsDeleteArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventWithArtistAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists/{seed.Artist!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.DeleteArtist, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_CreateLineItem_Returns400_AndLogsCreateLineItem()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Blocked Row", 2, false, 50m, 50m, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.CreateLineItem, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_UpdateLineItem_Returns400_AndLogsUpdateLineItem()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, seed.LineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.UpdateLineItem, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_UpdateEventMetadata_Returns400_AndLogsUpdateEventMetadata()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}",
            new UpdateEventRequest("Renamed Show", "2026-08-01", "TAG-NEW"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.UpdateEventMetadata, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_DeleteEvent_Returns400_AndLogsDeleteEvent()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{seed.EventId}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.DeleteEvent, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_CreateArtist_Returns400_AndLogsCreateArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists",
            new CreateArtistRequest("Late Add", 1, "guarantee", null, 1000m, 0m, 0m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.CreateArtist, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_LockBudget_Returns400_AndLogsLockBudget()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/lock-budget", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.LockBudget, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_SequentialBlockedMutations_PdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventWithArtistAsync(client, venueId, token);
        var storedPathsBefore = ArchiveStore.StoredObjectPaths.ToList();
        LogCollector!.Clear();

        (await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, seed.LineItem.RowVersion)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PostAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/lock-budget", null))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists/{seed.Artist!.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, seed.Artist.RowVersion)))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        ArchiveStore.GetStoredPdf(seed.StoredPath).Should().Equal(seed.OriginalPdfBytes);
        ArchiveStore.StoredObjectCount.Should().Be(1);
        ArchiveStore.StoredObjectPaths.Should().BeEquivalentTo(storedPathsBefore);
        GetFrozenAuditLogs().Should().HaveCount(3);
    }

    [Fact]
    public async Task PostFinalize_BlockedMutation_NoSecondPdfArtifact()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        var objectCountBefore = ArchiveStore.StoredObjectCount;
        var pathsBefore = ArchiveStore.StoredObjectPaths.ToList();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        ArchiveStore.StoredObjectCount.Should().Be(objectCountBefore);
        ArchiveStore.StoredObjectPaths.Should().BeEquivalentTo(pathsBefore);
        ArchiveStore.GetStoredPdf(seed.StoredPath).Should().Equal(seed.OriginalPdfBytes);
    }

    [Fact]
    public async Task PostReconcile_UpdateLineItem_Returns400_AndLogsAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/line-items/{seed.LineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 250m, null, false, seed.LineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.UpdateLineItem, "RECONCILED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostReconcile_UpdateArtist_Returns400_AndLogsAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token, includeArtist: true);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists/{seed.Artist!.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, seed.Artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.UpdateArtist, "RECONCILED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostReconcile_DeleteArtist_Returns400_AndLogsAudit_AndPdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token, includeArtist: true);
        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/artists/{seed.Artist!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.DeleteArtist, "RECONCILED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_Recalculate_Returns400_AndLogsRecalculate_AndPdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/recalculate", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(
            seed.EventId, venueId, seed.UserId, FrozenEventMutationOperation.Recalculate, "SETTLED");
        AssertPdfUnchanged(seed);
    }

    [Fact]
    public async Task PostFinalize_QboSync_ActualsOnly_Succeeds_PdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedEventAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-SYNC", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-SYNC", "ACC-SYNC", 175m, evt!.QboTagName);
        LogCollector!.Clear();

        await SyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);

        GetFrozenAuditLogs().Should().BeEmpty();
        AssertPdfUnchanged(seed);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.AsNoTracking()
            .SingleAsync(li => li.Id == seed.LineItem.Id);
        lineItem.QboActualValue.Should().Be(175m);
        lineItem.SettlementValue.Should().Be(100m);
    }

    [Fact]
    public async Task PostReconcile_QboSync_ActualsOnly_Succeeds_PdfUnchanged()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var seed = await SeedFinalizedThenReconciledAsync(client, venueId, token);
        var evt = await client.GetFromJsonAsync<EventResponse>(
            $"/api/venues/{venueId}/events/{seed.EventId}");
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "ACC-SYNC-R", seed.LineItem.Id);

        var qboJson = BuildQboPurchaseResponse("TXN-SYNC-R", "ACC-SYNC-R", 225m, evt!.QboTagName);
        LogCollector!.Clear();

        await SyncWithHandlerAsync(client, venueId, seed.EventId, qboJson);

        GetFrozenAuditLogs().Should().BeEmpty();
        AssertPdfUnchanged(seed);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.AsNoTracking()
            .SingleAsync(li => li.Id == seed.LineItem.Id);
        lineItem.QboActualValue.Should().Be(225m);
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
