using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/events/{eventId:guid}")]
[Authorize]
public class SettlementController : ControllerBase
{
    private readonly SettlementService _settlementService;

    public SettlementController(SettlementService settlementService) =>
        _settlementService = settlementService;

    [HttpPost("settle")]
    [RequirePermission(PermissionNames.SignSettlement)]
    public async Task<ActionResult<SettlementResultDto>> FinalizeSettlement(
        Guid venueId,
        Guid eventId,
        FinalizeSettlementRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settlementService.FinalizeAsync(venueId, eventId, request, cancellationToken));

    [HttpPost("reverse-settlement")]
    [RequirePermission(PermissionNames.ReverseSettlement)]
    public async Task<ActionResult<SettlementResultDto>> ReverseSettlement(
        Guid venueId,
        Guid eventId,
        ReverseSettlementRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _settlementService.ReverseAsync(venueId, eventId, request, cancellationToken));

    [HttpGet("settlement-pdf")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<SettlementPdfLinkDto>> GetSettlementPdfLink(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _settlementService.GetPdfLinkAsync(venueId, eventId, cancellationToken));

    [HttpPost("reconcile")]
    [RequirePermission(PermissionNames.TriggerQboSync)]
    public async Task<ActionResult<EventResponse>> Reconcile(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _settlementService.ReconcileAsync(venueId, eventId, cancellationToken));
}
