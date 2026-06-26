using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboTrackingMappingResolverTests
{
    [Fact]
    public async Task ResolveTrackingNameForEventAsync_EventTierWinsOverVenueAndRegion()
    {
        var (service, db, orgId, venueId, eventId, regionId) = await CreateServiceWithHierarchyAsync();

        db.QboTrackingMappings.AddRange(
            new QboTrackingMapping
            {
                OrganizationId = orgId,
                VenueId = venueId,
                QboTrackingType = "Tag",
                QboTrackingId = "r1",
                QboTrackingName = "REGION-TAG",
                TargetTier = "Region",
                TargetEntityId = regionId,
                CreatedAt = DateTimeOffset.UtcNow,
            },
            new QboTrackingMapping
            {
                OrganizationId = orgId,
                VenueId = venueId,
                QboTrackingType = "Tag",
                QboTrackingId = "v1",
                QboTrackingName = "VENUE-TAG",
                TargetTier = "Venue",
                TargetEntityId = venueId,
                CreatedAt = DateTimeOffset.UtcNow,
            },
            new QboTrackingMapping
            {
                OrganizationId = orgId,
                VenueId = venueId,
                QboTrackingType = "Tag",
                QboTrackingId = "e1",
                QboTrackingName = "EVENT-TAG",
                TargetTier = "Event",
                TargetEntityId = eventId,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        await db.SaveChangesAsync();

        var resolved = await service.ResolveTrackingNameForEventAsync(eventId);
        resolved.Should().Be("EVENT-TAG");
    }

    [Fact]
    public async Task ResolveTrackingNameForEventAsync_FallsBackToLegacyQboTagName()
    {
        var (service, db, orgId, venueId, eventId, _) = await CreateServiceWithHierarchyAsync();
        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.QboTagName = "LEGACY-TAG";
        await db.SaveChangesAsync();

        var resolved = await service.ResolveTrackingNameForEventAsync(eventId);
        resolved.Should().Be("LEGACY-TAG");
    }

    private static async Task<(
        QboTrackingMappingService Service,
        ApplicationDbContext Db,
        Guid OrgId,
        Guid VenueId,
        Guid EventId,
        Guid RegionId)> CreateServiceWithHierarchyAsync()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var db = new ApplicationDbContext(options, tenantContext);

        var orgId = Guid.NewGuid();
        var regionId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Regions.Add(new Region { Id = regionId, OrganizationId = orgId, Name = "West" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue", RegionId = regionId });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            Status = SplitRail.Api.Models.Enums.EventStatus.PreShow,
            QboTagName = "",
        });
        await db.SaveChangesAsync();

        var venueService = new VenueService(db, tenantContext, NullLogger<VenueService>.Instance);
        var service = new QboTrackingMappingService(db, venueService, tenantContext);
        return (service, db, orgId, venueId, eventId, regionId);
    }
}
