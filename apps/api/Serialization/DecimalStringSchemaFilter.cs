using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using SplitRail.Api.Serialization;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SplitRail.Api.Serialization;

public sealed class DecimalStringSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Properties is null || schema.Properties.Count == 0)
            return;

        foreach (var property in context.Type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!TryGetSchemaPropertyName(property, out var schemaPropertyName) ||
                !schema.Properties.TryGetValue(schemaPropertyName, out var propertySchema))
            {
                continue;
            }

            if (!ShouldSerializeAsDecimalString(property))
                continue;

            propertySchema.Type = "string";
            propertySchema.Format = null;
            propertySchema.Example = new OpenApiString("0.00");
        }
    }

    private static bool ShouldSerializeAsDecimalString(PropertyInfo property) =>
        UsesDecimalStringConverter(property) || IsDecimalProperty(property);

    private static bool IsDecimalProperty(PropertyInfo property) =>
        property.PropertyType == typeof(decimal) || property.PropertyType == typeof(decimal?);

    private static bool UsesDecimalStringConverter(PropertyInfo property) =>
        property.GetCustomAttributes<JsonConverterAttribute>(inherit: true)
            .Any(attribute =>
                attribute.ConverterType == typeof(DecimalStringJsonConverter) ||
                attribute.ConverterType == typeof(NullableDecimalStringJsonConverter));

    private static bool TryGetSchemaPropertyName(PropertyInfo property, out string schemaPropertyName)
    {
        var jsonName = property.GetCustomAttribute<JsonPropertyNameAttribute>(inherit: true)?.Name;
        schemaPropertyName = jsonName ?? JsonNamingPolicy.CamelCase.ConvertName(property.Name);
        return true;
    }
}
