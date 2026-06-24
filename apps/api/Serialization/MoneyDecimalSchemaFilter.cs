using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SplitRail.Api.Serialization;

public sealed class MoneyDecimalSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var underlying = Nullable.GetUnderlyingType(context.Type) ?? context.Type;
        if (underlying != typeof(decimal))
            return;

        schema.Type = "string";
        schema.Format = null;
    }
}
