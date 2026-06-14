using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/organizations")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly OrganizationService _organizationService;

    public OrganizationsController(OrganizationService organizationService) =>
        _organizationService = organizationService;

    [HttpPost]
    public async Task<ActionResult<OrganizationResponse>> Create(
        CreateOrganizationRequest request,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        var result = await _organizationService.CreateOrganizationAsync(request, userId, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("current")]
    public async Task<ActionResult<OrganizationResponse>> GetCurrent(CancellationToken cancellationToken) =>
        Ok(await _organizationService.GetCurrentOrganizationAsync(cancellationToken));
}
