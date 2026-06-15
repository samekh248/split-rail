using System.Text;
using System.Text.Json;

namespace SplitRail.Api.Services;

public class SignatureValidator
{
    public IReadOnlyList<IReadOnlyList<SignaturePoint>> ValidateAndParse(string signatureData)
    {
        if (string.IsNullOrWhiteSpace(signatureData))
            throw new Exceptions.SignatureValidationException("Signature is required.");

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(signatureData.Trim());
        }
        catch (FormatException)
        {
            throw new Exceptions.SignatureValidationException("Signature must be valid base64.");
        }

        if (bytes.Length == 0)
            throw new Exceptions.SignatureValidationException("Signature payload is empty.");

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(bytes);
        }
        catch (JsonException)
        {
            throw new Exceptions.SignatureValidationException("Signature must be valid JSON.");
        }

        using (document)
        {
            var strokes = ParseStrokes(document.RootElement);
            if (strokes.Count == 0 || strokes.All(s => s.Count == 0))
                throw new Exceptions.SignatureValidationException("Signature must contain at least one stroke.");

            return strokes;
        }
    }

    private static List<List<SignaturePoint>> ParseStrokes(JsonElement root)
    {
        var element = root.ValueKind switch
        {
            JsonValueKind.Object when root.TryGetProperty("strokes", out var strokes) => strokes,
            JsonValueKind.Array => root,
            _ => throw new Exceptions.SignatureValidationException("Signature JSON must be a stroke array.")
        };

        if (element.ValueKind != JsonValueKind.Array)
            throw new Exceptions.SignatureValidationException("Signature strokes must be an array.");

        var result = new List<List<SignaturePoint>>();
        foreach (var strokeElement in element.EnumerateArray())
        {
            if (strokeElement.ValueKind != JsonValueKind.Array)
                throw new Exceptions.SignatureValidationException("Each stroke must be an array of points.");

            var stroke = new List<SignaturePoint>();
            foreach (var pointElement in strokeElement.EnumerateArray())
            {
                if (pointElement.ValueKind != JsonValueKind.Object)
                    throw new Exceptions.SignatureValidationException("Each point must be an object with x and y.");

                if (!pointElement.TryGetProperty("x", out var xProp) ||
                    !pointElement.TryGetProperty("y", out var yProp) ||
                    !xProp.TryGetSingle(out var x) ||
                    !yProp.TryGetSingle(out var y))
                {
                    throw new Exceptions.SignatureValidationException("Each point must include numeric x and y values.");
                }

                stroke.Add(new SignaturePoint(x, y));
            }

            if (stroke.Count > 0)
                result.Add(stroke);
        }

        return result;
    }
}

public readonly record struct SignaturePoint(float X, float Y);
