using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class SettlementServiceTests
{
    [Fact]
    public void BuildSnapshot_UsesSettlementValuesAndComputedSummary()
    {
        var evt = new Event
        {
            Title = "Show",
            EventDate = new DateOnly(2026, 7, 4),
            IsBudgetLocked = true,
            Venue = new Venue
            {
                Name = "Venue",
                Organization = new Organization { Name = "Org" }
            },
            LineItems =
            [
                new FinancialLineItem
                {
                    BlockType = BlockType.Revenue.ToStorage(),
                    RowLabel = "GA",
                    SettlementValue = 10000m
                }
            ],
            Artists =
            [
                new EventArtist
                {
                    ArtistName = "Headliner",
                    PerformanceOrder = 1,
                    DealType = DealType.Guarantee.ToStorage(),
                    CalculatedNetPayout = 5000m
                }
            ]
        };

        var snapshot = SettlementService.BuildSnapshot(evt);

        snapshot.LineItems.Single().SettlementValue.Should().Be("10000.00");
        snapshot.Artists.Single().CalculatedNetPayout.Should().Be("5000.00");
        snapshot.Summary.NetShowRevenue.Should().Be("10000.00");
    }

    [Fact]
    public async Task FinalizeAsync_RejectsWhenNotConfirmed()
    {
        await using var db = CreateDbContext();
        var service = CreateService(db, new InMemoryArchiveStoreForUnit());

        var act = () => service.FinalizeAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new FinalizeSettlementRequest(IntegrationTestHelper.ValidSignatureBase64(), false));

        await act.Should().ThrowAsync<SettlementStateException>();
    }

    [Fact]
    public async Task InMemoryArchiveStore_StagePromoteDelete_LeavesNoStagedObjects()
    {
        var store = new InMemoryArchiveStoreForUnit();
        var stagingPath = "staging/settlements/a.pdf";
        var finalPath = "settlements/a.pdf";
        var pdf = new byte[] { 0x25, 0x50, 0x44, 0x46 };

        await store.StageAsync(stagingPath, pdf);
        store.StagedCount.Should().Be(1);

        await store.PromoteAsync(stagingPath, finalPath);
        store.StagedCount.Should().Be(0);

        await store.DeleteStagedAsync(stagingPath);
        store.StagedCount.Should().Be(0);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var tenant = new TestTenantContext();
        return new ApplicationDbContext(options, tenant);
    }

    private static SettlementService CreateService(ApplicationDbContext db, ISettlementArchiveStore archiveStore)
    {
        var tenant = new TestTenantContext { UserId = Guid.NewGuid(), OrganizationId = Guid.NewGuid() };
        return new SettlementService(
            db,
            tenant,
            new VenueService(db, tenant, NullLogger<VenueService>.Instance),
            new SignatureValidator(),
            new SettlementPdfRenderer(),
            archiveStore,
            Options.Create(new SettlementArchiveOptions { BucketName = "test-bucket" }),
            new FrozenEventSaveContext(),
            NullLogger<SettlementService>.Instance);
    }

    private sealed class TestTenantContext : ITenantContext
    {
        public Guid? UserId { get; set; }
        public Guid? OrganizationId { get; set; }
        public Guid? ActiveVenueId { get; private set; }

        public void SetContext(Guid? userId, Guid? organizationId) =>
            (UserId, OrganizationId) = (userId, organizationId);

        public void SetActiveVenueId(Guid? venueId) => ActiveVenueId = venueId;
    }

    internal sealed class InMemoryArchiveStoreForUnit : ISettlementArchiveStore
    {
        private readonly Dictionary<string, byte[]> _staged = new(StringComparer.Ordinal);
        private readonly Dictionary<string, byte[]> _final = new(StringComparer.Ordinal);

        public bool ThrowOnNextSave { get; set; }

        public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
        {
            _final[objectPath] = pdfBytes;
            return Task.CompletedTask;
        }

        public Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
        {
            _staged[stagingPath] = pdfBytes;
            return Task.CompletedTask;
        }

        public Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default)
        {
            if (!_staged.ContainsKey(stagingPath))
                throw new SplitRail.Api.Exceptions.SettlementArchiveException("Staged object missing.");

            _final[finalPath] = _staged[stagingPath];
            _staged.Remove(stagingPath);
            return Task.CompletedTask;
        }

        public Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default)
        {
            _staged.Remove(stagingPath);
            return Task.CompletedTask;
        }

        public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
            string objectPath,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(("https://example.test/file.pdf", DateTimeOffset.UtcNow.Add(ttl)));

        public Task<DateTimeOffset?> GetRetentionUntilAsync(
            string objectPath,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<DateTimeOffset?>(null);

        public int StagedCount => _staged.Count;

        public int FinalCount => _final.Count;
    }
}
