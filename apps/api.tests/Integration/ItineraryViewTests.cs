using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.FestivalItineraryTests;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Internal vs. public itinerary views — server-filtered payloads (research.md D13).
/// </summary>
public class ItineraryViewTests : IntegrationTestBase
{
    [Fact]
    public async Task PublicViewQuery_ReturnsOnlyPublicBlocksWithReducedFieldSet()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Public Headliner", "2026-08-14", festival.Stages[0].Id,
                "20:00", "22:00", "MUSIC", false, IsPubliclyVisible: true,
                Description: "INTERNAL: green room is through the loading dock"));
        await CreateBlockAsync(client, venueId, festival, "Internal Only", "10:00", "11:00");

        var response = await client.GetAsync(
            $"{ItineraryPath(venueId, festival.EventId)}?view=public");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var raw = await response.Content.ReadAsStringAsync();

        raw.Should().Contain("Public Headliner");
        raw.Should().NotContain("Internal Only");
        raw.Should().NotContain("green room");
        raw.Should().NotContain("description");
        raw.Should().NotContain("settlementStatus");
        raw.Should().NotContain("requiresSettlement");

        var publicView = await response.Content.ReadFromJsonAsync<PublicItineraryResponse>();
        publicView!.Blocks.Should().ContainSingle();
        publicView.Blocks[0].Title.Should().Be("Public Headliner");
        publicView.Blocks[0].StageName.Should().Be("Main Stage");
    }

    [Fact]
    public async Task PublishVisibility_RequiresPublishPermission_AndWritesAuditEntry()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);
        var block = await CreateBlockAsync(adminClient, venueId, festival, "To Publish", "20:00", "21:00");

        var scheduleClient = await CreateScheduleOnlyClientAsync(adminToken, venueId);
        (await scheduleClient.PostAsJsonAsync(
            $"{ItineraryPath(venueId, festival.EventId)}/publish-visibility",
            new SetPublishVisibilityRequest([block.Id], true)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var publish = await adminClient.PostAsJsonAsync(
            $"{ItineraryPath(venueId, festival.EventId)}/publish-visibility",
            new SetPublishVisibilityRequest([block.Id], true));
        publish.EnsureSuccessStatusCode();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(adminToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var audit = await db.FestivalAuditEntries
            .AsNoTracking()
            .Where(e => e.EventId == festival.EventId
                        && e.Action == FestivalAuditActions.PublishChange
                        && e.EntityId == block.Id)
            .SingleAsync();

        audit.EntityType.Should().Be(FestivalAuditEntityTypes.PublicItinerary);
        audit.PriorValueJson.Should().Contain("false");
        audit.NewValueJson.Should().Contain("true");

        var publicView = await adminClient.GetAsync(
            $"{ItineraryPath(venueId, festival.EventId)}?view=public");
        (await publicView.Content.ReadAsStringAsync()).Should().Contain("To Publish");
    }

    private async Task<HttpClient> CreateScheduleOnlyClientAsync(string adminToken, Guid venueId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (adminUserId, orgId) = ParseTokenClaims(adminToken);
        tenantContext.SetContext(adminUserId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var role = new OrganizationRole
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId ?? throw new InvalidOperationException(),
            RoleName = $"Schedule-{Guid.NewGuid():N}",
            CanManageFestivalSchedule = true,
            CanViewFinancials = true
        };
        db.OrganizationRoles.Add(role);
        await db.SaveChangesAsync();

        var email = $"schedule-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        return CreateAuthenticatedClient(auth!.AccessToken);
    }
}
