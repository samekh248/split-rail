using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService) => _userService = userService;

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken cancellationToken) =>
        Ok(await _userService.GetProfileAsync(cancellationToken));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserListResponse>>> List(CancellationToken cancellationToken) =>
        Ok(await _userService.ListOrgUsersAsync(cancellationToken));

    [HttpPatch("{userId:guid}/role")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<ChangeRoleResponse>> ChangeRole(
        Guid userId,
        ChangeRoleRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _userService.ChangeUserRoleAsync(userId, request, cancellationToken));

    [HttpPut("{userId:guid}/venue-scopes")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<UpdateVenueScopesResponse>> UpdateVenueScopes(
        Guid userId,
        UpdateVenueScopesRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _userService.UpdateVenueScopesAsync(userId, request, cancellationToken));

    [HttpDelete("{userId:guid}")]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<IActionResult> Remove(Guid userId, CancellationToken cancellationToken)
    {
        await _userService.RemoveUserFromOrgAsync(userId, cancellationToken);
        return NoContent();
    }
}
