using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class FestivalPermissionGrantTests : IntegrationTestBase
{
    [Fact]
    public async Task AdminRole_CarriesFestivalAuthority()
    {
        var (client, _, _) = await SetupFinancialAdminAsync();

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");

        var admin = roles!.Single(r => r.RoleName == RoleNames.Admin);
        admin.CanManageFestivalSchedule.Should().BeTrue();
        admin.CanManageAllocations.Should().BeTrue();
        admin.CanAdjustSettlements.Should().BeTrue();
        admin.CanFinalizeSettlements.Should().BeTrue();
        admin.CanOverrideSettlements.Should().BeTrue();
        admin.CanPublishPublicItinerary.Should().BeTrue();

        var venueManager = roles.Single(r => r.RoleName == RoleNames.VenueManager);
        venueManager.CanManageFestivalSchedule.Should().BeTrue();

        var promoter = roles.Single(r => r.RoleName == RoleNames.Promoter);
        promoter.CanManageFestivalSchedule.Should().BeFalse();
    }

    [Fact]
    public async Task Profile_ExposesFestivalPermissionsSoTheClientCanGateItineraryTools()
    {
        var (client, _, _) = await SetupFinancialAdminAsync();

        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/users/me");

        var permissions = profile!.Role!.Permissions;
        permissions.CanManageFestivalSchedule.Should().BeTrue();
        permissions.CanPublishPublicItinerary.Should().BeTrue();
    }

    [Fact]
    public async Task Admin_ManagesFestivalItinerary()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var stageId = festival.Stages.Single().Id;

        var createBlock = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/blocks",
            new CreateProgrammingBlockRequest(
                "Headliner",
                "2026-08-14",
                stageId,
                "20:00",
                "21:00",
                "MUSIC",
                RequiresSettlement: true));

        createBlock.StatusCode.Should().Be(HttpStatusCode.Created);

        var itinerary = await client.GetAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/itinerary");

        itinerary.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RoleWithoutScheduleAuthority_IsRejected_ThenAllowedOnceAdminGrantsIt()
    {
        var adminEmail = $"fest-admin-{Guid.NewGuid():N}@example.com";
        var (adminToken, _, _) = await RegisterAndLoginAsync(adminEmail);
        adminToken = await CreateOrgAndGetTokenAsync(adminToken, adminEmail, "SecurePass1");
        using var adminClient = CreateAuthenticatedClient(adminToken);

        var venueResponse = await adminClient.PostAsJsonAsync("/api/venues",
            new CreateVenueRequest("Festival Permission Venue"));
        venueResponse.EnsureSuccessStatusCode();
        var venueId = (await venueResponse.Content.ReadFromJsonAsync<VenueResponse>())!.Id;

        var festival = await FestivalStructureTests.CreateFestivalAsync(adminClient, venueId);
        var stageId = festival.Stages.Single().Id;

        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var promoterEmail = $"fest-promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(
            adminToken, promoterEmail, promoterRoleId, [venueId]);
        var accept = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        accept.EnsureSuccessStatusCode();
        var promoterAuth = await accept.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        using var promoterClient = CreateAuthenticatedClient(promoterAuth!.AccessToken);

        var request = new CreateProgrammingBlockRequest(
            "Support",
            "2026-08-14",
            stageId,
            "20:00",
            "21:00",
            "MUSIC",
            RequiresSettlement: false);

        var rejected = await promoterClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/blocks", request);
        rejected.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var grant = await adminClient.PatchAsJsonAsync($"/api/roles/{promoterRoleId}",
            new UpdateRoleRequest(
                null, null, null, null, null, null, null, null,
                CanManageFestivalSchedule: true));
        grant.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await grant.Content.ReadFromJsonAsync<RoleResponse>();
        updated!.CanManageFestivalSchedule.Should().BeTrue();

        var allowed = await promoterClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/blocks", request);
        allowed.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
