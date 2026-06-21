using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class FrozenEventPersistenceGuardTests : IntegrationTestBase
{
    protected override bool EnableLogCapture => true;

    [Fact]
    public async Task SettledEvent_RawDbContextLineItemBypass_ThrowsAndNoDbChange()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        var originalSettlement = lineItem.SettlementValue;

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItem.Id);
        stored.SettlementValue = originalSettlement + 500m;

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();

        db.ChangeTracker.Clear();
        var reloaded = await db.FinancialLineItems.AsNoTracking()
            .FirstAsync(li => li.Id == lineItem.Id);
        reloaded.SettlementValue.Should().Be(originalSettlement);
    }

    [Fact]
    public async Task SettledEvent_RawDbContextEventTitleBypass_ThrowsAndNoDbChange()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        var originalTitle = evt.Title;
        evt.Title = "Tampered Title";

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();

        db.ChangeTracker.Clear();
        var reloaded = await db.Events.AsNoTracking().FirstAsync(e => e.Id == eventId);
        reloaded.Title.Should().Be(originalTitle);
    }

    [Fact]
    public async Task ReconciledEvent_RawDbContextArtistDeleteBypass_Throws()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, artist) = await SeedSettledEventWithArtistAsync(client, venueId, token);
        await SetEventStatusDirectAsync(token, eventId, EventStatus.Reconciled);

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.EventArtists.FirstAsync(a => a.Id == artist.Id);
        db.EventArtists.Remove(stored);

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();
    }

    [Fact]
    public async Task PreShowEvent_RawDbContextLineItemUpdate_Succeeds()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        var lineItemId = await SeedLineItemDirectAsync(token, evt.EventId, settlementValue: 100m);

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.SettlementValue = 250m;

        var act = () => db.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SettledEvent_QboActualsRecompute_Succeeds()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        await SeedSyncLedgerEntryDirectAsync(
            token, eventId, "txn-actuals", "acct-1", 300m, lineItem.Id);

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var syncService = scope.ServiceProvider.GetRequiredService<QboSyncService>();
        await syncService.RecomputeActualsForEventAsync(eventId, CancellationToken.None);

        var act = () => db.SaveChangesAsync();
        await act.Should().NotThrowAsync();

        var reloaded = await db.FinancialLineItems.AsNoTracking()
            .FirstAsync(li => li.Id == lineItem.Id);
        reloaded.QboActualValue.Should().Be(300m);
        reloaded.SettlementValue.Should().Be(lineItem.SettlementValue);
    }

    [Fact]
    public async Task SettledEvent_SettlementReversalApi_Succeeds()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);
        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reverse-settlement",
            new ReverseSettlementRequest("Persistence guard reversal test"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SettlementResultDto>();
        result!.Status.Should().Be("PRE_SHOW");
    }

    [Fact]
    public async Task SettledEvent_ReconcileApi_Succeeds()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{eventId}/reconcile", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<EventResponse>();
        result!.Status.Should().Be("RECONCILED");
    }

    [Fact]
    public async Task PreShowEvent_FinalizeSettlement_Succeeds()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SettledEvent_QboSyncWithLedgerInsert_Succeeds()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        await SeedQboCredentialDirectAsync(token, venueId);
        await SeedQboMappingDirectAsync(token, venueId, "acct-ledger", lineItem.Id);

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = "txn-ledger-insert",
            QboAccountId = "acct-ledger",
            Amount = 150m,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            MappedLineItemId = lineItem.Id,
            SyncBatchId = Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.Original
        });

        var lineItemEntity = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItem.Id);
        lineItemEntity.QboActualValue = 150m;
        lineItemEntity.UpdatedAt = DateTimeOffset.UtcNow;

        var act = () => db.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SettledEvent_BypassRejection_LogsPersistenceOperationLabel()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItem.Id);
        stored.SettlementValue += 100m;

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();

        var entry = GetFrozenAuditLogs().Should().ContainSingle().Subject;
        GetStateValue(entry, "Operation").Should().Be(FrozenEventMutationOperation.PersistenceUpdateLineItem);
        GetStateValue(entry, "EventId").Should().Be(eventId);
        GetStateValue(entry, "VenueId").Should().Be(venueId);
        GetStateValue(entry, "UserId").Should().Be(userId);
        GetStateValue(entry, "EventStatus").Should().Be("SETTLED");
    }

    [Fact]
    public async Task SettledEvent_BypassRejection_LogExcludesFinancialFieldValues()
    {
        const decimal distinctiveAmount = 424242.42m;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (_, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItem.Id);
        stored.SettlementValue = distinctiveAmount;

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();

        var combined = string.Join(' ', GetFrozenAuditLogs().Select(e => e.Message));
        combined.Should().NotContain(distinctiveAmount.ToString());
    }

    [Fact]
    public async Task SettledEvent_QboActualsSave_NoRejectionAuditLog()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        await SeedSyncLedgerEntryDirectAsync(
            token, eventId, "txn-no-audit", "acct-1", 175m, lineItem.Id);
        LogCollector!.Clear();

        using var scope = CreateTenantScope(token);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var syncService = scope.ServiceProvider.GetRequiredService<QboSyncService>();
        await syncService.RecomputeActualsForEventAsync(eventId, CancellationToken.None);
        await db.SaveChangesAsync();

        GetFrozenAuditLogs().Should().BeEmpty();
    }

    private IServiceScope CreateTenantScope(string token)
    {
        var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        return scope;
    }

    private async Task<(Guid EventId, LineItemDto LineItem, Guid UserId)> SeedSettledEventWithLineItemAsync(
        HttpClient client,
        Guid venueId,
        string token)
    {
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 0m, null));
        createResponse.EnsureSuccessStatusCode();
        var lineItem = (await createResponse.Content.ReadFromJsonAsync<LineItemDto>())!;

        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 100m, null, false, lineItem.RowVersion));
        updateResponse.EnsureSuccessStatusCode();
        lineItem = (await updateResponse.Content.ReadFromJsonAsync<LineItemDto>())!;

        await SetEventStatusDirectAsync(token, evt.EventId, EventStatus.Settled);

        return (evt.EventId, lineItem, userId);
    }

    private async Task<(Guid EventId, EventArtistDto Artist)> SeedSettledEventWithArtistAsync(
        HttpClient client,
        Guid venueId,
        string token)
    {
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 0m, null));
        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);

        var createArtistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 0m, 0m));
        createArtistResponse.EnsureSuccessStatusCode();
        var artist = (await createArtistResponse.Content.ReadFromJsonAsync<EventArtistDto>())!;

        await SetEventStatusDirectAsync(token, evt.EventId, EventStatus.Settled);

        return (evt.EventId, artist);
    }

    private IEnumerable<TestLogCollector.LogEntry> GetFrozenAuditLogs() =>
        LogCollector!.Entries.Where(e =>
            e.Level == LogLevel.Warning &&
            e.Message.Contains("Rejected frozen event mutation", StringComparison.Ordinal));

    private static object? GetStateValue(TestLogCollector.LogEntry entry, string key) =>
        entry.State.FirstOrDefault(kvp => kvp.Key == key).Value;
}
