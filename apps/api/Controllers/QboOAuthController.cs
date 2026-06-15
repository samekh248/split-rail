using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SplitRail.Api.Authorization;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/qbo")]
[Authorize]
public class QboOAuthController : ControllerBase
{
    private const string StateProtectorPurpose = "QboOAuthState";

    private readonly QboTokenService _tokenService;
    private readonly VenueService _venueService;
    private readonly ITenantContext _tenantContext;
    private readonly QboSyncOptions _options;
    private readonly IDataProtector _stateProtector;

    public QboOAuthController(
        QboTokenService tokenService,
        VenueService venueService,
        ITenantContext tenantContext,
        IOptions<QboSyncOptions> options,
        IDataProtectionProvider dataProtectionProvider)
    {
        _tokenService = tokenService;
        _venueService = venueService;
        _tenantContext = tenantContext;
        _options = options.Value;
        _stateProtector = dataProtectionProvider.CreateProtector(StateProtectorPurpose);
    }

    [HttpGet("connect")]
    [RequirePermission(PermissionNames.MapQboAccounts)]
    public async Task<IActionResult> Connect(Guid venueId, CancellationToken cancellationToken)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var state = _stateProtector.Protect($"{venueId}:{Guid.NewGuid():N}");
        var authUrl =
            $"{_options.IntuitAuthBaseUrl}?client_id={Uri.EscapeDataString(_options.ClientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(_options.RedirectUri)}" +
            "&response_type=code&scope=com.intuit.quickbooks.accounting" +
            $"&state={Uri.EscapeDataString(state)}";

        return Redirect(authUrl);
    }

    [HttpGet("callback")]
    [AllowAnonymous]
    [Route("/api/qbo/callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? realmId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) || string.IsNullOrEmpty(realmId))
            throw new ValidationException("Missing OAuth callback parameters.");

        var unprotectedState = _stateProtector.Unprotect(state);
        var venueId = Guid.Parse(unprotectedState.Split(':')[0]);

        var (accessToken, refreshToken, expiresAt) = await _tokenService.ExchangeCodeAsync(code, cancellationToken);
        await _tokenService.StoreTokensAsync(
            venueId,
            realmId,
            accessToken,
            refreshToken,
            expiresAt,
            _tenantContext.UserId,
            cancellationToken);

        return Redirect($"/?venueId={venueId}&qboConnected=true");
    }

    [HttpPost("disconnect")]
    [RequirePermission(PermissionNames.MapQboAccounts)]
    public async Task<IActionResult> Disconnect(Guid venueId, CancellationToken cancellationToken)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);
        await _tokenService.DisconnectAsync(venueId, cancellationToken);
        return NoContent();
    }

    private async Task EnsureVenueAccessibleAsync(Guid venueId, CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");
    }
}
