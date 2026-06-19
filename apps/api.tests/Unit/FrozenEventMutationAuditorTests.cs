using FluentAssertions;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FrozenEventMutationAuditorTests
{
    [Fact]
    public void RejectIfFrozen_SettledEvent_LogsWarningAndThrows()
    {
        var collector = new TestLogCollector();
        var auditor = CreateAuditor(collector);
        var eventId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var evt = new Event
        {
            Id = eventId,
            VenueId = venueId,
            Status = EventStatus.Settled
        };

        var act = () => auditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.UpdateLineItem);

        act.Should().Throw<LedgerStateException>()
            .WithMessage("Event is settled or reconciled and cannot be modified.");

        var entry = collector.Entries.Single(e => e.Level == LogLevel.Warning);
        entry.Message.Should().Contain("Rejected frozen event mutation");
        GetStateValue(entry, "Operation").Should().Be(FrozenEventMutationOperation.UpdateLineItem);
        GetStateValue(entry, "EventId").Should().Be(eventId);
        GetStateValue(entry, "VenueId").Should().Be(venueId);
        GetStateValue(entry, "UserId").Should().Be(userId);
        GetStateValue(entry, "EventStatus").Should().Be("SETTLED");
    }

    [Fact]
    public void RejectIfFrozen_PreShowEvent_NoLogNoThrow()
    {
        var collector = new TestLogCollector();
        var auditor = CreateAuditor(collector);
        var evt = new Event
        {
            Id = Guid.NewGuid(),
            VenueId = Guid.NewGuid(),
            Status = EventStatus.PreShow
        };

        var act = () => auditor.RejectIfFrozen(
            evt,
            evt.VenueId,
            Guid.NewGuid(),
            FrozenEventMutationOperation.UpdateLineItem);

        act.Should().NotThrow();
        collector.Entries.Should().BeEmpty();
    }

    [Fact]
    public void RejectIfFrozen_LogContainsRequiredFieldsOnly()
    {
        var collector = new TestLogCollector();
        var auditor = CreateAuditor(collector);
        var eventId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var evt = new Event
        {
            Id = eventId,
            VenueId = venueId,
            Title = "Secret Show Name",
            Status = EventStatus.Reconciled
        };

        var act = () => auditor.RejectIfFrozen(
            evt,
            venueId,
            userId,
            FrozenEventMutationOperation.DeleteEvent,
            "Event is settled or reconciled and cannot be deleted.");

        act.Should().Throw<LedgerStateException>();

        var entry = collector.Entries.Single();
        GetStateValue(entry, "Operation").Should().Be(FrozenEventMutationOperation.DeleteEvent);
        GetStateValue(entry, "EventId").Should().Be(eventId);
        GetStateValue(entry, "VenueId").Should().Be(venueId);
        GetStateValue(entry, "EventStatus").Should().Be("RECONCILED");
        entry.Message.Should().NotContain("Secret Show Name");
        entry.Message.Should().NotContain("@example.com");
    }

    [Fact]
    public void RejectIfFrozen_DoesNotLogPayloadValues()
    {
        var collector = new TestLogCollector();
        var auditor = CreateAuditor(collector);
        const string signaturePayload = "SIGNATURE_BLOB_SHOULD_NOT_APPEAR";
        const string financialMarker = "99999.99";
        var evt = new Event
        {
            Id = Guid.NewGuid(),
            VenueId = Guid.NewGuid(),
            ArtistSignatureData = signaturePayload,
            Status = EventStatus.Settled
        };

        var act = () => auditor.RejectIfFrozen(
            evt,
            evt.VenueId,
            Guid.NewGuid(),
            FrozenEventMutationOperation.UpdateLineItem);

        act.Should().Throw<LedgerStateException>();

        var combined = string.Join(' ', collector.Entries.Select(e => e.Message));
        combined.Should().NotContain(signaturePayload);
        combined.Should().NotContain(financialMarker);
    }

    private static FrozenEventMutationAuditor CreateAuditor(TestLogCollector collector)
    {
        using var factory = LoggerFactory.Create(builder =>
        {
            builder.AddProvider(collector);
            builder.SetMinimumLevel(LogLevel.Debug);
        });

        return new FrozenEventMutationAuditor(factory.CreateLogger<FrozenEventMutationAuditor>());
    }

    private static object? GetStateValue(TestLogCollector.LogEntry entry, string key) =>
        entry.State.FirstOrDefault(kvp => kvp.Key == key).Value;
}
