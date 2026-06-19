using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;

    public DashboardController(DashboardService dashboardService) =>
        _dashboardService = dashboardService;

    [HttpGet]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<DashboardResponse>> Get(
        Guid venueId,
        CancellationToken cancellationToken) =>
        Ok(await _dashboardService.GetDashboardAsync(venueId, cancellationToken));
}
