using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SplitRail.Api.Serialization;

public sealed class DecimalStringJsonConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s))
                return 0m;
            return decimal.Parse(s, CultureInfo.InvariantCulture);
        }

        if (reader.TokenType == JsonTokenType.Number)
            return reader.GetDecimal();

        throw new JsonException("Expected string or number for decimal value.");
    }

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("F2", CultureInfo.InvariantCulture));
}

public sealed class NullableDecimalStringJsonConverter : JsonConverter<decimal?>
{
    public override decimal? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s))
                return null;
            return decimal.Parse(s, CultureInfo.InvariantCulture);
        }

        if (reader.TokenType == JsonTokenType.Number)
            return reader.GetDecimal();

        throw new JsonException("Expected string, number, or null for decimal value.");
    }

    public override void Write(Utf8JsonWriter writer, decimal? value, JsonSerializerOptions options)
    {
        if (value is null)
            writer.WriteNullValue();
        else
            writer.WriteStringValue(value.Value.ToString("F2", CultureInfo.InvariantCulture));
    }
}
