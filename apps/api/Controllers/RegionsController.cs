using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Regions;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/regions")]
[Authorize]
public class RegionsController : ControllerBase
{
    private readonly RegionService _regionService;

    public RegionsController(RegionService regionService) => _regionService = regionService;

    [HttpGet]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<RegionResponse>>> List(CancellationToken cancellationToken) =>
        Ok(await _regionService.ListRegionsAsync(cancellationToken));

    [HttpPost]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<RegionResponse>> Create(
        CreateRegionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _regionService.CreateRegionAsync(request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPatch("{regionId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<RegionResponse>> Update(
        Guid regionId,
        UpdateRegionRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _regionService.UpdateRegionAsync(regionId, request, cancellationToken));

    [HttpDelete("{regionId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<IActionResult> Delete(Guid regionId, CancellationToken cancellationToken)
    {
        await _regionService.DeleteRegionAsync(regionId, cancellationToken);
        return NoContent();
    }
}
