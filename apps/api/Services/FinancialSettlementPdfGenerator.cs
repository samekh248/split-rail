using System.IO.Compression;
using System.Text;
using SkiaSharp;
using SplitRail.Api.DTOs.Settlement;

namespace SplitRail.Api.Services;

/// <summary>
/// Pure-managed PDF generator for runtimes where QuestPDF native assets are unavailable (e.g. win-arm64).
/// Uses standard PDF Type1 fonts and SkiaSharp for signature images — no system font resolver required.
/// </summary>
internal static class FinancialSettlementPdfGenerator
{
    public static byte[] Generate(SettlementSnapshotDto snapshot, byte[] signatureImage) =>
        new SettlementReportPdfBuilder(snapshot, signatureImage).Build();
}

internal sealed class SettlementReportPdfBuilder
{
    private const float PageWidth = 612f;
    private const float PageHeight = 792f;
    private const float MarginLeft = 54f;
    private const float MarginRight = 54f;
    private const float MarginTop = 54f;
    private const float MarginBottom = 54f;
    private const float ContentWidth = PageWidth - MarginLeft - MarginRight;

    private const float SectionHeadingTopSpacing = 22f;
    private const float BlockBottomSpacing = 10f;
    private const float CellPadding = 8f;

    private readonly SettlementSnapshotDto _snapshot;
    private readonly byte[] _signatureImage;
    private readonly List<string> _contentOps = [];
    private float _y = PageHeight - MarginTop;

    public SettlementReportPdfBuilder(SettlementSnapshotDto snapshot, byte[] signatureImage)
    {
        _snapshot = snapshot;
        _signatureImage = signatureImage;
    }

    public byte[] Build()
    {
        DrawTitle();
        DrawSubtitle($"{_snapshot.OrganizationName} | {_snapshot.VenueName}", 11);
        DrawSubtitle($"{_snapshot.EventTitle} | {_snapshot.EventDate}", 11);
        Advance(16);

        DrawSectionHeading("Financial Summary");
        DrawSummaryTable();

        DrawSectionHeading("Line Items (Settlement Values)");
        DrawDataTable(
            ["Block", "Label", "Amount"],
            _snapshot.LineItems
                .OrderBy(i => i.BlockType)
                .ThenBy(i => i.SortOrder)
                .Select(i => new[] { i.BlockType, i.RowLabel, i.SettlementValue })
                .ToList(),
            rightAlignLastColumn: true);

        DrawSectionHeading("Artist Payouts");
        DrawDataTable(
            ["Artist", "Deal", "Net Payout"],
            _snapshot.Artists
                .OrderBy(a => a.PerformanceOrder)
                .Select(a => new[] { a.ArtistName, a.DealType, a.CalculatedNetPayout })
                .ToList(),
            rightAlignLastColumn: true);

        DrawSectionHeading("Artist Signature");
        DrawSignatureFrame();

        var footerY = MarginBottom + 10;
        DrawText($"Generated {DateTimeOffset.UtcNow:u}", 8, MarginLeft, footerY, bold: false, color: 0.45f);

        return AssemblePdf(_contentOps, _signatureImage);
    }

    private void DrawTitle()
    {
        DrawText("Settlement Report", 18, MarginLeft, _y, bold: true);
        Advance(22);
    }

    private void DrawSubtitle(string text, float size)
    {
        DrawText(text, size, MarginLeft, _y, bold: false, color: 0.35f);
        Advance(size + 4);
    }

    private void DrawSectionHeading(string text)
    {
        Advance(SectionHeadingTopSpacing);
        DrawText(text, 12, MarginLeft, _y, bold: true);
        Advance(16);
    }

    private void DrawSummaryTable()
    {
        var rows = new[]
        {
            ("Gross Revenue", _snapshot.Summary.GrossRevenue, false),
            ("Total Deductions", _snapshot.Summary.TotalDeductions, false),
            ("Net Show Revenue", _snapshot.Summary.NetShowRevenue, true),
        };

        const float rowHeight = 20f;
        const float labelWidth = ContentWidth * 0.7f;
        const float amountWidth = ContentWidth - labelWidth;
        var tableTop = _y;
        var tableHeight = rows.Length * rowHeight;

        DrawRect(MarginLeft, tableTop - tableHeight, ContentWidth, tableHeight, stroke: true);
        DrawLine(MarginLeft + labelWidth, tableTop, MarginLeft + labelWidth, tableTop - tableHeight);

        for (var i = 0; i < rows.Length; i++)
        {
            var (label, amount, bold) = rows[i];
            var rowTop = tableTop - (i * rowHeight);
            var textY = rowTop - 14;

            if (bold)
            {
                DrawFilledRect(MarginLeft, rowTop - rowHeight, ContentWidth, rowHeight, 0.92f);
            }

            if (i > 0)
            {
                DrawLine(MarginLeft, rowTop, MarginLeft + ContentWidth, rowTop);
            }

            DrawText(label, 10, MarginLeft + CellPadding, textY, bold);
            DrawTextRight(
                amount,
                10,
                MarginLeft + labelWidth + amountWidth - CellPadding,
                textY,
                bold,
                minX: MarginLeft + labelWidth + CellPadding);
        }

        _y = tableTop - tableHeight - BlockBottomSpacing;
    }

    private void DrawDataTable(
        IReadOnlyList<string> headers,
        IReadOnlyList<string[]> rows,
        bool rightAlignLastColumn)
    {
        var colWidths = new[] { ContentWidth * 0.22f, ContentWidth * 0.48f, ContentWidth * 0.30f };
        const float headerHeight = 20f;
        const float rowHeight = 18f;
        var tableTop = _y;
        var tableHeight = headerHeight + (rows.Count * rowHeight);

        DrawFilledRect(MarginLeft, tableTop - headerHeight, ContentWidth, headerHeight, 0.90f);
        DrawRect(MarginLeft, tableTop - tableHeight, ContentWidth, tableHeight, stroke: true);

        var colX = MarginLeft;
        for (var c = 1; c < colWidths.Length; c++)
        {
            colX += colWidths[c - 1];
            DrawLine(colX, tableTop, colX, tableTop - tableHeight);
        }

        colX = MarginLeft;
        for (var c = 0; c < headers.Count; c++)
        {
            var colLeft = colX;
            var colRight = colX + colWidths[c];
            var textY = tableTop - 14;

            if (rightAlignLastColumn && c == headers.Count - 1)
            {
                DrawTextRight(
                    headers[c],
                    9,
                    colRight - CellPadding,
                    textY,
                    bold: true,
                    minX: colLeft + CellPadding);
            }
            else
            {
                DrawText(headers[c], 9, colLeft + CellPadding, textY, bold: true);
            }

            colX += colWidths[c];
        }

        DrawLine(MarginLeft, tableTop - headerHeight, MarginLeft + ContentWidth, tableTop - headerHeight);

        for (var r = 0; r < rows.Count; r++)
        {
            var rowTop = tableTop - headerHeight - (r * rowHeight);
            if (r > 0)
            {
                DrawLine(MarginLeft, rowTop, MarginLeft + ContentWidth, rowTop);
            }

            colX = MarginLeft;
            for (var c = 0; c < rows[r].Length; c++)
            {
                var colLeft = colX;
                var colRight = colX + colWidths[c];
                var textY = rowTop - 13;

                if (rightAlignLastColumn && c == rows[r].Length - 1)
                {
                    DrawTextRight(
                        rows[r][c],
                        9,
                        colRight - CellPadding,
                        textY,
                        minX: colLeft + CellPadding);
                }
                else
                {
                    DrawText(rows[r][c], 9, colLeft + CellPadding, textY);
                }

                colX += colWidths[c];
            }
        }

        _y = tableTop - tableHeight - BlockBottomSpacing;
    }

    private void DrawSignatureFrame()
    {
        const float frameHeight = 110f;
        var frameWidth = ContentWidth;
        var frameBottom = _y - frameHeight;
        const float inset = 4f;

        DrawRect(MarginLeft, frameBottom, frameWidth, frameHeight, stroke: true);

        if (_signatureImage.Length > 0
            && TryGetPngDimensions(_signatureImage, out var imageWidth, out var imageHeight))
        {
            var availWidth = frameWidth - (inset * 2);
            var availHeight = frameHeight - (inset * 2);
            var scale = Math.Min(availWidth / imageWidth, availHeight / imageHeight);
            var drawWidth = imageWidth * scale;
            var drawHeight = imageHeight * scale;
            var drawX = MarginLeft + inset + ((availWidth - drawWidth) / 2);
            var drawY = frameBottom + inset + ((availHeight - drawHeight) / 2);

            _contentOps.Add(
                $"q {drawWidth:0.##} 0 0 {drawHeight:0.##} {drawX:0.##} {drawY:0.##} cm /SigImg Do Q");
        }

        _y = frameBottom - 8;
    }

    private void Advance(float points) => _y -= points;

    private void DrawText(
        string text,
        float size,
        float x,
        float y,
        bool bold = false,
        float color = 0f)
    {
        var font = bold ? "/F2" : "/F1";
        var gray = color.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
        _contentOps.Add("BT");
        _contentOps.Add($"{font} {size.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} Tf");
        _contentOps.Add($"{gray} g");
        _contentOps.Add($"1 0 0 1 {x.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} {y.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} Tm");
        _contentOps.Add($"({EscapePdfText(text)}) Tj");
        _contentOps.Add("ET");
    }

    private void DrawTextRight(
        string text,
        float size,
        float rightX,
        float y,
        bool bold = false,
        float minX = 0)
    {
        var approxWidth = EstimateTextWidth(text, size, bold);
        var drawX = rightX - approxWidth;
        if (minX > 0)
        {
            drawX = Math.Max(minX, drawX);
        }

        DrawText(text, size, drawX, y, bold);
    }

    private static float EstimateTextWidth(string text, float size, bool bold)
    {
        var factor = bold ? 0.68f : 0.60f;
        return text.Length * size * factor;
    }

    private void DrawLine(float x1, float y1, float x2, float y2)
    {
        _contentOps.Add("0.5 w 0 G");
        _contentOps.Add($"{x1:0.##} {y1:0.##} m {x2:0.##} {y2:0.##} l S");
    }

    private void DrawRect(float x, float y, float width, float height, bool stroke)
    {
        _contentOps.Add("0.5 w 0 G");
        _contentOps.Add($"{x:0.##} {y:0.##} {width:0.##} {height:0.##} re");
        _contentOps.Add(stroke ? "S" : "n");
    }

    private void DrawFilledRect(float x, float y, float width, float height, float gray)
    {
        _contentOps.Add($"{gray.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)} g");
        _contentOps.Add($"{x:0.##} {y:0.##} {width:0.##} {height:0.##} re f");
        _contentOps.Add("0 g");
    }

    private static string EscapePdfText(string value) =>
        SanitizeForAsciiPdf(value)
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal);

    private static string SanitizeForAsciiPdf(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);
        foreach (var ch in value)
        {
            switch (ch)
            {
                case '\u00b7':
                    builder.Append(" | ");
                    break;
                case '\u2013':
                case '\u2014':
                    builder.Append('-');
                    break;
                case '\u2018':
                case '\u2019':
                    builder.Append('\'');
                    break;
                case '\u201c':
                case '\u201d':
                    builder.Append('"');
                    break;
                case >= (char)32 and <= (char)126:
                    builder.Append(ch);
                    break;
                case '\t':
                case '\n':
                case '\r':
                    builder.Append(' ');
                    break;
            }
        }

        return builder.ToString();
    }

    private static byte[] AssemblePdf(List<string> contentOps, byte[] signatureImage)
    {
        var contentStream = string.Join("\n", contentOps);
        var contentBytes = Encoding.ASCII.GetBytes(contentStream);
        var hasImage = TryBuildPngImageObject(signatureImage, out var imageDict, out var imageStreamBytes);

        // 1 Catalog, 2 Pages, 3 Page, 4 Contents, 5 F1, 6 F2, [7 SigImg]
        const int catalogIndex = 1;
        const int pagesIndex = 2;
        const int pageIndex = 3;
        const int contentsIndex = 4;
        const int fontRegularIndex = 5;
        const int fontBoldIndex = 6;
        const int imageIndex = 7;

        var pageResources = hasImage
            ? $"<< /Font << /F1 {fontRegularIndex} 0 R /F2 {fontBoldIndex} 0 R >> /XObject << /SigImg {imageIndex} 0 R >> >>"
            : $"<< /Font << /F1 {fontRegularIndex} 0 R /F2 {fontBoldIndex} 0 R >> >>";

        var objects = new List<byte[]>
        {
            Encoding.ASCII.GetBytes($"<< /Type /Catalog /Pages {pagesIndex} 0 R >>"),
            Encoding.ASCII.GetBytes($"<< /Type /Pages /Kids [{pageIndex} 0 R] /Count 1 >>"),
            Encoding.ASCII.GetBytes(
                $"<< /Type /Page /Parent {pagesIndex} 0 R /MediaBox [0 0 {PageWidth:0.##} {PageHeight:0.##}] "
                + $"/Contents {contentsIndex} 0 R /Resources {pageResources} >>"),
            BuildStreamObject($"<< /Length {contentBytes.Length} >>\nstream\n", contentBytes, "\nendstream"),
            Encoding.ASCII.GetBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
            Encoding.ASCII.GetBytes("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
        };

        if (hasImage)
        {
            objects.Add(BuildStreamObject(imageDict, imageStreamBytes, "\nendstream"));
        }

        using var pdf = new MemoryStream();
        pdf.Write("%PDF-1.4\n"u8);

        var offsets = new int[objects.Count + 1];
        for (var i = 0; i < objects.Count; i++)
        {
            offsets[i + 1] = (int)pdf.Position;
            var header = Encoding.ASCII.GetBytes($"{i + 1} 0 obj\n");
            pdf.Write(header);
            pdf.Write(objects[i]);
            pdf.Write("\nendobj\n"u8);
        }

        var xrefOffset = (int)pdf.Position;
        var xref = new StringBuilder();
        xref.AppendLine("xref");
        xref.AppendLine($"0 {objects.Count + 1}");
        xref.AppendLine("0000000000 65535 f ");
        for (var i = 1; i <= objects.Count; i++)
        {
            xref.AppendLine($"{offsets[i]:D10} 00000 n ");
        }

        pdf.Write(Encoding.ASCII.GetBytes(xref.ToString()));
        pdf.Write(Encoding.ASCII.GetBytes(
            $"trailer\n<< /Size {objects.Count + 1} /Root {catalogIndex} 0 R >>\nstartxref\n{xrefOffset}\n%%EOF\n"));

        return pdf.ToArray();

        static byte[] BuildStreamObject(string header, byte[]? body = null, string? footer = null)
        {
            using var stream = new MemoryStream();
            stream.Write(Encoding.ASCII.GetBytes(header));
            if (body is { Length: > 0 })
            {
                stream.Write(body);
            }

            if (footer is not null)
            {
                stream.Write(Encoding.ASCII.GetBytes(footer));
            }

            return stream.ToArray();
        }
    }

    private static bool TryGetPngDimensions(byte[] pngBytes, out int width, out int height)
    {
        width = 0;
        height = 0;

        if (pngBytes.Length < 24
            || pngBytes[0] != 0x89
            || pngBytes[1] != (byte)'P'
            || pngBytes[2] != (byte)'N'
            || pngBytes[3] != (byte)'G')
        {
            return false;
        }

        width = (pngBytes[16] << 24) | (pngBytes[17] << 16) | (pngBytes[18] << 8) | pngBytes[19];
        height = (pngBytes[20] << 24) | (pngBytes[21] << 16) | (pngBytes[22] << 8) | pngBytes[23];
        return width > 0 && height > 0;
    }

    private static bool TryBuildPngImageObject(
        byte[] signatureImage,
        out string imageDict,
        out byte[] imageStreamBytes)
    {
        imageDict = string.Empty;
        imageStreamBytes = [];

        try
        {
            using var bitmap = SKBitmap.Decode(signatureImage);
            if (bitmap is null)
            {
                return false;
            }

            var width = bitmap.Width;
            var height = bitmap.Height;
            var rgb = new byte[width * height * 3];

            for (var y = 0; y < height; y++)
            {
                for (var x = 0; x < width; x++)
                {
                    var color = bitmap.GetPixel(x, y);
                    var offset = (y * width + x) * 3;
                    rgb[offset] = color.Red;
                    rgb[offset + 1] = color.Green;
                    rgb[offset + 2] = color.Blue;
                }
            }

            imageStreamBytes = ZlibCompress(rgb);
            imageDict =
                $"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
                + "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode "
                + $"/Length {imageStreamBytes.Length} >>\nstream\n";
            return true;
        }
        catch (DllNotFoundException)
        {
            return false;
        }
    }

    private static byte[] ZlibCompress(byte[] data)
    {
        using var output = new MemoryStream();
        using (var zlib = new ZLibStream(output, CompressionLevel.Optimal, leaveOpen: true))
        {
            zlib.Write(data, 0, data.Length);
        }

        return output.ToArray();
    }
}
