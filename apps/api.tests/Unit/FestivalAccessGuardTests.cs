using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FestivalAccessGuardTests
{
    [Fact]
    public async Task RequireFestivalAsync_ReturnsFestivalWithinCallersOrganization()
    {
        var ctx = await TestContext.CreateAsync();

        var festival = await ctx.Guard.RequireFestivalAsync(ctx.VenueId, ctx.FestivalId);

        festival.Id.Should().Be(ctx.FestivalId);
        festival.EventType.Should().Be(EventType.Festival);
    }

    [Fact]
    public async Task RequireFestivalAsync_ThrowsNotFoundForAnotherOrganizationsFestival()
    {
        var ctx = await TestContext.CreateAsync();

        // Caller is scoped to their own org; the foreign festival must not be reachable —
        // and must surface as NotFound rather than Forbidden so existence stays hidden.
        var act = () => ctx.Guard.RequireFestivalAsync(ctx.ForeignVenueId, ctx.ForeignFestivalId);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task RequireFestivalAsync_RejectsStandardEvent()
    {
        var ctx = await TestContext.CreateAsync();

        var act = () => ctx.Guard.RequireFestivalAsync(ctx.VenueId, ctx.StandardEventId);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*not a festival*");
    }

    [Fact]
    public async Task RequireFestivalAsync_ThrowsNotFoundForUnknownEvent()
    {
        var ctx = await TestContext.CreateAsync();

        var act = () => ctx.Guard.RequireFestivalAsync(ctx.VenueId, Guid.NewGuid());

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task RequireEventAsync_AllowsStandardEventForConversionPath()
    {
        var ctx = await TestContext.CreateAsync();

        var standard = await ctx.Guard.RequireEventAsync(ctx.VenueId, ctx.StandardEventId);

        standard.EventType.Should().Be(EventType.Standard);
    }

    [Fact]
    public async Task RequireScheduleAuthorityAsync_ThrowsWhenRoleLacksFlag()
    {
        var ctx = await TestContext.CreateAsync();

        var act = () => ctx.Guard.RequireScheduleAuthorityAsync();

        await act.Should().ThrowAsync<AuthorizationException>();
    }

    [Fact]
    public async Task RequireScheduleAuthorityAsync_PassesWhenRoleGrantsFlag()
    {
        var ctx = await TestContext.CreateAsync(role => role.CanManageFestivalSchedule = true);

        var act = () => ctx.Guard.RequireScheduleAuthorityAsync();

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task FinalizeAuthority_DoesNotGrantMasterLedgerVisibility()
    {
        // Spec FR-035: finalize authority must never imply Master Festival Ledger access.
        var ctx = await TestContext.CreateAsync(role => role.CanFinalizeSettlements = true);

        (await ctx.Guard.HasPermissionAsync(r => r.CanFinalizeSettlements)).Should().BeTrue();

        var act = () => ctx.Guard.RequireFullFinancialVisibilityAsync();
        await act.Should().ThrowAsync<AuthorizationException>();
    }

    [Fact]
    public async Task PermissionLayers_DoNotImplyOneAnother()
    {
        // Spec FR-036: access to one layer never grants another.
        var ctx = await TestContext.CreateAsync(role => role.CanManageFestivalSchedule = true);

        await ctx.Guard.Invoking(g => g.RequireScheduleAuthorityAsync())
            .Should().NotThrowAsync();

        await ctx.Guard.Invoking(g => g.RequireAllocationAuthorityAsync())
            .Should().ThrowAsync<AuthorizationException>();
        await ctx.Guard.Invoking(g => g.RequireFinalizeAuthorityAsync())
            .Should().ThrowAsync<AuthorizationException>();
        await ctx.Guard.Invoking(g => g.RequireOverrideAuthorityAsync())
            .Should().ThrowAsync<AuthorizationException>();
        await ctx.Guard.Invoking(g => g.RequirePublishAuthorityAsync())
            .Should().ThrowAsync<AuthorizationException>();
        await ctx.Guard.Invoking(g => g.RequireAdjustAuthorityAsync())
            .Should().ThrowAsync<AuthorizationException>();
    }

    [Fact]
    public async Task CanAccessStageAsync_UnrestrictedWhenUserHasNoAssignments()
    {
        var ctx = await TestContext.CreateAsync();

        (await ctx.Guard.CanAccessStageAsync(ctx.FestivalId, ctx.MainStageId)).Should().BeTrue();
        (await ctx.Guard.CanAccessStageAsync(ctx.FestivalId, ctx.SecondStageId)).Should().BeTrue();
    }

    [Fact]
    public async Task CanAccessStageAsync_RestrictsToAssignedStagesOnceAssigned()
    {
        var ctx = await TestContext.CreateAsync();
        ctx.Db.StageZoneAssignments.Add(new StageZoneAssignment
        {
            Id = Guid.NewGuid(),
            StageZoneId = ctx.MainStageId,
            UserId = ctx.UserId
        });
        await ctx.Db.SaveChangesAsync();

        (await ctx.Guard.CanAccessStageAsync(ctx.FestivalId, ctx.MainStageId)).Should().BeTrue();
        (await ctx.Guard.CanAccessStageAsync(ctx.FestivalId, ctx.SecondStageId)).Should().BeFalse();

        await ctx.Guard.Invoking(g => g.RequireStageAccessAsync(ctx.FestivalId, ctx.SecondStageId))
            .Should().ThrowAsync<AuthorizationException>();
    }

    [Fact]
    public async Task GetAssignedStageIdsAsync_IgnoresAssignmentsFromOtherFestivals()
    {
        var ctx = await TestContext.CreateAsync();
        var otherFestivalStageId = Guid.NewGuid();
        ctx.Db.StageZones.Add(new StageZone
        {
            Id = otherFestivalStageId,
            EventId = ctx.StandardEventId,
            Name = "Unrelated Stage"
        });
        ctx.Db.StageZoneAssignments.Add(new StageZoneAssignment
        {
            Id = Guid.NewGuid(),
            StageZoneId = otherFestivalStageId,
            UserId = ctx.UserId
        });
        await ctx.Db.SaveChangesAsync();

        var assigned = await ctx.Guard.GetAssignedStageIdsAsync(ctx.FestivalId);

        assigned.Should().BeEmpty();
    }

    private sealed class TestContext
    {
        public required ApplicationDbContext Db { get; init; }
        public required FestivalAccessGuard Guard { get; init; }
        public required Guid UserId { get; init; }
        public required Guid VenueId { get; init; }
        public required Guid FestivalId { get; init; }
        public required Guid StandardEventId { get; init; }
        public required Guid MainStageId { get; init; }
        public required Guid SecondStageId { get; init; }
        public required Guid ForeignVenueId { get; init; }
        public required Guid ForeignFestivalId { get; init; }

        public static async Task<TestContext> CreateAsync(Action<OrganizationRole>? configureRole = null)
        {
            var tenantContext = new TenantContext();
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var db = new ApplicationDbContext(options, tenantContext);

            var orgId = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var venueId = Guid.NewGuid();
            var festivalId = Guid.NewGuid();
            var standardEventId = Guid.NewGuid();
            var mainStageId = Guid.NewGuid();
            var secondStageId = Guid.NewGuid();
            var roleId = Guid.NewGuid();

            var foreignOrgId = Guid.NewGuid();
            var foreignVenueId = Guid.NewGuid();
            var foreignFestivalId = Guid.NewGuid();

            db.Organizations.AddRange(
                new Organization { Id = orgId, Name = "Test Org" },
                new Organization { Id = foreignOrgId, Name = "Other Org" });

            db.Venues.AddRange(
                new Venue { Id = venueId, OrganizationId = orgId, Name = "Test Venue" },
                new Venue { Id = foreignVenueId, OrganizationId = foreignOrgId, Name = "Foreign Venue" });

            var role = new OrganizationRole
            {
                Id = roleId,
                OrganizationId = orgId,
                RoleName = "Tester"
            };
            configureRole?.Invoke(role);
            db.OrganizationRoles.Add(role);

            db.UserOrganizationMappings.Add(new UserOrganizationMapping
            {
                UserId = userId,
                OrganizationId = orgId,
                RoleId = roleId
            });

            db.Events.AddRange(
                new Event
                {
                    Id = festivalId,
                    VenueId = venueId,
                    Title = "Test Festival",
                    EventDate = new DateOnly(2026, 8, 14),
                    EndDate = new DateOnly(2026, 8, 16),
                    EventType = EventType.Festival,
                    QboTagName = "#Fest-2026-TEST"
                },
                new Event
                {
                    Id = standardEventId,
                    VenueId = venueId,
                    Title = "Standard Show",
                    EventDate = new DateOnly(2026, 9, 1),
                    EventType = EventType.Standard,
                    QboTagName = "#Show-2026-TEST"
                },
                new Event
                {
                    Id = foreignFestivalId,
                    VenueId = foreignVenueId,
                    Title = "Foreign Festival",
                    EventDate = new DateOnly(2026, 8, 14),
                    EndDate = new DateOnly(2026, 8, 15),
                    EventType = EventType.Festival,
                    QboTagName = "#Fest-2026-FOREIGN"
                });

            db.StageZones.AddRange(
                new StageZone { Id = mainStageId, EventId = festivalId, Name = "Main Stage", SortOrder = 0 },
                new StageZone { Id = secondStageId, EventId = festivalId, Name = "Second Stage", SortOrder = 1 });

            await db.SaveChangesAsync();

            tenantContext.SetContext(userId, orgId);

            var venueService = new VenueService(db, tenantContext, NullLogger<VenueService>.Instance);
            var guard = new FestivalAccessGuard(db, tenantContext, venueService);

            return new TestContext
            {
                Db = db,
                Guard = guard,
                UserId = userId,
                VenueId = venueId,
                FestivalId = festivalId,
                StandardEventId = standardEventId,
                MainStageId = mainStageId,
                SecondStageId = secondStageId,
                ForeignVenueId = foreignVenueId,
                ForeignFestivalId = foreignFestivalId
            };
        }
    }
}
