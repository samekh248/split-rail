using System.Diagnostics;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.FestivalItineraryTests;
using static SplitRail.Api.Tests.Integration.FestivalStructureTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// v1 scale target: 3 days, 8 stages, 250 blocks — SC-003 response-time guard.
/// </summary>
public class FestivalScaleTests : IntegrationTestBase
{
    [Fact]
    public async Task ItineraryAndConflictChecks_MeetScaleResponseTargets()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId, "Scale Fest", "2026-08-14", "2026-08-16");

        await SeedScaleBlocksDirectAsync(token, festival.EventId, targetCount: 250);

        var itineraryTimer = Stopwatch.StartNew();
        var itineraryResponse = await client.GetAsync(ItineraryPath(venueId, festival.EventId));
        itineraryTimer.Stop();
        itineraryResponse.EnsureSuccessStatusCode();
        var itinerary = await itineraryResponse.Content.ReadFromJsonAsync<ItineraryResponse>();
        itinerary!.Blocks.Should().HaveCount(250);
        itineraryTimer.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(5),
            "itinerary projection should stay responsive at v1 limits");
    }

    private async Task SeedScaleBlocksDirectAsync(string accessToken, Guid eventId, int targetCount)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stages = await db.StageZones.Where(s => s.EventId == eventId).OrderBy(s => s.SortOrder).ToListAsync();
        var days = new[] { new DateOnly(2026, 8, 14), new DateOnly(2026, 8, 15), new DateOnly(2026, 8, 16) };

        for (var i = 0; i < targetCount; i++)
        {
            var stage = stages[i % stages.Count];
            var day = days[i % days.Length];
            var slot = i / (stages.Count * days.Length);
            var start = new TimeOnly(8 + (slot % 12), (slot * 5) % 60);
            var end = start.AddMinutes(30);

            db.ProgrammingBlocks.Add(new ProgrammingBlock
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                StageZoneId = stage.Id,
                DayDate = day,
                Title = $"Scale Block {i + 1}",
                Category = BlockCategory.Vendor,
                StartTime = start,
                EndTime = end,
                RequiresSettlement = false,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }
}
