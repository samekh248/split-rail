using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SplitRail.Api.Authorization;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Services;

namespace SplitRail.Api.Controllers;

/// <summary>
/// Master festival ledger surfaces: revenue buckets, revenue allocations, and rule-based
/// expense splits. Read access requires full financial visibility; mutation requires
/// allocation authority (spec FR-035, FR-036).
/// </summary>
[ApiController]
[Route("api/venues/{venueId:guid}/festivals/{eventId:guid}")]
[Authorize]
public class FestivalFinancialsController : ControllerBase
{
    private readonly FestivalAllocationService _allocationService;
    private readonly FestivalQboService _qboService;

    public FestivalFinancialsController(
        FestivalAllocationService allocationService,
        FestivalQboService qboService)
    {
        _allocationService = allocationService;
        _qboService = qboService;
    }

    [HttpGet("buckets")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<RevenueBucketResponse>>> ListBuckets(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken) =>
        Ok(await _allocationService.ListBucketsAsync(venueId, eventId, cancellationToken));

    [HttpPost("buckets")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<RevenueBucketResponse>> CreateBucket(
        Guid venueId,
        Guid eventId,
        CreateRevenueBucketRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.CreateBucketAsync(
            venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("buckets/{bucketId:guid}")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<RevenueBucketResponse>> UpdateBucket(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        UpdateRevenueBucketRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _allocationService.UpdateBucketAsync(
            venueId, eventId, bucketId, request, cancellationToken));

    [HttpDelete("buckets/{bucketId:guid}")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<IActionResult> DeleteBucket(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        CancellationToken cancellationToken)
    {
        await _allocationService.DeleteBucketAsync(venueId, eventId, bucketId, cancellationToken);
        return NoContent();
    }

    [HttpGet("buckets/{bucketId:guid}/allocations")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<RevenueAllocationResponse>>> ListAllocations(
        Guid venueId,
        Guid eventId,
        Guid bucketId,
        CancellationToken cancellationToken) =>
        Ok(await _allocationService.ListAllocationsAsync(
            venueId, eventId, bucketId, cancellationToken));

    [HttpPost("allocations")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<RevenueAllocationResponse>> CreateAllocation(
        Guid venueId,
        Guid eventId,
        CreateRevenueAllocationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.CreateAllocationAsync(
            venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpPut("allocations/{allocationId:guid}")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<RevenueAllocationResponse>> UpdateAllocation(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        UpdateRevenueAllocationRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _allocationService.UpdateAllocationAsync(
            venueId, eventId, allocationId, request, cancellationToken));

    [HttpDelete("allocations/{allocationId:guid}")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<IActionResult> DeleteAllocation(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        CancellationToken cancellationToken)
    {
        await _allocationService.DeleteAllocationAsync(
            venueId, eventId, allocationId, cancellationToken);
        return NoContent();
    }

    [HttpGet("expense-allocations")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<ExpenseAllocationResponse>>> ListExpenseAllocations(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? sourceType = null,
        [FromQuery] string? targetType = null) =>
        Ok(await _allocationService.ListExpenseAllocationsAsync(
            venueId, eventId, sourceType, targetType, cancellationToken));

    [HttpPost("expense-allocations")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<ExpenseAllocationResponse>> CreateExpenseAllocation(
        Guid venueId,
        Guid eventId,
        CreateExpenseAllocationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.CreateExpenseAllocationAsync(
            venueId, eventId, request, cancellationToken);
        return Created(string.Empty, result);
    }

    [HttpGet("expense-allocations/summary")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<ExpenseSourceSummaryResponse>> GetExpenseSummary(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] Guid? sourceLineItemId = null,
        [FromQuery] Guid? sourceQboTransactionId = null) =>
        Ok(await _allocationService.GetExpenseSourceSummaryAsync(
            venueId, eventId, sourceLineItemId, sourceQboTransactionId, cancellationToken));

    [HttpDelete("expense-allocations/{allocationId:guid}")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<IActionResult> DeleteExpenseAllocation(
        Guid venueId,
        Guid eventId,
        Guid allocationId,
        CancellationToken cancellationToken)
    {
        await _allocationService.DeleteExpenseAllocationAsync(
            venueId, eventId, allocationId, cancellationToken);
        return NoContent();
    }

    [HttpGet("qbo-transactions")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<IReadOnlyList<FestivalQboTransactionResponse>>> ListQboTransactions(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken,
        [FromQuery] string? reviewState = null,
        [FromQuery] string? allocationState = null) =>
        Ok(await _qboService.ListTransactionsAsync(
            venueId, eventId, reviewState, allocationState, cancellationToken));

    [HttpGet("blocks/{blockId:guid}/qbo-sources")]
    [RequirePermission(PermissionNames.ViewFinancials)]
    public async Task<ActionResult<BlockQboSourceTraceResponse>> GetBlockQboSources(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken) =>
        Ok(await _qboService.GetBlockSourceTransactionsAsync(
            venueId, eventId, blockId, cancellationToken));

    [HttpPost("qbo-transactions/{transactionId:guid}/review")]
    [RequirePermission(PermissionNames.ManageAllocations)]
    public async Task<ActionResult<QboReviewResolutionResponse>> ResolveQboReview(
        Guid venueId,
        Guid eventId,
        Guid transactionId,
        ResolveQboReviewRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _qboService.ResolveReviewAsync(
            venueId, eventId, transactionId, request, cancellationToken));
}
