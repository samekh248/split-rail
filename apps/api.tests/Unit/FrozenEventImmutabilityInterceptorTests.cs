using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.Data.Interceptors;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FrozenEventImmutabilityInterceptorTests
{
    [Fact]
    public async Task ModifiedLineItem_SettlementValueChange_OnFrozenEvent_Throws()
    {
        var (db, _, _) = CreateContext();
        var (eventId, lineItemId) = await SeedSettledEventWithLineItemAsync(db);

        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.SettlementValue = 999m;

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();
    }

    [Fact]
    public async Task ModifiedEvent_TitleChange_WhenOriginalStatusSettled_Throws()
    {
        var (db, _, _) = CreateContext();
        var eventId = await SeedSettledEventAsync(db);

        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Title = "Tampered Title";

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();
    }

    [Fact]
    public async Task DeletedEventArtist_OnFrozenParentEvent_Throws()
    {
        var (db, _, _) = CreateContext();
        var (eventId, artistId) = await SeedSettledEventWithArtistAsync(db);

        var artist = await db.EventArtists.FirstAsync(a => a.Id == artistId);
        db.EventArtists.Remove(artist);

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();
    }

    [Fact]
    public async Task ModifiedLineItem_OnlyQboActualValueAndUpdatedAt_OnFrozenEvent_Allows()
    {
        var (db, _, _) = CreateContext();
        var (_, lineItemId) = await SeedSettledEventWithLineItemAsync(db);

        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue = 250m;
        lineItem.UpdatedAt = DateTimeOffset.UtcNow;

        var act = () => db.SaveChangesAsync();
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ModifiedLineItem_QboActualValueAndSettlementValue_OnFrozenEvent_Throws()
    {
        var (db, _, _) = CreateContext();
        var (_, lineItemId) = await SeedSettledEventWithLineItemAsync(db);

        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue = 250m;
        lineItem.SettlementValue = 999m;

        var act = () => db.SaveChangesAsync();
        await act.Should().ThrowAsync<LedgerStateException>();
    }

    [Fact]
    public async Task ModifiedEvent_SettledToReconciled_WithAuthorizedContext_Allows()
    {
        var (db, saveContext, _) = CreateContext();
        var eventId = await SeedSettledEventAsync(db);

        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Status = EventStatus.Reconciled;
        evt.ReconciledAt = DateTimeOffset.UtcNow;
        evt.ReconciledByUserId = Guid.NewGuid();

        using (saveContext.Authorize(FrozenEventSaveReason.EventReconciliation))
        {
            var act = () => db.SaveChangesAsync();
            await act.Should().NotThrowAsync();
        }
    }

    private static (ApplicationDbContext Db, FrozenEventSaveContext SaveContext, TestLogCollector Collector) CreateContext()
    {
        var collector = new TestLogCollector();
        var saveContext = new FrozenEventSaveContext();
        var orgId = Guid.NewGuid();
        var tenant = new TestTenantContext();
        tenant.SetContext(Guid.NewGuid(), orgId);
        var loggerFactory = LoggerFactory.Create(builder => builder.AddProvider(collector));
        var auditor = new FrozenEventMutationAuditor(
            loggerFactory.CreateLogger<FrozenEventMutationAuditor>());
        var interceptor = new FrozenEventImmutabilityInterceptor(saveContext, auditor, tenant);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;

        var db = new ApplicationDbContext(options, tenant);
        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.SaveChanges();
        return (db, saveContext, collector);
    }

    private static async Task<Guid> SeedSettledEventAsync(ApplicationDbContext db)
    {
        var orgId = db.Organizations.Select(o => o.Id).First();
        var venueId = Guid.NewGuid();
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });

        var eventId = Guid.NewGuid();
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            Status = EventStatus.PreShow,
            QboTagName = "TAG",
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Status = EventStatus.Settled;
        await db.SaveChangesAsync();

        return eventId;
    }

    private static async Task<(Guid EventId, Guid LineItemId)> SeedSettledEventWithLineItemAsync(
        ApplicationDbContext db)
    {
        var orgId = db.Organizations.Select(o => o.Id).First();
        var venueId = Guid.NewGuid();
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });

        var eventId = Guid.NewGuid();
        var lineItemId = Guid.NewGuid();
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            Status = EventStatus.PreShow,
            QboTagName = "TAG",
            CreatedAt = DateTimeOffset.UtcNow
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = BlockType.Revenue.ToStorage(),
            RowLabel = "GA",
            SortOrder = 1,
            ProformaValue = 100m,
            SettlementValue = 100m,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Status = EventStatus.Settled;
        await db.SaveChangesAsync();

        return (eventId, lineItemId);
    }

    private static async Task<(Guid EventId, Guid ArtistId)> SeedSettledEventWithArtistAsync(
        ApplicationDbContext db)
    {
        var orgId = db.Organizations.Select(o => o.Id).First();
        var venueId = Guid.NewGuid();
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });

        var eventId = Guid.NewGuid();
        var artistId = Guid.NewGuid();
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            Status = EventStatus.PreShow,
            QboTagName = "TAG",
            CreatedAt = DateTimeOffset.UtcNow
        });
        db.EventArtists.Add(new EventArtist
        {
            Id = artistId,
            EventId = eventId,
            ArtistName = "Headliner",
            PerformanceOrder = 1,
            DealType = DealType.Guarantee.ToStorage()
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        evt.Status = EventStatus.Settled;
        await db.SaveChangesAsync();

        return (eventId, artistId);
    }

    private sealed class TestTenantContext : ITenantContext
    {
        public Guid? UserId { get; private set; }
        public Guid? OrganizationId { get; private set; }
        public Guid? ActiveVenueId { get; private set; }

        public void SetContext(Guid? userId, Guid? organizationId)
        {
            UserId = userId;
            OrganizationId = organizationId;
        }

        public void SetActiveVenueId(Guid? venueId) => ActiveVenueId = venueId;
    }
}
