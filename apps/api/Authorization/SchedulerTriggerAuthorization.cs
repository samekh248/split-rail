using Microsoft.AspNetCore.Authorization;
using SplitRail.Api.Configuration;

namespace SplitRail.Api.Authorization;

public sealed class SchedulerTriggerRequirement : IAuthorizationRequirement;

public sealed class SchedulerTriggerAuthorizationHandler : AuthorizationHandler<SchedulerTriggerRequirement>
{
    private readonly QboSyncOptions _options;

    public SchedulerTriggerAuthorizationHandler(Microsoft.Extensions.Options.IOptions<QboSyncOptions> options)
    {
        _options = options.Value;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SchedulerTriggerRequirement requirement)
    {
        var email = context.User.FindFirst("email")?.Value
            ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

        if (!string.IsNullOrEmpty(email)
            && !string.IsNullOrEmpty(_options.SchedulerServiceAccountEmail)
            && string.Equals(email, _options.SchedulerServiceAccountEmail, StringComparison.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
