using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementAtomicityTests : IntegrationTestBase
{
    [Fact]
    public async Task Finalize_WhenRenderFails_LeavesEventUnsettledAndNoStoredPdf()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        ThrowingPdfRenderer.ThrowOnRender = true;

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.BadGateway);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Events.FirstAsync(e => e.Id == evt.EventId);
        stored.Status.Should().Be(EventStatus.PreShow);
        stored.SettlementPdfUrl.Should().BeNull();
        ArchiveStore.StoredObjectCount.Should().Be(0);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }

    [Fact]
    public async Task Finalize_WhenUploadFails_LeavesEventUnsettled()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        ArchiveStore.ThrowOnStage = true;

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.BadGateway);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Events.FirstAsync(e => e.Id == evt.EventId);
        stored.Status.Should().Be(EventStatus.PreShow);
        stored.SettlementPdfUrl.Should().BeNull();
        ArchiveStore.StoredObjectCount.Should().Be(0);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }

    [Fact]
    public async Task Finalize_WhenDbCommitFailsAfterStage_DeletesStagedAndLeavesEventUnsettled()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        SaveChangesFailure.ThrowOnNextSave = true;

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().BeOneOf(HttpStatusCode.InternalServerError, HttpStatusCode.BadGateway);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Events.FirstAsync(e => e.Id == evt.EventId);
        stored.Status.Should().Be(EventStatus.PreShow);
        stored.SettlementPdfUrl.Should().BeNull();
        ArchiveStore.StoredObjectCount.Should().Be(0);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }

    [Fact]
    public async Task Finalize_OnAlreadySettledEvent_RejectsWithoutNewPdf()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);
        var request = new FinalizeSettlementRequest(ValidSignatureBase64(), true);
        var url = $"/api/venues/{venueId}/events/{evt.EventId}/settle";

        var first = await client.PostAsJsonAsync(url, request);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var objectCountAfterFirst = ArchiveStore.StoredObjectCount;

        var second = await client.PostAsJsonAsync(url, request);
        second.StatusCode.Should().BeOneOf(HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
        ArchiveStore.StoredObjectCount.Should().Be(objectCountAfterFirst);
        ArchiveStore.StagedObjectCount.Should().Be(0);
    }
}
