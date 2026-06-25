using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Calendar;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly CalendarService _calendarService;

    public CalendarController(CalendarService calendarService) => _calendarService = calendarService;

    [HttpGet("placements")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<CalendarPlacementDto>>> GetPlacements(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] Guid? regionId,
        [FromQuery] Guid? venueId,
        [FromQuery] bool includeCancelled = false,
        CancellationToken cancellationToken = default) =>
        Ok(await _calendarService.GetPlacementsAsync(
            from,
            to,
            regionId,
            venueId,
            includeCancelled,
            cancellationToken));
}
