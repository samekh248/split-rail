using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/venues/{venueId:guid}/festivals")]
[Authorize]
public class FestivalsController : ControllerBase
{
    private readonly FestivalService _festivalService;
    private readonly StageZoneService _stageZoneService;
    private readonly ProgrammingBlockService _blockService;
    private readonly ProgrammingBlockPinService _blockPinService;
    private readonly FestivalArtistService _artistService;
    private readonly FestivalItineraryService _itineraryService;

    public FestivalsController(
        FestivalService festivalService,
        StageZoneService stageZoneService,
        ProgrammingBlockService blockService,
        ProgrammingBlockPinService blockPinService,
        FestivalArtistService artistService,
        FestivalItineraryService itineraryService)
    {
        _festivalService = festivalService;
        _stageZoneService = stageZoneService;
        _blockService = blockService;
        _blockPinService = blockPinService;
        _artistService = artistService;
        _itineraryService = itineraryService;
    }

    [HttpPost]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<FestivalResponse>> Create(
        Guid venueId,
        CreateFestivalRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _festivalService.CreateAsync(venueId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("{eventId:guid}")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<FestivalResponse>> Get(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _festivalService.GetAsync(venueId, eventId, cancellationToken));

    [HttpPut("{eventId:guid}")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<FestivalResponse>> Update(
        Guid venueId,
        Guid eventId,
        UpdateFestivalRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _festivalService.UpdateAsync(venueId, eventId, request, cancellationToken));

    [HttpPost("{eventId:guid}/revert-to-standard")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<IActionResult> RevertToStandard(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        await _festivalService.RevertToStandardAsync(venueId, eventId, cancellationToken);
        return NoContent();
    }

    [HttpGet("{eventId:guid}/stages")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<StageZoneResponse>>> ListStages(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _stageZoneService.ListAsync(venueId, eventId, cancellationToken));

    [HttpPost("{eventId:guid}/stages")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<StageZoneResponse>> CreateStage(
        Guid venueId,
        Guid eventId,
        CreateStageZoneRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _stageZoneService.CreateAsync(venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("{eventId:guid}/stages/{stageId:guid}")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<StageZoneResponse>> UpdateStage(
        Guid venueId,
        Guid eventId,
        Guid stageId,
        UpdateStageZoneRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _stageZoneService.UpdateAsync(venueId, eventId, stageId, request, cancellationToken));

    [HttpDelete("{eventId:guid}/stages/{stageId:guid}")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<IActionResult> DeleteStage(
        Guid venueId,
        Guid eventId,
        Guid stageId,
        CancellationToken cancellationToken)
    {
        await _stageZoneService.DeleteAsync(venueId, eventId, stageId, cancellationToken);
        return NoContent();
    }

    // ---- Programming blocks ---------------------------------------------

    [HttpPost("{eventId:guid}/blocks")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<ProgrammingBlockResponse>> CreateBlock(
        Guid venueId,
        Guid eventId,
        CreateProgrammingBlockRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _blockService.CreateAsync(venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("{eventId:guid}/blocks/{blockId:guid}")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<ProgrammingBlockResponse>> UpdateBlock(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        UpdateProgrammingBlockRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _blockService.UpdateAsync(venueId, eventId, blockId, request, cancellationToken));

    [HttpPost("{eventId:guid}/blocks/{blockId:guid}/status")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<ProgrammingBlockResponse>> SetBlockStatus(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        SetBlockStatusRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _blockService.SetStatusAsync(venueId, eventId, blockId, request, cancellationToken));

    [HttpPost("{eventId:guid}/blocks/{blockId:guid}/booking-status")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<ProgrammingBlockResponse>> SetBlockBookingStatus(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        SetBlockBookingStatusRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _blockService.SetBookingStatusAsync(
            venueId, eventId, blockId, request, cancellationToken));

    [HttpGet("{eventId:guid}/blocks/{blockId:guid}/history")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<FestivalAuditEntryResponse>>> GetBlockHistory(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken) =>
        Ok(await _blockService.GetHistoryAsync(venueId, eventId, blockId, cancellationToken));

    [HttpDelete("{eventId:guid}/blocks/{blockId:guid}")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<IActionResult> DeleteBlock(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken)
    {
        await _blockService.DeleteAsync(venueId, eventId, blockId, cancellationToken);
        return NoContent();
    }

    [HttpPut("{eventId:guid}/blocks/{blockId:guid}/pin")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<IActionResult> PinBlock(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken)
    {
        await _blockPinService.PinAsync(venueId, eventId, blockId, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{eventId:guid}/blocks/{blockId:guid}/pin")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<IActionResult> UnpinBlock(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken)
    {
        await _blockPinService.UnpinAsync(venueId, eventId, blockId, cancellationToken);
        return NoContent();
    }

    // ---- Itinerary -------------------------------------------------------

    [HttpGet("{eventId:guid}/itinerary")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<ItineraryResponse>> GetItinerary(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? view = null,
        [FromQuery] string? day = null,
        [FromQuery] Guid? stageZoneId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? status = null)
    {
        if (string.Equals(view, "public", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(await _itineraryService.GetPublicAsync(
                venueId, eventId, day, stageZoneId, category, cancellationToken));
        }

        return Ok(await _itineraryService.GetInternalAsync(
            venueId, eventId, day, stageZoneId, category, status, cancellationToken));
    }

    [HttpGet("{eventId:guid}/itinerary/public")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<PublicItineraryResponse>> GetPublicItinerary(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? day = null,
        [FromQuery] Guid? stageZoneId = null,
        [FromQuery] string? category = null) =>
        Ok(await _itineraryService.GetPublicAsync(
            venueId, eventId, day, stageZoneId, category, cancellationToken));

    [HttpPost("{eventId:guid}/itinerary/publish-visibility")]
    [RequirePermission(PermissionNames.PublishPublicItinerary)]
    public async Task<IActionResult> SetPublishVisibility(
        Guid venueId,
        Guid eventId,
        SetPublishVisibilityRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _itineraryService.SetPublishVisibilityAsync(
            venueId, eventId, request, cancellationToken);
        return Ok(new { updated });
    }

    // ---- Artists ---------------------------------------------------------

    [HttpGet("{eventId:guid}/artists")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<FestivalArtistResponse>>> ListArtists(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _artistService.ListAsync(venueId, eventId, cancellationToken));

    [HttpPost("{eventId:guid}/artists")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<ActionResult<FestivalArtistResponse>> CreateArtist(
        Guid venueId,
        Guid eventId,
        CreateFestivalArtistRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _artistService.CreateAsync(venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("{eventId:guid}/artists/{artistId:guid}/appearances")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<ArtistAppearanceDto>>> GetArtistAppearances(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken) =>
        Ok(await _artistService.GetAppearancesAsync(venueId, eventId, artistId, cancellationToken));

    [HttpPost("{eventId:guid}/artists/{artistId:guid}/copy-deal-terms")]
    [RequirePermission(PermissionNames.ManageFestivalSchedule)]
    public async Task<IActionResult> CopyDealTerms(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CopyDealTermsRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _artistService.CopyDealTermsAsync(
            venueId, eventId, artistId, request, cancellationToken);
        return Ok(new { updated });
    }
}
