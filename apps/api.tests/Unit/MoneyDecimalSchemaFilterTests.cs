using FluentAssertions;
using Microsoft.OpenApi.Models;
using SplitRail.Api.Serialization;
using Swashbuckle.AspNetCore.SwaggerGen;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class MoneyDecimalSchemaFilterTests
{
    private readonly MoneyDecimalSchemaFilter _filter = new();

    [Fact]
    public void Apply_DecimalSchema_SetsTypeStringAndClearsFormat()
    {
        var schema = new OpenApiSchema { Type = "number", Format = "double" };
        var context = new SchemaFilterContext(typeof(decimal), null, null);

        _filter.Apply(schema, context);

        schema.Type.Should().Be("string");
        schema.Format.Should().BeNull();
    }

    [Fact]
    public void Apply_NullableDecimalSchema_SetsTypeStringAndClearsFormat()
    {
        var schema = new OpenApiSchema { Type = "number", Format = "double", Nullable = true };
        var context = new SchemaFilterContext(typeof(decimal?), null, null);

        _filter.Apply(schema, context);

        schema.Type.Should().Be("string");
        schema.Format.Should().BeNull();
        schema.Nullable.Should().BeTrue();
    }

    [Fact]
    public void Apply_NonDecimalSchema_LeavesSchemaUnchanged()
    {
        var schema = new OpenApiSchema { Type = "integer", Format = "int32" };
        var context = new SchemaFilterContext(typeof(int), null, null);

        _filter.Apply(schema, context);

        schema.Type.Should().Be("integer");
        schema.Format.Should().Be("int32");
    }
}
