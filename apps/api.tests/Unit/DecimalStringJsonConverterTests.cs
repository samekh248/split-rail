using System.Text.Json;
using FluentAssertions;
using SplitRail.Api.Serialization;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class DecimalStringJsonConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        Converters = { new DecimalStringJsonConverter() }
    };

    [Fact]
    public void Write_FormatsDecimalAsStringWithTwoDecimals()
    {
        var json = JsonSerializer.Serialize(123.4m, Options);
        json.Should().Be("\"123.40\"");
    }

    [Fact]
    public void Read_ParsesStringToDecimal()
    {
        var result = JsonSerializer.Deserialize<decimal>("\"99.95\"", Options);
        result.Should().Be(99.95m);
    }

    [Fact]
    public void Read_ParsesNumberToDecimal()
    {
        var result = JsonSerializer.Deserialize<decimal>("42.5", Options);
        result.Should().Be(42.5m);
    }

    [Fact]
    public void Read_EmptyString_ReturnsZero()
    {
        var result = JsonSerializer.Deserialize<decimal>("\"\"", Options);
        result.Should().Be(0m);
    }

    [Fact]
    public void Read_WhitespaceString_ReturnsZero()
    {
        var result = JsonSerializer.Deserialize<decimal>("\"  \"", Options);
        result.Should().Be(0m);
    }

    [Fact]
    public void Read_InvalidToken_ThrowsJsonException()
    {
        var act = () => JsonSerializer.Deserialize<decimal>("true", Options);
        act.Should().Throw<JsonException>();
    }
}

public class NullableDecimalStringJsonConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        Converters = { new NullableDecimalStringJsonConverter() }
    };

    [Fact]
    public void Write_FormatsDecimalAsString()
    {
        var json = JsonSerializer.Serialize<decimal?>(50.1m, Options);
        json.Should().Be("\"50.10\"");
    }

    [Fact]
    public void Write_NullWritesNull()
    {
        var json = JsonSerializer.Serialize<decimal?>(null, Options);
        json.Should().Be("null");
    }

    [Fact]
    public void Read_ParsesStringToDecimal()
    {
        var result = JsonSerializer.Deserialize<decimal?>("\"75.25\"", Options);
        result.Should().Be(75.25m);
    }

    [Fact]
    public void Read_NullReturnsNull()
    {
        var result = JsonSerializer.Deserialize<decimal?>("null", Options);
        result.Should().BeNull();
    }

    [Fact]
    public void Read_EmptyString_ReturnsNull()
    {
        var result = JsonSerializer.Deserialize<decimal?>("\"\"", Options);
        result.Should().BeNull();
    }

    [Fact]
    public void Read_WhitespaceString_ReturnsNull()
    {
        var result = JsonSerializer.Deserialize<decimal?>("\"  \"", Options);
        result.Should().BeNull();
    }

    [Fact]
    public void Read_NumberReturnsDecimal()
    {
        var result = JsonSerializer.Deserialize<decimal?>("33", Options);
        result.Should().Be(33m);
    }

    [Fact]
    public void Read_InvalidToken_ThrowsJsonException()
    {
        var act = () => JsonSerializer.Deserialize<decimal?>("true", Options);
        act.Should().Throw<JsonException>();
    }
}
