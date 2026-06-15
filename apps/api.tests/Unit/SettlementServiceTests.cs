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

    private sealed class InMemoryArchiveStoreForUnit : ISettlementArchiveStore
    {
        public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
            string objectPath,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(("https://example.test/file.pdf", DateTimeOffset.UtcNow.Add(ttl)));
    }
}
