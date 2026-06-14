using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;

namespace SplitRail.Api.Middleware;

public class VenueContextMiddleware
{
    public const string HeaderName = "X-Active-Venue-Id";
    private readonly RequestDelegate _next;

    public VenueContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, VenueService venueService)
    {
        if (context.Request.Headers.TryGetValue(HeaderName, out var headerValue) &&
            Guid.TryParse(headerValue.FirstOrDefault(), out var venueId) &&
            tenantContext.UserId is Guid userId)
        {
            var accessible = await venueService.IsVenueAccessibleAsync(userId, venueId, context.RequestAborted);
            if (!accessible)
                throw new AuthorizationException("Access to the requested venue is denied.");

            tenantContext.SetActiveVenueId(venueId);
        }

        await _next(context);
    }
}
