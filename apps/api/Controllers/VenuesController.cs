using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues")]
[Authorize]
public class VenuesController : ControllerBase
{
    private readonly VenueService _venueService;

    public VenuesController(VenueService venueService) => _venueService = venueService;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VenueResponse>>> List(CancellationToken cancellationToken) =>
        Ok(await _venueService.ListAccessibleVenuesAsync(cancellationToken));

    [HttpPost]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<VenueResponse>> Create(
        CreateVenueRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _venueService.CreateVenueAsync(request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("{venueId:guid}")]
    public async Task<ActionResult<VenueResponse>> Get(Guid venueId, CancellationToken cancellationToken)
    {
        var venue = await _venueService.GetVenueByIdAsync(venueId, cancellationToken);
        return venue is null ? NotFound() : Ok(venue);
    }

    [HttpPut("{venueId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<VenueResponse>> Update(
        Guid venueId,
        UpdateVenueRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _venueService.UpdateVenueAsync(venueId, request, cancellationToken));

    [HttpDelete("{venueId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<IActionResult> Delete(Guid venueId, CancellationToken cancellationToken)
    {
        await _venueService.DeleteVenueAsync(venueId, cancellationToken);
        return NoContent();
    }
}
