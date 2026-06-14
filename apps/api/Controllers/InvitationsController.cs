using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/invitations")]
public class InvitationsController : ControllerBase
{
    private readonly InvitationService _invitationService;

    public InvitationsController(InvitationService invitationService) =>
        _invitationService = invitationService;

    [HttpPost]
    [Authorize]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<InvitationResponse>> Send(
        CreateInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var (response, _) = await _invitationService.SendInvitationAsync(request, cancellationToken);
        return Created(string.Empty, response);
    }

    [HttpGet]
    [Authorize]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<IReadOnlyList<InvitationResponse>>> List(CancellationToken cancellationToken) =>
        Ok(await _invitationService.ListInvitationsAsync(cancellationToken));

    [HttpPost("{invitationId:guid}/resend")]
    [Authorize]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<ActionResult<InvitationResponse>> Resend(
        Guid invitationId,
        CancellationToken cancellationToken)
    {
        var (response, _) = await _invitationService.ResendInvitationAsync(invitationId, cancellationToken);
        return Ok(response);
    }

    [HttpPost("accept")]
    [AllowAnonymous]
    public async Task<ActionResult<AcceptInvitationResponse>> Accept(
        AcceptInvitationRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _invitationService.AcceptInvitationAsync(request, cancellationToken));

    [HttpDelete("{invitationId:guid}")]
    [Authorize]
    [RequirePermission(PermissionNames.ManagePermissions)]
    public async Task<IActionResult> Cancel(Guid invitationId, CancellationToken cancellationToken)
    {
        await _invitationService.CancelInvitationAsync(invitationId, cancellationToken);
        return NoContent();
    }
}
