using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.DTOs.Seeding;
using SplitRail.Api.Http;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

[ApiController]
[Route("api/test-seed")]
public class TestSeedingController : ControllerBase
{
    private readonly TestSeedingService _seedingService;
    private readonly QboEgressRecordingHandler? _egressHandler;
    private readonly PreviewOptions _previewOptions;

    public TestSeedingController(
        TestSeedingService seedingService,
        IOptions<PreviewOptions> previewOptions,
        QboEgressRecordingHandler? egressHandler = null)
    {
        _seedingService = seedingService;
        _previewOptions = previewOptions.Value;
        _egressHandler = egressHandler;
    }

    [HttpPost("reset")]
    public async Task<ActionResult<ResetSeedResponseDto>> Reset(CancellationToken cancellationToken) =>
        Ok(await _seedingService.ResetAsync(cancellationToken));

    [HttpPost("lifecycle-event")]
    public async Task<ActionResult<LifecycleEventSeedResponseDto>> SeedLifecycleEvent(
        LifecycleEventSeedRequestDto request,
        CancellationToken cancellationToken) =>
        Ok(await _seedingService.SeedLifecycleEventAsync(request, cancellationToken));

    [HttpPost("mutate-settled-event")]
    public async Task<ActionResult<MutateSettledEventResponseDto>> MutateSettledEvent(
        MutateSettledEventRequestDto request,
        CancellationToken cancellationToken) =>
        Ok(await _seedingService.MutateSettledEventAsync(request, cancellationToken));

    [HttpGet("qbo-egress")]
    public ActionResult<IReadOnlyList<QboEgressRecordDto>> GetQboEgress()
    {
        _seedingService.EnsureEnabled();

        if (_egressHandler is null)
            return Ok(Array.Empty<QboEgressRecordDto>());

        var records = _egressHandler.GetRecords()
            .Select(r => new QboEgressRecordDto(r.Method, r.Host, r.Timestamp))
            .ToList();
        return Ok(records);
    }

    [HttpGet("settlement-pdf/{*objectPath}")]
    public ActionResult GetSettlementPdf(string objectPath)
    {
        var bytes = _seedingService.GetSettlementPdfBytes(objectPath);
        if (bytes is null)
            return NotFound();
        return File(bytes, "application/pdf");
    }

    [HttpGet("settlement-hash/{eventId:guid}")]
    public async Task<ActionResult<SettlementPdfHashResponseDto>> GetSettlementHash(
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var result = await _seedingService.GetSettlementPdfHashAsync(eventId, cancellationToken);
        if (result is null)
            return NotFound();
        return Ok(result);
    }
}
