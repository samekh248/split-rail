using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SplitRail.Api.Authorization;
using SplitRail.Api.Configuration;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/events/{eventId:guid}")]
[Authorize]
public class QboSyncController : ControllerBase
{
    private readonly QboSyncService _syncService;
    private readonly QboMappingService _mappingService;

    public QboSyncController(QboSyncService syncService, QboMappingService mappingService)
    {
        _syncService = syncService;
        _mappingService = mappingService;
    }

    [HttpPost("sync")]
    [RequirePermission(PermissionNames.TriggerQboSync)]
    public async Task<ActionResult<SyncResultDto>> Sync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _syncService.SyncEventAsync(venueId, eventId, cancellationToken));

    [HttpGet("sync-status")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<SyncStatusDto>> GetSyncStatus(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _syncService.GetSyncStatusAsync(venueId, eventId, cancellationToken));

    [HttpGet("unmapped-transactions")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<UnmappedTransactionsResponse>> GetUnmappedTransactions(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _mappingService.GetUnmappedTransactionsAsync(venueId, eventId, cancellationToken));

    [HttpGet("unmapped-count")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<UnmappedCountDto>> GetUnmappedCount(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _mappingService.GetUnmappedCountAsync(venueId, eventId, cancellationToken));
}

[ApiController]
[Route("api/venues/{venueId:guid}")]
[Authorize]
public class QboMappingController : ControllerBase
{
    private readonly QboMappingService _mappingService;
    private readonly QboSyncService _syncService;

    public QboMappingController(QboMappingService mappingService, QboSyncService syncService)
    {
        _mappingService = mappingService;
        _syncService = syncService;
    }

    [HttpGet("qbo/status")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<VenueQboStatusDto>> GetVenueQboStatus(
        Guid venueId,
        CancellationToken cancellationToken) =>
        Ok(await _syncService.GetVenueQboStatusAsync(venueId, cancellationToken));

    [HttpPost("sync")]
    [RequirePermission(PermissionNames.TriggerQboSync)]
    public async Task<ActionResult<VenueSyncResultDto>> SyncVenue(
        Guid venueId,
        CancellationToken cancellationToken) =>
        Ok(await _syncService.SyncVenueEventsAsync(venueId, cancellationToken));

    [HttpGet("mappings")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<QboAccountMappingsResponse>> GetMappings(
        Guid venueId,
        CancellationToken cancellationToken) =>
        Ok(await _mappingService.GetMappingsAsync(venueId, cancellationToken));

    [HttpPost("mappings")]
    [RequirePermission(PermissionNames.MapQboAccounts)]
    public async Task<ActionResult<QboAccountMappingDto>> CreateMapping(
        Guid venueId,
        CreateMappingRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mappingService.CreateMappingAsync(venueId, request, cancellationToken);
        return Created($"/api/venues/{venueId}/mappings/{result.Id}", result);
    }

    [HttpPut("mappings/{mappingId:guid}")]
    [RequirePermission(PermissionNames.MapQboAccounts)]
    public async Task<ActionResult<QboAccountMappingDto>> UpdateMapping(
        Guid venueId,
        Guid mappingId,
        UpdateMappingRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _mappingService.UpdateMappingAsync(venueId, mappingId, request, cancellationToken));

    [HttpDelete("mappings/{mappingId:guid}")]
    [RequirePermission(PermissionNames.MapQboAccounts)]
    public async Task<IActionResult> DeleteMapping(
        Guid venueId,
        Guid mappingId,
        CancellationToken cancellationToken)
    {
        await _mappingService.DeleteMappingAsync(venueId, mappingId, cancellationToken);
        return NoContent();
    }
}

[ApiController]
[Route("api/internal")]
public class QboInternalSyncController : ControllerBase
{
    private readonly QboSyncService _syncService;
    private readonly IInternalSyncTriggerAuthenticator _triggerAuth;
    private readonly ILogger<QboInternalSyncController> _logger;

    public QboInternalSyncController(
        QboSyncService syncService,
        IInternalSyncTriggerAuthenticator triggerAuth,
        ILogger<QboInternalSyncController> logger)
    {
        _syncService = syncService;
        _triggerAuth = triggerAuth;
        _logger = logger;
    }

    [HttpPost("qbo-sync-trigger")]
    public async Task<IActionResult> TriggerSync(
        [FromHeader(Name = "X-Internal-Sync-Key")] string? syncKey,
        CancellationToken cancellationToken)
    {
        var authFailure = await _triggerAuth.AuthorizeAsync(HttpContext, syncKey, cancellationToken);
        if (authFailure is not null)
        {
            _logger.LogWarning(
                "Rejected internal QBO sync trigger: outcome={Outcome}",
                authFailure is StatusCodeResult { StatusCode: StatusCodes.Status401Unauthorized }
                    ? "rejected-unauthorized"
                    : "rejected-forbidden");
            return authFailure;
        }

        var triggerSource = Request.Headers.ContainsKey("Authorization") ? "scheduler" : "dev-key";
        var started = DateTimeOffset.UtcNow;

        var count = await _syncService.SyncAllEligibleEventsAsync(cancellationToken);

        var durationMs = (DateTimeOffset.UtcNow - started).TotalMilliseconds;
        _logger.LogInformation(
            "Internal QBO sync trigger completed: triggerSource={TriggerSource} eventsSynced={EventsSynced} durationMs={DurationMs} outcome={Outcome}",
            triggerSource,
            count,
            durationMs,
            "accepted");

        return Accepted(new { eventsSynced = count });
    }
}
