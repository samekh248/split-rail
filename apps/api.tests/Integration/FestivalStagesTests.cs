using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class FestivalStagesTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateStage_AddsNamedStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var stage = await response.Content.ReadFromJsonAsync<StageZoneResponse>();
        stage!.Name.Should().Be("Rodeo Arena");
        stage.SortOrder.Should().Be(1, "the auto-created Main Stage occupies slot 0");
    }

    [Fact]
    public async Task CreateStage_RejectsDuplicateNameWithinFestival()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));

        var duplicate = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("rodeo arena"));

        duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await duplicate.Content.ReadAsStringAsync()).Should().Contain("already exists");
    }

    [Fact]
    public async Task CreateStage_AllowsSameNameInDifferentFestivals()
    {
        // Stages are per-event records, so names only need to be unique within one festival.
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var first = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "First Fest", "2026-08-14", "2026-08-15");
        var second = await FestivalStructureTests.CreateFestivalAsync(
            client, venueId, "Second Fest", "2026-09-14", "2026-09-15");

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{first.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{second.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task ListStages_ReturnsStagesInSortOrder()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Second Stage"));
        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Third Stage"));

        var response = await client.GetAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages");

        var stages = await response.Content.ReadFromJsonAsync<List<StageZoneResponse>>();
        stages!.Select(s => s.Name).Should().ContainInOrder("Main Stage", "Second Stage", "Third Stage");
    }

    [Fact]
    public async Task UpdateStage_RenamesStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var stageId = festival.Stages[0].Id;

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages/{stageId}",
            new UpdateStageZoneRequest("Renamed Stage"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var stage = await response.Content.ReadFromJsonAsync<StageZoneResponse>();
        stage!.Name.Should().Be("Renamed Stage");
    }

    [Fact]
    public async Task DeleteStage_BlockedWhenItIsTheLastStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages/{festival.Stages[0].Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("at least one stage");
    }

    [Fact]
    public async Task DeleteStage_BlockedWhenStageStillHasBlocks()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var created = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));
        var rodeo = await created.Content.ReadFromJsonAsync<StageZoneResponse>();

        using (var scope = Factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            var (userId, orgId) = ParseTokenClaims(token);
            tenantContext.SetContext(userId, orgId);
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.ProgrammingBlocks.Add(new ProgrammingBlock
            {
                Id = Guid.NewGuid(),
                EventId = festival.EventId,
                StageZoneId = rodeo!.Id,
                DayDate = new DateOnly(2026, 8, 14),
                StartTime = new TimeOnly(14, 0),
                EndTime = new TimeOnly(16, 0),
                Title = "Bull Riding",
                Category = BlockCategory.Exhibition
            });
            await db.SaveChangesAsync();
        }

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages/{rodeo!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("programming block");
    }

    [Fact]
    public async Task DeleteStage_SucceedsForAnEmptyNonFinalStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var created = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages",
            new CreateStageZoneRequest("Temporary Stage"));
        var stage = await created.Content.ReadFromJsonAsync<StageZoneResponse>();

        var response = await client.DeleteAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/stages/{stage!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task StageEndpoints_RejectCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();
        var basePath = $"/api/venues/{ownerVenueId}/festivals/{festival.EventId}";

        (await otherClient.GetAsync($"{basePath}/stages"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.PostAsJsonAsync($"{basePath}/stages", new CreateStageZoneRequest("Sneaky")))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.DeleteAsync($"{basePath}/stages/{festival.Stages[0].Id}"))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task FestivalEndpoints_RejectCrossOrganizationMutation()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        var update = await otherClient.PutAsJsonAsync(
            $"/api/venues/{ownerVenueId}/festivals/{festival.EventId}",
            new UpdateFestivalRequest("Hijacked", "2026-08-14", "2026-08-15"));

        update.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var revert = await otherClient.PostAsync(
            $"/api/venues/{ownerVenueId}/festivals/{festival.EventId}/revert-to-standard", null);

        revert.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
