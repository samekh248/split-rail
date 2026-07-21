using FluentAssertions;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FinancialSettlementPdfGeneratorTests
{
    [Fact]
    public void Generate_ProducesValidPdfHeader()
    {
        var snapshot = new SettlementSnapshotDto(
            "Friday Headliner",
            "2026-07-04",
            "Main Hall",
            "Test Org",
            [new SettlementLineItemSnapshot("REVENUE", "GA Tickets", 0, false, "10000.00")],
            [new SettlementArtistSnapshot("The Headliner", 1, "guarantee", "5000.00")],
            new SettlementSummarySnapshot("10000.00", "0.00", "10000.00"));

        var signature = SettlementPdfRenderer.GenerateSignatureImage([]);
        var pdfBytes = FinancialSettlementPdfGenerator.Generate(snapshot, signature);

        pdfBytes.Should().NotBeNullOrEmpty();
        pdfBytes.Take(4).Should().BeEquivalentTo(new byte[] { 0x25, 0x50, 0x44, 0x46 });
        pdfBytes.Length.Should().BeGreaterThan(2000);
    }
}
