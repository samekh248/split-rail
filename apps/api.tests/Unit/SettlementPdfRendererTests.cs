using FluentAssertions;
using SkiaSharp;
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

    [Fact]
    public void GenerateSignatureImage_EmptyStrokes_ReturnsPngBytes()
    {
        var image = SettlementPdfRenderer.GenerateSignatureImage([]);
        image.Should().NotBeNullOrEmpty();
        image.Take(4).Should().BeEquivalentTo(new byte[] { 0x89, 0x50, 0x4E, 0x47 });
    }

    [Fact]
    public void GenerateSignatureImage_SinglePointStroke_ReturnsPngBytes()
    {
        var image = SettlementPdfRenderer.GenerateSignatureImage(
        [
            new List<SignaturePoint> { new(25, 50) }
        ]);
        image.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void GenerateSignatureImage_WideCanvasCoordinates_FitsEntireStrokeInImage()
    {
        var strokes = new List<IReadOnlyList<SignaturePoint>>
        {
            new List<SignaturePoint>
            {
                new(40, 30),
                new(720, 210),
            }
        };

        var image = SettlementPdfRenderer.GenerateSignatureImage(strokes);

        image.Should().NotBeNullOrEmpty();
        using var bitmap = SKBitmap.Decode(image);
        bitmap.Should().NotBeNull();
        bitmap!.Width.Should().BeLessThanOrEqualTo(800);
        bitmap.Height.Should().BeLessThanOrEqualTo(300);
        ContainsInk(bitmap).Should().BeTrue();
    }

    private static bool ContainsInk(SKBitmap bitmap)
    {
        for (var y = 0; y < bitmap.Height; y++)
        {
            for (var x = 0; x < bitmap.Width; x++)
            {
                var color = bitmap.GetPixel(x, y);
                if (color.Red < 250 || color.Green < 250 || color.Blue < 250)
                {
                    return true;
                }
            }
        }

        return false;
    }

    [Fact]
    public void Render_WithMultipleArtistsAndLineItems_ProducesPdf()
    {
        var snapshot = new SettlementSnapshotDto(
            "Saturday Show",
            "2026-07-05",
            "Side Room",
            "Test Org",
            [
                new SettlementLineItemSnapshot("REVENUE", "GA Tickets", 0, false, "8000.00"),
                new SettlementLineItemSnapshot("EXPENSE", "Production", 1, false, "1500.00")
            ],
            [
                new SettlementArtistSnapshot("Opener", 1, "guarantee", "1000.00"),
                new SettlementArtistSnapshot("Headliner", 2, "versus", "4500.00")
            ],
            new SettlementSummarySnapshot("8000.00", "1500.00", "6500.00"));

        var pdfBytes = _renderer.Render(snapshot, []);
        pdfBytes.Should().NotBeNullOrEmpty();
    }
}
