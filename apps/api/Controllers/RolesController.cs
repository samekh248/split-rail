using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly RoleService _roleService;

    public RolesController(RoleService roleService) => _roleService = roleService;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> List(CancellationToken cancellationToken) =>
        Ok(await _roleService.ListRolesAsync(cancellationToken));

    [HttpPatch("{roleId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<RoleResponse>> Update(
        Guid roleId,
        UpdateRoleRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _roleService.UpdateRoleAsync(roleId, request, cancellationToken));
}
