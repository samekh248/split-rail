using SplitRail.Api.Configuration;

namespace SplitRail.Api.Middleware;

public class ContentSecurityPolicyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHostEnvironment _environment;

    public ContentSecurityPolicyMiddleware(RequestDelegate next, IHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var policy = ContentSecurityPolicyOptions.GetPolicyForEnvironment(_environment.IsDevelopment());

        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey("Content-Security-Policy"))
                context.Response.Headers["Content-Security-Policy"] = policy;

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
