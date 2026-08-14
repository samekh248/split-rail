using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementPermissionTests : IntegrationTestBase
{
    [Fact]
    public async Task ScheduleOnlyUser_CannotFinalizeOrViewSettlement()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(adminClient, venueId, festival);

        var scheduleClient = await CreateFestivalRoleClientAsync(
            adminToken, venueId, $"schedule-{Guid.NewGuid():N}@example.com",
            schedule: true, finalize: false, adjust: false);

        (await scheduleClient.GetAsync(SettlementPath(venueId, festival.EventId, block.Id)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);

        (await scheduleClient.PostAsJsonAsync(
            FinalizePath(venueId, festival.EventId, block.Id),
            new FinalizeBlockSettlementRequest(true)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task StageManager_FinalizesOnlyAssignedStageBlocks()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);

        var secondStageResponse = await adminClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Side Stage", 1));
        var secondStage = await secondStageResponse.Content.ReadFromJsonAsync<StageZoneResponse>();

        var bucket = await CreateBucketAsync(adminClient, venueId, festival, "Wristbands", 100_000m);
        var mainBlock = await CreateBlockAsync(
            adminClient, venueId, festival, "Main Act", "20:00", "21:00",
            requiresSettlement: true, stageZoneId: festival.Stages[0].Id);
        var sideBlock = await CreateBlockAsync(
            adminClient, venueId, festival, "Side Act", "20:00", "21:00",
            requiresSettlement: true, stageZoneId: secondStage!.Id);

        await AllocateAsync(adminClient, venueId, festival, bucket.Id, mainBlock.Id, 5m);
        await AllocateAsync(adminClient, venueId, festival, bucket.Id, sideBlock.Id, 5m);
        await PutDealTermsAsync(adminClient, venueId, festival.EventId, mainBlock.Id);
        await PutDealTermsAsync(adminClient, venueId, festival.EventId, sideBlock.Id);

        var managerPair = await CreateFestivalRoleClientWithUserAsync(
            adminToken, venueId, $"stage-mgr-{Guid.NewGuid():N}@example.com",
            schedule: false, finalize: true, adjust: true);
        var managerClient = managerPair.Client;
        var managerUserId = managerPair.UserId;

        await AssignStageAsync(adminToken, managerUserId, festival.Stages[0].Id);

        (await managerClient.GetAsync(SettlementPath(venueId, festival.EventId, mainBlock.Id)))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        (await managerClient.GetAsync(SettlementPath(venueId, festival.EventId, sideBlock.Id)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);

        (await managerClient.GetAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/buckets"))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "stage managers must not reach the master festival ledger");
    }

    [Fact]
    public async Task FinanceAdmin_HasFullSettlementAccess()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        (await client.GetAsync(SettlementPath(venueId, festival.EventId, block.Id)))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        (await client.GetAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/buckets"))
            .StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static Task<HttpResponseMessage> PutDealTermsAsync(
        HttpClient client, Guid venueId, Guid eventId, Guid blockId) =>
        client.PutAsJsonAsync(
            $"{SettlementPath(venueId, eventId, blockId)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 5_000m, 0m, "GROSS"));

    private async Task<HttpClient> CreateFestivalRoleClientAsync(
        string adminToken,
        Guid venueId,
        string email,
        bool schedule,
        bool finalize,
        bool adjust)
    {
        var (client, _) = await CreateFestivalRoleClientWithUserAsync(
            adminToken, venueId, email, schedule, finalize, adjust);
        return client;
    }

    private async Task<(HttpClient Client, Guid UserId)> CreateFestivalRoleClientWithUserAsync(
        string adminToken,
        Guid venueId,
        string email,
        bool schedule,
        bool finalize,
        bool adjust)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (adminUserId, orgId) = ParseTokenClaims(adminToken);
        tenantContext.SetContext(adminUserId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var orgIdValue = orgId ?? throw new InvalidOperationException("Organization id missing.");
        var role = new OrganizationRole
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgIdValue,
            RoleName = $"Festival-{Guid.NewGuid():N}",
            CanManageFestivalSchedule = schedule,
            CanFinalizeSettlements = finalize,
            CanAdjustSettlements = adjust,
            CanViewFinancials = adjust || finalize
        };
        db.OrganizationRoles.Add(role);
        await db.SaveChangesAsync();

        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        var userId = ParseTokenClaims(auth!.AccessToken).UserId;

        return (CreateAuthenticatedClient(auth.AccessToken), userId);
    }

    private async Task AssignStageAsync(string adminToken, Guid userId, Guid stageZoneId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (adminUserId, orgId) = ParseTokenClaims(adminToken);
        tenantContext.SetContext(adminUserId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.StageZoneAssignments.Add(new StageZoneAssignment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StageZoneId = stageZoneId
        });
        await db.SaveChangesAsync();
    }
}
