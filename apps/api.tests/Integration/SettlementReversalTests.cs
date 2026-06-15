using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementReversalTests : IntegrationTestBase
{
    [Fact]
    public async Task Reverse_WithoutPermission_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);
        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, null, CanReverseSettlement: false, null, null, null));

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reverse-settlement",
            new ReverseSettlementRequest("Correction needed"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Reverse_ByAdmin_WritesAuditRowAndPreservesOriginalPdf()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);
        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var storedPath = ArchiveStore.StoredObjectPaths.Single();
        var originalBytes = ArchiveStore.GetStoredPdf(storedPath)!;

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reverse-settlement",
            new ReverseSettlementRequest("Ticket count corrected"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SettlementResultDto>();
        result!.Status.Should().Be("PRE_SHOW");

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var stored = await db.Events.FirstAsync(e => e.Id == evt.EventId);
        stored.Status.Should().Be(EventStatus.PreShow);
        stored.IsBudgetLocked.Should().BeTrue();
        stored.SettlementPdfUrl.Should().BeNull();

        var reversal = await db.SettlementReversals.FirstAsync(r => r.EventId == evt.EventId);
        reversal.PreviousPdfUrl.Should().NotBeNullOrWhiteSpace();
        reversal.Reason.Should().Be("Ticket count corrected");

        ArchiveStore.GetStoredPdf(storedPath).Should().Equal(originalBytes);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));
        ArchiveStore.StoredObjectCount.Should().Be(2);
    }
}
