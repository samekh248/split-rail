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

    public QboMappingController(QboMappingService mappingService) => _mappingService = mappingService;

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
    private readonly QboSyncOptions _options;

    public QboInternalSyncController(QboSyncService syncService, IOptions<QboSyncOptions> options)
    {
        _syncService = syncService;
        _options = options.Value;
    }

    [HttpPost("qbo-sync-trigger")]
    public async Task<IActionResult> TriggerSync(
        [FromHeader(Name = "X-Internal-Sync-Key")] string? syncKey,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_options.InternalTriggerKey) ||
            !string.Equals(syncKey, _options.InternalTriggerKey, StringComparison.Ordinal))
            return Unauthorized();

        var count = await _syncService.SyncAllEligibleEventsAsync(cancellationToken);
        return Accepted(new { eventsSynced = count });
    }
}
