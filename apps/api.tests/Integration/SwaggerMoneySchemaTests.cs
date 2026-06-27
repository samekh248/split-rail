using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SwaggerMoneySchemaTests : IntegrationTestBase
{
    [Fact]
    public async Task SwaggerJson_LineItemDto_MoneyFieldsAreStrings()
    {
        var response = await Client.GetAsync("/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var properties = doc.RootElement
            .GetProperty("components")
            .GetProperty("schemas")
            .GetProperty("LineItemDto")
            .GetProperty("properties");

        AssertMoneyProperty(properties, "proformaValue", nullable: false);
        AssertMoneyProperty(properties, "settlementValue", nullable: false);
        AssertMoneyProperty(properties, "qboActualValue", nullable: true);
        AssertMoneyProperty(properties, "variance", nullable: true);

        var sortOrder = properties.GetProperty("sortOrder");
        sortOrder.GetProperty("type").GetString().Should().Be("integer");
        sortOrder.TryGetProperty("format", out _).Should().BeTrue();
    }

    [Fact]
    public async Task SwaggerJson_LedgerSummaryDto_MoneyFieldsAreStrings()
    {
        var response = await Client.GetAsync("/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var properties = doc.RootElement
            .GetProperty("components")
            .GetProperty("schemas")
            .GetProperty("LedgerSummaryDto")
            .GetProperty("properties");

        AssertMoneyProperty(properties, "grossRevenue", nullable: false);
        AssertMoneyProperty(properties, "totalDeductions", nullable: false);
        AssertMoneyProperty(properties, "netShowRevenue", nullable: false);
    }

    private static void AssertMoneyProperty(JsonElement properties, string name, bool nullable)
    {
        var property = properties.GetProperty(name);
        property.GetProperty("type").GetString().Should().Be("string");
        property.TryGetProperty("format", out var format).Should().BeFalse(
            because: $"{name} must not carry a numeric format");

        if (nullable)
            property.GetProperty("nullable").GetBoolean().Should().BeTrue();
        else
            property.TryGetProperty("nullable", out _).Should().BeFalse();
    }
}
