using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
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
    public async Task ProcessTransactionsAsync_UpstreamAmountChange_AppendsOffsetEntry()
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
            RowLabel = "Production"
        });
        db.QboAccountMappings.Add(new QboAccountMapping
        {
            VenueId = venueId,
            QboAccountId = FakeQboTransactionClient.LifecycleAccountId,
            QboAccountName = "Production",
            MappedCategoryLabel = "Production",
            MappedLineItemId = lineItemId
        });
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = FakeQboTransactionClient.LifecycleTransactionId,
            QboAccountId = FakeQboTransactionClient.LifecycleAccountId,
            Amount = 5100.00m,
            TransactionDate = new DateOnly(2026, 6, 10),
            MappedLineItemId = lineItemId,
            SyncBatchId = Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.Original
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.Include(e => e.Venue).FirstAsync(e => e.Id == eventId);
        var transactions = await new FakeQboTransactionClient().FetchTransactionsByTagAsync(
            "token", "realm", FakeQboTransactionClient.LifecycleTagName);
        transactions[0].Amount.Should().Be(5100.00m);

        await service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);

        var ledger = await db.QboSyncLedgers.AsNoTracking()
            .Where(l => l.EventId == eventId)
            .ToListAsync();
        ledger.Should().HaveCount(1);
        ledger[0].EntryType.Should().Be(QboSyncLedgerEntryType.Original);

        transactions = new List<QboFetchedTransaction>
        {
            new(
                FakeQboTransactionClient.LifecycleTransactionId,
                FakeQboTransactionClient.LifecycleAccountId,
                "Production",
                6000.00m,
                new DateOnly(2026, 6, 10))
        };

        await service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);

        ledger = await db.QboSyncLedgers.AsNoTracking()
            .Where(l => l.EventId == eventId)
            .OrderBy(l => l.SyncedAt)
            .ToListAsync();
        ledger.Should().HaveCount(2);
        ledger[0].Amount.Should().Be(5100.00m);
        ledger[1].EntryType.Should().Be(QboSyncLedgerEntryType.OffsetCorrection);
        ledger[1].Amount.Should().Be(900.00m);

        var lineItem = await db.FinancialLineItems.FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(6000.00m);
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

    [Fact]
    public async Task ProcessTransactionsAsync_SettledEvent_WithNewTransactions_ThrowsLedgerStateException()
    {
        var (service, db, tenantContext) = CreateSyncService();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        var lineItemId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        tenantContext.SetContext(userId, orgId);

        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            Status = EventStatus.Settled,
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            ProformaValue = 100m,
            SettlementValue = 200m
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

        var act = () => service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);
        await act.Should().ThrowAsync<LedgerStateException>();

        var lineItem = await db.FinancialLineItems.AsNoTracking().FirstAsync(li => li.Id == lineItemId);
        lineItem.SettlementValue.Should().Be(200m);
        lineItem.ProformaValue.Should().Be(100m);
        lineItem.QboActualValue.Should().Be(0m);
    }

    [Fact]
    public async Task RecomputeActuals_SettledEvent_WithPendingLedgerChange_ThrowsBeforeMutation()
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
            Status = EventStatus.Settled,
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            SettlementValue = 200m
        });
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = "txn-settled",
            QboAccountId = "acct-1",
            Amount = 300m,
            TransactionDate = new DateOnly(2026, 6, 10),
            MappedLineItemId = lineItemId,
            SyncBatchId = Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.Original
        });
        await db.SaveChangesAsync();

        var act = () => service.RecomputeActualsForEventAsync(eventId, CancellationToken.None);
        await act.Should().ThrowAsync<LedgerStateException>();

        var lineItem = await db.FinancialLineItems.AsNoTracking().FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(0m);
        lineItem.SettlementValue.Should().Be(200m);
    }

    [Fact]
    public async Task ProcessTransactionsAsync_SettledEvent_NoNewTransactions_SkipsRecompute()
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
            Status = EventStatus.Settled,
            QboTagName = "NO-MATCH-TAG"
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            ProformaValue = 50m,
            SettlementValue = 75m,
            QboActualValue = 10m
        });
        await db.SaveChangesAsync();

        var evt = await db.Events.Include(e => e.Venue).FirstAsync(e => e.Id == eventId);
        var result = await service.ProcessTransactionsAsync(evt, [], CancellationToken.None);

        result.TransactionsProcessed.Should().Be(0);
        var lineItem = await db.FinancialLineItems.AsNoTracking().FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(10m);
        lineItem.SettlementValue.Should().Be(75m);
        lineItem.ProformaValue.Should().Be(50m);
    }

    [Fact]
    public async Task ProcessTransactionsAsync_ReconciledEvent_UpdatesActualsOnly()
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
            Status = EventStatus.Reconciled,
            QboTagName = FakeQboTransactionClient.LifecycleTagName
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            ProformaValue = 100m,
            SettlementValue = 200m
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

        await service.ProcessTransactionsAsync(evt, transactions, CancellationToken.None);

        var lineItem = await db.FinancialLineItems.AsNoTracking().FirstAsync(li => li.Id == lineItemId);
        lineItem.QboActualValue.Should().Be(5100.00m);
        lineItem.SettlementValue.Should().Be(200m);
        lineItem.ProformaValue.Should().Be(100m);
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
            new QboSyncCorrectionService(db),
            new FrozenEventMutationAuditor(NullLogger<FrozenEventMutationAuditor>.Instance),
            new QboSyncConcurrencyGate(),
            NullLogger<QboSyncService>.Instance);
        return (service, db, tenantContext);
    }
}
