using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/events")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly EventService _eventService;
    private readonly EventPinService _eventPinService;

    public EventsController(EventService eventService, EventPinService eventPinService)
    {
        _eventService = eventService;
        _eventPinService = eventPinService;
    }

    [HttpPost]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<EventResponse>> Create(
        Guid venueId,
        CreateEventRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _eventService.CreateEventAsync(venueId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<EventResponse>>> List(
        Guid venueId,
        CancellationToken cancellationToken) =>
        Ok(await _eventService.ListEventsAsync(venueId, cancellationToken));

    [HttpGet("{eventId:guid}")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<EventResponse>> Get(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var evt = await _eventService.GetEventAsync(venueId, eventId, cancellationToken);
        return evt is null ? NotFound() : Ok(evt);
    }

    [HttpPatch("{eventId:guid}")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<EventResponse>> Update(
        Guid venueId,
        Guid eventId,
        UpdateEventRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _eventService.UpdateEventMetadataAsync(venueId, eventId, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{eventId:guid}")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<IActionResult> Delete(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await _eventService.DeleteEventAsync(venueId, eventId, cancellationToken);
        return NoContent();
    }

    [HttpPut("{eventId:guid}/pin")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<IActionResult> Pin(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await _eventPinService.PinEventAsync(venueId, eventId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{eventId:guid}/pin")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<IActionResult> Unpin(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await _eventPinService.UnpinEventAsync(venueId, eventId, cancellationToken);
        return NoContent();
    }
}
