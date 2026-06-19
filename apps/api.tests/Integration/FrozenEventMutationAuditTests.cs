using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class FrozenEventMutationAuditTests : IntegrationTestBase
{
    protected override bool EnableLogCapture => true;

    [Fact]
    public async Task SettledEvent_LineItemUpdate_Returns400_AndLogsAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, lineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateLineItem, "SETTLED");
    }

    [Fact]
    public async Task ReconciledEvent_LineItemUpdate_Returns400_AndLogsAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);

        var reconcileResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{eventId}/reconcile", null);
        reconcileResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 250m, null, false, lineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateLineItem, "RECONCILED");
    }

    [Fact]
    public async Task PreShowEvent_LineItemCreate_Succeeds_NoFrozenAuditLog()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        LogCollector!.Clear();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "New Row", 1, false, 100m, 0m, null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        GetFrozenAuditLogs().Should().BeEmpty();
    }

    [Fact]
    public async Task SettledEvent_MutationWithLargePayload_NoSensitiveDataInLog()
    {
        if (!IsQuestPdfSupported()) return;

        const string distinctiveNotes = "DISTINCTIVE_NOTES_SHOULD_NOT_LOG";
        const decimal distinctiveAmount = 424242.42m;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, distinctiveAmount, distinctiveNotes, false, lineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var combined = string.Join(' ', GetFrozenAuditLogs().Select(e => e.Message));
        combined.Should().NotContain(distinctiveNotes);
        combined.Should().NotContain(distinctiveAmount.ToString());
        combined.Should().NotContain(ValidSignatureBase64());
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateLineItem, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_AuditLog_UserIdOnlyNotEmail()
    {
        if (!IsQuestPdfSupported()) return;

        const string email = "audit-user@example.com";
        var (client, venueId, token) = await SetupFinancialAdminAsync(email);
        var (userId, _) = ParseTokenClaims(token);
        var (eventId, lineItem, _) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, lineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var entry = GetFrozenAuditLogs().Single();
        GetStateValue(entry, "UserId").Should().Be(userId);
        entry.Message.Should().NotContain(email);
    }

    [Fact]
    public async Task SettledEvent_UpdateMetadata_Returns400_AndLogsUpdateEventMetadata()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PatchAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}",
            new UpdateEventRequest("Renamed Show", "2026-08-01", "TAG-NEW"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateEventMetadata, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_UpdateArtist_Returns400_AndLogsUpdateArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 100m, null));

        var createArtistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 0m, 0m));
        createArtistResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var artist = await createArtistResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("PRE_SHOW");

        AssertFrozenAuditLog(evt.EventId, venueId, userId, FrozenEventMutationOperation.UpdateArtist, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_LockBudget_Returns400_AndLogsLockBudget()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/events/{eventId}/lock-budget", null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.LockBudget, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_AuditEmittedBeforeMiddlewareGenericLog()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 200m, null, false, lineItem.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        GetFrozenAuditLogs().Should().NotBeEmpty();
        LogCollector!.Entries.Any(e => e.Message.Contains("LedgerStateException")).Should().BeTrue();
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateLineItem, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_CreateLineItem_Returns400_AndLogsCreateLineItem()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Blocked Row", 2, false, 50m, 50m, null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.CreateLineItem, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_DeleteLineItem_Returns400_AndLogsDeleteLineItem()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{eventId}/line-items/{lineItem.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.DeleteLineItem, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_DeleteEvent_Returns400_AndLogsDeleteEvent()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{eventId}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.DeleteEvent, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_CreateArtist_Returns400_AndLogsCreateArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, _, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/artists",
            new CreateArtistRequest("Late Add", 1, "guarantee", null, 1000m, 0m, 0m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.CreateArtist, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_DeleteArtist_Returns400_AndLogsDeleteArtist()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 100m, null));

        var createArtistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 0m, 0m));
        var artist = await createArtistResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(evt.EventId, venueId, userId, FrozenEventMutationOperation.DeleteArtist, "SETTLED");
    }

    [Fact]
    public async Task ReconciledEvent_UpdateArtist_Returns400_AndLogsAudit()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 100m, null));

        var createArtistResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists",
            new CreateArtistRequest("Headliner", 1, "guarantee", null, 5000m, 0m, 0m));
        var artist = await createArtistResponse.Content.ReadFromJsonAsync<EventArtistDto>();

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));
        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/reconcile", null);

        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/artists/{artist!.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(evt.EventId, venueId, userId, FrozenEventMutationOperation.UpdateArtist, "RECONCILED");
    }

    private async Task<(Guid EventId, LineItemDto LineItem, Guid UserId)> SeedSettledEventWithLineItemAsync(
        HttpClient client,
        Guid venueId,
        string token)
    {
        var (userId, _) = ParseTokenClaims(token);
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 100m, null));
        var lineItem = (await createResponse.Content.ReadFromJsonAsync<LineItemDto>())!;

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        return (evt.EventId, lineItem, userId);
    }

    private IEnumerable<TestLogCollector.LogEntry> GetFrozenAuditLogs() =>
        LogCollector!.Entries.Where(e =>
            e.Level == LogLevel.Warning &&
            e.Message.Contains("Rejected frozen event mutation", StringComparison.Ordinal));

    private void AssertFrozenAuditLog(
        Guid eventId,
        Guid venueId,
        Guid userId,
        string operation,
        string eventStatus)
    {
        var entry = GetFrozenAuditLogs().Should().ContainSingle().Subject;
        GetStateValue(entry, "Operation").Should().Be(operation);
        GetStateValue(entry, "EventId").Should().Be(eventId);
        GetStateValue(entry, "VenueId").Should().Be(venueId);
        GetStateValue(entry, "UserId").Should().Be(userId);
        GetStateValue(entry, "EventStatus").Should().Be(eventStatus);
    }

    private static object? GetStateValue(TestLogCollector.LogEntry entry, string key) =>
        entry.State.FirstOrDefault(kvp => kvp.Key == key).Value;
}
