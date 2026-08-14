using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

/// <summary>
/// Isolated sub-settlement sheets, preflight, atomic finalize, reopen, and artist rollup.
/// Responses never include master-ledger totals or other blocks' terms (spec FR-026).
/// </summary>
[ApiController]
[Route("api/venues/{venueId:guid}/festivals/{eventId:guid}")]
[Authorize]
public class BlockSettlementsController : ControllerBase
{
    private readonly BlockSettlementService _settlements;

    public BlockSettlementsController(BlockSettlementService settlements) =>
        _settlements = settlements;

    [HttpGet("blocks/{blockId:guid}/settlement")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<BlockSettlementSheetResponse>> GetSheet(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.GetSheetAsync(venueId, eventId, blockId, cancellationToken));

    [HttpPut("blocks/{blockId:guid}/settlement/deal-terms")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<BlockSettlementSheetResponse>> UpdateDealTerms(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        UpdateBlockDealTermsRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.UpdateDealTermsAsync(
            venueId, eventId, blockId, request, cancellationToken));

    [HttpPost("blocks/{blockId:guid}/settlement/line-items")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<BlockSettlementLineItemDto>> AddLineItem(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CreateBlockSettlementLineItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settlements.AddLineItemAsync(
            venueId, eventId, blockId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpDelete("blocks/{blockId:guid}/settlement/line-items/{lineItemId:guid}")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<IActionResult> DeleteLineItem(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        Guid lineItemId,
        CancellationToken cancellationToken)
    {
        await _settlements.DeleteLineItemAsync(
            venueId, eventId, blockId, lineItemId, cancellationToken);
        return NoContent();
    }

    [HttpGet("blocks/{blockId:guid}/settlement/preflight")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<FinalizePreflightResponse>> GetPreflight(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.GetPreflightAsync(venueId, eventId, blockId, cancellationToken));

    [HttpPost("blocks/{blockId:guid}/settlement/finalize")]
    [RequirePermission(PermissionNames.FinalizeSettlements)]
    public async Task<ActionResult<BlockSettlementResultDto>> Finalize(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        FinalizeBlockSettlementRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.FinalizeAsync(
            venueId, eventId, blockId, request, cancellationToken));

    [HttpPost("blocks/{blockId:guid}/settlement/reopen")]
    [RequirePermission(PermissionNames.OverrideSettlements)]
    public async Task<ActionResult<BlockSettlementSheetResponse>> Reopen(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        ReopenBlockSettlementRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.ReopenAsync(
            venueId, eventId, blockId, request, cancellationToken));

    [HttpPost("blocks/{blockId:guid}/settlement/adjustments")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<BlockSettlementLineItemDto>> AddAdjustment(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CreateBlockSettlementLineItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settlements.AddAdjustmentAsync(
            venueId, eventId, blockId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("my-blocks")]
    [RequirePermission(PermissionNames.FinalizeSettlements)]
    public async Task<ActionResult<IReadOnlyList<BlockWorkQueueItemDto>>> GetMyBlocks(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.GetMyBlocksAsync(venueId, eventId, cancellationToken));

    [HttpGet("artists/{artistId:guid}/settlement-rollup")]
    [RequirePermission(PermissionNames.AdjustSettlements)]
    public async Task<ActionResult<ArtistSettlementRollupDto>> GetArtistRollup(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken) =>
        Ok(await _settlements.GetArtistRollupAsync(
            venueId, eventId, artistId, cancellationToken));
}
