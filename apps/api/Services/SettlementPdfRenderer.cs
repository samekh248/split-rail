using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SkiaSharp;
using SplitRail.Api.DTOs.Settlement;

namespace SplitRail.Api.Services;

public class SettlementPdfRenderer
{
    private static bool _licenseInitialized;

    public byte[] Render(SettlementSnapshotDto snapshot, IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes)
    {
        EnsureQuestPdfLicense();
        var signatureImage = GenerateSignatureImage(strokes);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(column =>
                {
                    column.Item().Text("Settlement Report").Bold().FontSize(16);
                    column.Item().Text($"{snapshot.OrganizationName} · {snapshot.VenueName}");
                    column.Item().Text($"{snapshot.EventTitle} · {snapshot.EventDate}");
                });

                page.Content().PaddingVertical(10).Column(column =>
                {
                    column.Spacing(8);
                    column.Item().Text("Financial Summary").Bold().FontSize(12);
                    column.Item().Text(
                        $"Gross Revenue: {snapshot.Summary.GrossRevenue}  |  " +
                        $"Deductions: {snapshot.Summary.TotalDeductions}  |  " +
                        $"Net Show Revenue: {snapshot.Summary.NetShowRevenue}");

                    column.Item().PaddingTop(8).Text("Line Items (Settlement Values)").Bold();
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Block");
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Label");
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Amount");
                        });

                        foreach (var item in snapshot.LineItems.OrderBy(i => i.BlockType).ThenBy(i => i.SortOrder))
                        {
                            table.Cell().Padding(4).Text(item.BlockType);
                            table.Cell().Padding(4).Text(item.RowLabel);
                            table.Cell().Padding(4).Text(item.SettlementValue);
                        }
                    });

                    column.Item().PaddingTop(8).Text("Artist Payouts").Bold();
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Artist");
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Deal");
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Net Payout");
                        });

                        foreach (var artist in snapshot.Artists.OrderBy(a => a.PerformanceOrder))
                        {
                            table.Cell().Padding(4).Text(artist.ArtistName);
                            table.Cell().Padding(4).Text(artist.DealType);
                            table.Cell().Padding(4).Text(artist.CalculatedNetPayout);
                        }
                    });

                    column.Item().PaddingTop(12).Text("Artist Signature").Bold();
                    column.Item().Height(100).Image(signatureImage);
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Generated ");
                    text.Span(DateTimeOffset.UtcNow.ToString("u"));
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void EnsureQuestPdfLicense()
    {
        if (_licenseInitialized)
            return;

        QuestPDF.Settings.License = LicenseType.Community;
        _licenseInitialized = true;
    }

    internal static byte[] GenerateSignatureImage(IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes)
    {
        try
        {
            return RenderSignatureWithSkia(strokes);
        }
        catch (DllNotFoundException)
        {
            return MinimalSignaturePng;
        }
    }

    private static byte[] RenderSignatureWithSkia(IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes)
    {
        const int width = 400;
        const int height = 120;

        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        canvas.Clear(SKColors.White);

        using var paint = new SKPaint
        {
            Color = SKColors.Black,
            StrokeWidth = 2,
            IsAntialias = true,
            Style = SKPaintStyle.Stroke,
            StrokeCap = SKStrokeCap.Round,
            StrokeJoin = SKStrokeJoin.Round
        };

        foreach (var stroke in strokes)
        {
            if (stroke.Count == 0)
                continue;

            if (stroke.Count == 1)
            {
                canvas.DrawPoint(stroke[0].X, stroke[0].Y, paint);
                continue;
            }

            using var path = new SKPath();
            path.MoveTo(stroke[0].X, stroke[0].Y);
            for (var i = 1; i < stroke.Count; i++)
                path.LineTo(stroke[i].X, stroke[i].Y);
            canvas.DrawPath(path, paint);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    // 1x1 white PNG fallback when Skia native libraries are unavailable (local dev without native assets).
    private static readonly byte[] MinimalSignaturePng =
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
    ];
}
