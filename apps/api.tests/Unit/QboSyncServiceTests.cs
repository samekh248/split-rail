using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncServiceTests
{
    [Fact]
    public void ParseQueryResponse_FiltersByTagName()
    {
        var json = """
            {
              "QueryResponse": {
                "Purchase": [
                  {
                    "Id": "1",
                    "TotalAmt": 25.50,
                    "TxnDate": "2026-06-10",
                    "Tag": [{ "Name": "EVENT-A" }],
                    "AccountRef": { "value": "ACC-1", "name": "Rent" }
                  },
                  {
                    "Id": "2",
                    "TotalAmt": 10.00,
                    "TxnDate": "2026-06-10",
                    "Tag": [{ "Name": "OTHER" }],
                    "AccountRef": { "value": "ACC-2", "name": "Other" }
                  }
                ]
              }
            }
            """;

        var results = QboTransactionClient.ParseQueryResponse(json, "Purchase", "EVENT-A");

        results.Should().HaveCount(1);
        results[0].TransactionId.Should().Be("1");
        results[0].Amount.Should().Be(25.50m);
        results[0].AccountId.Should().Be("ACC-1");
    }

    [Fact]
    public void ParseQueryResponse_ReturnsEmptyWhenNoMatchingTag()
    {
        var json = """
            {
              "QueryResponse": {
                "Purchase": [{
                  "Id": "1",
                  "TotalAmt": 25.50,
                  "TxnDate": "2026-06-10",
                  "Tag": [{ "Name": "OTHER" }],
                  "AccountRef": { "value": "ACC-1", "name": "Rent" }
                }]
              }
            }
            """;

        var results = QboTransactionClient.ParseQueryResponse(json, "Purchase", "EVENT-A");
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task ProcessTransactionsAsync_MapsKnownAccountsAndRecomputesActuals()
    {
        var (service, db, tenantContext) = CreateSyncService();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        var lineItemId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            SettlementValue = 0m
        });
        db.QboAccountMappings.Add(new QboAccountMapping
        {
            VenueId = venueId,
            QboAccountId = FakeQboTransactionClient.LifecycleAccountId,
            QboAccountName = "Production",
            MappedCategoryLabel = "Production",
            MappedLineItemId = lineItemId
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.Include(e => e.Venue).FirstAsync(e => e.Id == eventId);
        var transactions = await new FakeQboTransactionClient().FetchTransactionsByTagAsync(
            "token", "realm", FakeQboTransactionClient.LifecycleTagName);

        var result = await service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);

        result.TransactionsMapped.Should().Be(1);
        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(5100.00m);
    }

    [Fact]
    public async Task ProcessTransactionsAsync_RecordsUnmappedTransactions_WhenNoMapping()
    {
        var (service, db, tenantContext) = CreateSyncService();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.Include(e => e.Venue).FirstAsync(e => e.Id == eventId);
        var transactions = await new FakeQboTransactionClient().FetchTransactionsByTagAsync(
            "token", "realm", FakeQboTransactionClient.LifecycleTagName);

        var result = await service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);

        result.TransactionsUnmapped.Should().Be(1);
        (await db.UnmappedQboTransactions.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task SyncEventInternalAsync_ReturnsEmptyWhenQboNotConnected()
    {
        var (service, db, tenantContext) = CreateSyncService();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        await db.SaveChangesAsync();

        var result = await service.SyncEventInternalAsync(venueId, eventId);

        result.TransactionsProcessed.Should().Be(0);
    }

    [Fact]
    public async Task SyncAllEligibleEventsAsync_ProcessesConnectedVenues()
    {
        var (service, db, tenantContext) = CreateSyncService();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            QboTagName = ""
        });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm",
            EncryptedAccessToken = "enc",
            EncryptedRefreshToken = "enc",
            TokenExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
        });
        await db.SaveChangesAsync();

        var count = await service.SyncAllEligibleEventsAsync();
        count.Should().Be(0);
    }

    private static (QboSyncService Service, ApplicationDbContext Db, TenantContext TenantContext) CreateSyncService()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var db = new ApplicationDbContext(options, tenantContext);
        var tokenService = new QboTokenService(
            db,
            NSubstitute.Substitute.For<System.Net.Http.IHttpClientFactory>(),
            Microsoft.AspNetCore.DataProtection.DataProtectionProvider.Create("test"),
            Microsoft.Extensions.Options.Options.Create(new SplitRail.Api.Configuration.QboSyncOptions()),
            NullLogger<QboTokenService>.Instance);
        var venueService = new VenueService(db, tenantContext, NullLogger<VenueService>.Instance);
        var service = new QboSyncService(
            db,
            tokenService,
            new FakeQboTransactionClient(),
            venueService,
            tenantContext,
            NullLogger<QboSyncService>.Instance);
        return (service, db, tenantContext);
    }
}
