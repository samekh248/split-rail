using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/festivals/{eventId:guid}/reports")]
[Authorize]
public class FestivalReportsController : ControllerBase
{
    private readonly FestivalReportService _reportService;

    public FestivalReportsController(FestivalReportService reportService) =>
        _reportService = reportService;

    [HttpGet("pnl")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalPnlReportResponse>> GetPnl(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? category = null) =>
        Ok(await _reportService.GetPnlAsync(venueId, eventId, category, cancellationToken));

    [HttpGet("days")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalDayReportResponse>> GetDays(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null) =>
        Ok(await _reportService.GetDaysAsync(venueId, eventId, category, status, cancellationToken));

    [HttpGet("stages")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalStageReportResponse>> GetStages(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null) =>
        Ok(await _reportService.GetStagesAsync(venueId, eventId, category, status, cancellationToken));

    [HttpGet("settlement-status")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalSettlementStatusReportResponse>> GetSettlementStatus(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? category = null) =>
        Ok(await _reportService.GetSettlementStatusAsync(venueId, eventId, category, cancellationToken));

    [HttpGet("unreconciled")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalUnreconciledReportResponse>> GetUnreconciled(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _reportService.GetUnreconciledAsync(venueId, eventId, cancellationToken));

    [HttpGet("variance")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalVarianceReportResponse>> GetVariance(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null) =>
        Ok(await _reportService.GetVarianceAsync(venueId, eventId, category, status, cancellationToken));
}
