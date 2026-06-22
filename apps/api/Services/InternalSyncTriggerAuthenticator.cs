using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.Configuration;

namespace SplitRail.Api.Services;

public interface IInternalSyncTriggerAuthenticator
{
    Task<IActionResult?> AuthorizeAsync(HttpContext httpContext, string? syncKey, CancellationToken cancellationToken);
}

public sealed class InternalSyncTriggerAuthenticator : IInternalSyncTriggerAuthenticator
{
    public const string GoogleSchedulerScheme = "GoogleScheduler";

    private readonly IWebHostEnvironment _environment;
    private readonly QboSyncOptions _options;
    private readonly IAuthenticationService _authenticationService;
    private readonly IAuthorizationService _authorizationService;

    public InternalSyncTriggerAuthenticator(
        IWebHostEnvironment environment,
        Microsoft.Extensions.Options.IOptions<QboSyncOptions> options,
        IAuthenticationService authenticationService,
        IAuthorizationService authorizationService)
    {
        _environment = environment;
        _options = options.Value;
        _authenticationService = authenticationService;
        _authorizationService = authorizationService;
    }

    public async Task<IActionResult?> AuthorizeAsync(
        HttpContext httpContext,
        string? syncKey,
        CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
            return await AuthorizeProductionAsync(httpContext, cancellationToken);

        return AuthorizeDevelopment(syncKey);
    }

    private async Task<IActionResult?> AuthorizeProductionAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var authResult = await _authenticationService.AuthenticateAsync(
            httpContext,
            GoogleSchedulerScheme);

        if (!authResult.Succeeded || authResult.Principal is null)
            return new StatusCodeResult(StatusCodes.Status401Unauthorized);

        httpContext.User = authResult.Principal;

        var authorized = await _authorizationService.AuthorizeAsync(
            httpContext.User,
            null,
            "SchedulerTrigger");

        return authorized.Succeeded ? null : new StatusCodeResult(StatusCodes.Status403Forbidden);
    }

    private IActionResult? AuthorizeDevelopment(string? syncKey)
    {
        if (string.IsNullOrEmpty(_options.InternalTriggerKey)
            || !string.Equals(syncKey, _options.InternalTriggerKey, StringComparison.Ordinal))
            return new StatusCodeResult(StatusCodes.Status401Unauthorized);

        return null;
    }
}
