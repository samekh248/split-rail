using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using FluentAssertions;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncCorrectionAppendOnlyTests
{
    [Fact]
    public async Task ApplyCorrectionsAsync_DoesNotModifyExistingLedgerRows()
    {
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var eventId = Guid.NewGuid();
        var lineItemId = Guid.NewGuid();
        var tenantContext = new TenantContext();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        var interceptor = new QboSyncLedgerAppendOnlyInterceptor();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .AddInterceptors(interceptor)
            .Options;

        var db = new ApplicationDbContext(options, tenantContext);
        db.Organizations.Add(new Organization { Id = orgId, Name = "Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.Events.Add(new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            QboTagName = "TAG"
        });
        db.FinancialLineItems.Add(new FinancialLineItem
        {
            Id = lineItemId,
            EventId = eventId,
            BlockType = "EXPENSE",
            RowLabel = "Production"
        });
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = "TXN-1",
            QboAccountId = "ACC-1",
            Amount = 100m,
            TransactionDate = new DateOnly(2026, 6, 10),
            MappedLineItemId = lineItemId,
            SyncBatchId = Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.Original
        });
        await db.SaveChangesAsync();

        var service = new QboSyncCorrectionService(db);
        var fetched = new List<QboFetchedTransaction>
        {
            new("TXN-1", "ACC-1", "Account", 150m, new DateOnly(2026, 6, 10))
        };

        await service.ApplyCorrectionsAsync(
            eventId,
            fetched,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow);
        await db.SaveChangesAsync();

        interceptor.Violations.Should().BeEmpty();

        var ledger = await db.QboSyncLedgers.AsNoTracking().ToListAsync();
        ledger.Should().HaveCount(2);
        ledger.Single(l => l.EntryType == QboSyncLedgerEntryType.Original).Amount.Should().Be(100m);
        ledger.Single(l => l.EntryType == QboSyncLedgerEntryType.OffsetCorrection).Amount.Should().Be(50m);
    }
}
