using Microsoft.Extensions.Logging;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class FrozenEventMutationAuditor
{
    private const string DefaultExceptionMessage =
        "Event is settled or reconciled and cannot be modified.";

    private readonly ILogger<FrozenEventMutationAuditor> _logger;

    public FrozenEventMutationAuditor(ILogger<FrozenEventMutationAuditor> logger)
    {
        _logger = logger;
    }

    public void RejectIfFrozen(Event evt, Guid venueId, Guid? userId, string operation) =>
        RejectIfFrozen(evt, venueId, userId, operation, DefaultExceptionMessage);

    public void RejectIfFrozen(
        Event evt,
        Guid venueId,
        Guid? userId,
        string operation,
        string exceptionMessage)
    {
        if (evt.Status is not (EventStatus.Settled or EventStatus.Reconciled))
            return;

        var eventStatus = EventStatusFormat.ToApiString(evt.Status);
        _logger.LogWarning(
            "Rejected frozen event mutation: {Operation} on event {EventId} at venue {VenueId} by user {UserId} (status {EventStatus})",
            operation,
            evt.Id,
            venueId,
            userId,
            eventStatus);

        throw new LedgerStateException(exceptionMessage);
    }
}
