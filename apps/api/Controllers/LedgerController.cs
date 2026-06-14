using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/events/{eventId:guid}")]
[Authorize]
public class LedgerController : ControllerBase
{
    private readonly LedgerService _ledgerService;

    public LedgerController(LedgerService ledgerService) => _ledgerService = ledgerService;

    [HttpGet("ledger")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<LedgerGridResponse>> GetLedger(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _ledgerService.GetLedgerAsync(venueId, eventId, cancellationToken));

    [HttpPost("recalculate")]
    public async Task<ActionResult<LedgerGridResponse>> Recalculate(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _ledgerService.RecalculateAsync(venueId, eventId, cancellationToken));

    [HttpPost("lock-budget")]
    [RequirePermission(PermissionNames.LockBudget)]
    public async Task<ActionResult<EventResponse>> LockBudget(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _ledgerService.LockBudgetAsync(venueId, eventId, cancellationToken));

    [HttpPost("line-items")]
    public async Task<ActionResult<LineItemDto>> CreateLineItem(
        Guid venueId,
        Guid eventId,
        CreateLineItemRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ledgerService.CreateLineItemAsync(venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("line-items/{lineItemId:guid}")]
    public async Task<ActionResult<LineItemDto>> UpdateLineItem(
        Guid venueId,
        Guid eventId,
        Guid lineItemId,
        UpdateLineItemRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _ledgerService.UpdateLineItemAsync(venueId, eventId, lineItemId, request, cancellationToken));

    [HttpDelete("line-items/{lineItemId:guid}")]
    public async Task<IActionResult> DeleteLineItem(
        Guid venueId,
        Guid eventId,
        Guid lineItemId,
        CancellationToken cancellationToken)
    {
        await _ledgerService.DeleteLineItemAsync(venueId, eventId, lineItemId, cancellationToken);
        return NoContent();
    }

    [HttpPost("artists")]
    public async Task<ActionResult<EventArtistDto>> CreateArtist(
        Guid venueId,
        Guid eventId,
        CreateArtistRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ledgerService.CreateArtistAsync(venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("artists/{artistId:guid}")]
    public async Task<ActionResult<EventArtistDto>> UpdateArtist(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        UpdateArtistRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _ledgerService.UpdateArtistAsync(venueId, eventId, artistId, request, cancellationToken));

    [HttpDelete("artists/{artistId:guid}")]
    public async Task<IActionResult> DeleteArtist(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken)
    {
        await _ledgerService.DeleteArtistAsync(venueId, eventId, artistId, cancellationToken);
        return NoContent();
    }
}
