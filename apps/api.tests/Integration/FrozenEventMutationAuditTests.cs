using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models.Enums;
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
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (eventId, lineItem, userId) = await SeedSettledEventWithLineItemAsync(client, venueId, token);
        await SetEventStatusDirectAsync(token, eventId, EventStatus.Reconciled);
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
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var (eventId, artist) = await SeedSettledEventWithArtistAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/artists/{artist.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("PRE_SHOW");

        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateArtist, "SETTLED");
    }

    [Fact]
    public async Task SettledEvent_LockBudget_Returns400_AndLogsLockBudget()
    {
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
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var (eventId, artist) = await SeedSettledEventWithArtistAsync(client, venueId, token);
        LogCollector!.Clear();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/events/{eventId}/artists/{artist.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.DeleteArtist, "SETTLED");
    }

    [Fact]
    public async Task ReconciledEvent_UpdateArtist_Returns400_AndLogsAudit()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var (eventId, artist) = await SeedSettledEventWithArtistAsync(client, venueId, token);
        await SetEventStatusDirectAsync(token, eventId, EventStatus.Reconciled);
        LogCollector!.Clear();

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/artists/{artist.Id}",
            new UpdateArtistRequest("Renamed", 1, "guarantee", null, 5000m, 0m, 0m, artist.RowVersion));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        AssertFrozenAuditLog(eventId, venueId, userId, FrozenEventMutationOperation.UpdateArtist, "RECONCILED");
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

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        lockResponse.EnsureSuccessStatusCode();

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

        var createLineItemResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 0m, null));
        createLineItemResponse.EnsureSuccessStatusCode();

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        lockResponse.EnsureSuccessStatusCode();

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
