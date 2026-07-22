using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SkiaSharp;
using SplitRail.Api.DTOs.Settlement;

namespace SplitRail.Api.Services;

public class SettlementPdfRenderer : ISettlementPdfRenderer
{
    private static bool _licenseInitialized;
    private static bool? _questPdfSupported;

    public byte[] Render(SettlementSnapshotDto snapshot, IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes)
    {
        var signatureImage = GenerateSignatureImage(strokes);

        if (IsQuestPdfSupported())
        {
            return RenderWithQuestPdf(snapshot, signatureImage);
        }

        return FinancialSettlementPdfGenerator.Generate(snapshot, signatureImage);
    }

    private static bool IsQuestPdfSupported()
    {
        if (_questPdfSupported.HasValue)
        {
            return _questPdfSupported.Value;
        }

        try
        {
            EnsureQuestPdfLicense();
            _questPdfSupported = true;
        }
        catch (TypeInitializationException)
        {
            _questPdfSupported = false;
        }
        catch (DllNotFoundException)
        {
            _questPdfSupported = false;
        }

        return _questPdfSupported.Value;
    }

    private static byte[] RenderWithQuestPdf(
        SettlementSnapshotDto snapshot,
        byte[] signatureImage)
    {
        EnsureQuestPdfLicense();

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
                    column.Item().Text($"{snapshot.OrganizationName} | {snapshot.VenueName}");
                    column.Item().Text($"{snapshot.EventTitle} | {snapshot.EventDate}");
                });

                page.Content().PaddingVertical(10).Column(column =>
                {
                    column.Spacing(8);
                    column.Item().PaddingTop(8).Text("Financial Summary").Bold().FontSize(12);
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(1);
                        });

                        AddSummaryRow(table, "Gross Revenue", snapshot.Summary.GrossRevenue, bold: false);
                        AddSummaryRow(table, "Total Deductions", snapshot.Summary.TotalDeductions, bold: false);
                        AddSummaryRow(table, "Net Show Revenue", snapshot.Summary.NetShowRevenue, bold: true);
                    });

                    column.Item().PaddingTop(20).Text("Line Items (Settlement Values)").Bold();
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
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Amount");
                        });

                        foreach (var item in snapshot.LineItems.OrderBy(i => i.BlockType).ThenBy(i => i.SortOrder))
                        {
                            table.Cell().Padding(4).Text(item.BlockType);
                            table.Cell().Padding(4).Text(item.RowLabel);
                            table.Cell().Padding(4).AlignRight().Text(item.SettlementValue);
                        }
                    });

                    column.Item().PaddingTop(20).Text("Artist Payouts").Bold();
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
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Net Payout");
                        });

                        foreach (var artist in snapshot.Artists.OrderBy(a => a.PerformanceOrder))
                        {
                            table.Cell().Padding(4).Text(artist.ArtistName);
                            table.Cell().Padding(4).Text(artist.DealType);
                            table.Cell().Padding(4).AlignRight().Text(artist.CalculatedNetPayout);
                        }
                    });

                    column.Item().PaddingTop(20).Text("Artist Signature").Bold();
                    column.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Height(110).Padding(4)
                        .Image(signatureImage).FitArea();
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

    private static void AddSummaryRow(
        TableDescriptor table,
        string label,
        string amount,
        bool bold)
    {
        var labelCell = table.Cell().Padding(4);
        var amountCell = table.Cell().Padding(4).AlignRight();
        if (bold)
        {
            labelCell = labelCell.Background(Colors.Grey.Lighten3);
            amountCell = amountCell.Background(Colors.Grey.Lighten3);
            labelCell.Text(label).Bold();
            amountCell.Text(amount).Bold();
            return;
        }

        labelCell.Text(label);
        amountCell.Text(amount);
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
        const float padding = 12f;
        const int maxWidth = 800;
        const int maxHeight = 300;

        var points = strokes.Where(s => s.Count > 0).SelectMany(s => s).ToList();
        if (points.Count == 0)
        {
            return RenderBlankSignatureImage(maxWidth, maxHeight);
        }

        var minX = points.Min(p => p.X);
        var maxX = points.Max(p => p.X);
        var minY = points.Min(p => p.Y);
        var maxY = points.Max(p => p.Y);

        var contentWidth = Math.Max(1f, maxX - minX);
        var contentHeight = Math.Max(1f, maxY - minY);
        var scale = Math.Min(
            (maxWidth - (padding * 2)) / contentWidth,
            (maxHeight - (padding * 2)) / contentHeight);

        var width = Math.Max(1, (int)Math.Ceiling((contentWidth * scale) + (padding * 2)));
        var height = Math.Max(1, (int)Math.Ceiling((contentHeight * scale) + (padding * 2)));

        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        canvas.Clear(SKColors.White);

        using var paint = new SKPaint
        {
            Color = SKColors.Black,
            StrokeWidth = Math.Clamp(2f * scale, 1.5f, 3f),
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
                var point = MapPoint(stroke[0], minX, minY, scale, padding);
                canvas.DrawPoint(point.X, point.Y, paint);
                continue;
            }

            using var path = new SKPath();
            var first = MapPoint(stroke[0], minX, minY, scale, padding);
            path.MoveTo(first.X, first.Y);
            for (var i = 1; i < stroke.Count; i++)
            {
                var mapped = MapPoint(stroke[i], minX, minY, scale, padding);
                path.LineTo(mapped.X, mapped.Y);
            }

            canvas.DrawPath(path, paint);
        }

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private static SKPoint MapPoint(SignaturePoint point, float minX, float minY, float scale, float padding) =>
        new((point.X - minX) * scale + padding, (point.Y - minY) * scale + padding);

    private static byte[] RenderBlankSignatureImage(int width, int height)
    {
        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);
        canvas.Clear(SKColors.White);
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
