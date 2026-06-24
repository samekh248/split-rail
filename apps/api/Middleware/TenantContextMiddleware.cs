using System.Security.Claims;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;

namespace SplitRail.Api.Middleware;

public class TenantContextMiddleware
{
    private readonly RequestDelegate _next;

    public TenantContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? context.User.FindFirstValue("sub");
            var orgIdClaim = context.User.FindFirstValue("org_id");

            Guid? userId = Guid.TryParse(userIdClaim, out var uid) ? uid : null;
            Guid? orgId = Guid.TryParse(orgIdClaim, out var oid) ? oid : null;

            tenantContext.SetContext(userId, orgId);

            if (RequiresOrganization(context) && orgId is null)
                throw new AuthorizationException("User is not a member of an organization.");
        }

        await _next(context);
    }

    private static bool RequiresOrganization(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
            return false;
        if (path.Equals("/api/organizations", StringComparison.OrdinalIgnoreCase) &&
            (context.Request.Method == HttpMethods.Post || context.Request.Method == HttpMethods.Get))
            return false;
        if (path.StartsWith("/api/invitations/accept", StringComparison.OrdinalIgnoreCase))
            return false;
        if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
            return false;

        return path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
    }
}
