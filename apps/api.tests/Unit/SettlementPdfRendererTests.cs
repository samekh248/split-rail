using FluentAssertions;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class SettlementPdfRendererTests
{
    private readonly SettlementPdfRenderer _renderer = new();

    [Fact]
    public void Render_ProducesNonEmptyPdf_WithFinancialAndSignatureData()
    {
        if (!QuestPdfSupported())
            return;

        var snapshot = new SettlementSnapshotDto(
            "Friday Headliner",
            "2026-07-04",
            "Main Hall",
            "Test Org",
            [
                new SettlementLineItemSnapshot("REVENUE", "GA Tickets", 0, false, "10000.00")
            ],
            [
                new SettlementArtistSnapshot("The Headliner", 1, "guarantee", "5000.00")
            ],
            new SettlementSummarySnapshot("10000.00", "0.00", "10000.00"));

        var strokes = new List<IReadOnlyList<SignaturePoint>>
        {
            new List<SignaturePoint>
            {
                new(10, 20),
                new(30, 40)
            }
        };

        var pdfBytes = _renderer.Render(snapshot, strokes);

        pdfBytes.Should().NotBeNullOrEmpty();
        pdfBytes.Take(4).Should().BeEquivalentTo(new byte[] { 0x25, 0x50, 0x44, 0x46 });
    }

    private static bool QuestPdfSupported()
    {
        if (!OperatingSystem.IsWindows())
            return true;

        return Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE") is "AMD64" or "x86";
    }
}
