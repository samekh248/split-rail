using FluentAssertions;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class BookingConflictServiceTests
{
    private readonly BookingConflictService _service = new();

    [Fact]
    public void OpenSlot_CreateHold_AssignsHold1()
    {
        var tier = _service.ResolveHoldTier([]);
        tier.Should().Be(BookingPlacementStatus.Hold1);
        _service.Invoking(s => s.ValidateAction([], BookingConflictAction.CreateHold))
            .Should().NotThrow();
    }

    [Fact]
    public void Hold1Only_SecondHold_AssignsHold2()
    {
        var hold1Id = Guid.NewGuid();
        var active = new[] { new ActivePlacement(hold1Id, BookingPlacementStatus.Hold1) };

        _service.ResolveHoldTier(active).Should().Be(BookingPlacementStatus.Hold2);
        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.CreateHold))
            .Should().NotThrow();
    }

    [Fact]
    public void Hold1ThenHold2_ThirdHold_Throws409()
    {
        var active = new[]
        {
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Hold1),
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Hold2),
        };

        _service.Invoking(s => s.ResolveHoldTier(active))
            .Should().Throw<BookingConflictException>();
        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.CreateHold))
            .Should().Throw<BookingConflictException>();
    }

    [Fact]
    public void Confirmed_SecondConfirmed_Throws409()
    {
        var active = new[] { new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Confirmed) };

        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.CreateConfirmed))
            .Should().Throw<BookingConflictException>()
            .WithMessage("*confirmed booking already exists*");
    }

    [Fact]
    public void Confirmed_CreateHold2_Allowed()
    {
        var active = new[] { new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Confirmed) };

        _service.ResolveHoldTier(active).Should().Be(BookingPlacementStatus.Hold2);
        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.CreateHold))
            .Should().NotThrow();
    }

    [Fact]
    public void ConfirmedAndHold2_ThirdHold_Throws409()
    {
        var active = new[]
        {
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Confirmed),
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Hold2),
        };

        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.CreateHold))
            .Should().Throw<BookingConflictException>();
    }

    [Fact]
    public void CancelledOnDate_NewConfirmed_Allowed()
    {
        var placements = new[]
        {
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Cancelled),
        };

        _service.Invoking(s => s.ValidateAction(placements, BookingConflictAction.CreateConfirmed))
            .Should().NotThrow();
    }

    [Fact]
    public void PromoteHold1_WithHold2Present_Allowed()
    {
        var hold1Id = Guid.NewGuid();
        var active = new[]
        {
            new ActivePlacement(hold1Id, BookingPlacementStatus.Hold1),
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Hold2),
        };

        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.PromoteToConfirmed, hold1Id))
            .Should().NotThrow();
    }

    [Fact]
    public void PromoteWhenConfirmedExists_Throws409()
    {
        var hold1Id = Guid.NewGuid();
        var active = new[]
        {
            new ActivePlacement(hold1Id, BookingPlacementStatus.Hold1),
            new ActivePlacement(Guid.NewGuid(), BookingPlacementStatus.Confirmed),
        };

        _service.Invoking(s => s.ValidateAction(active, BookingConflictAction.PromoteToConfirmed, hold1Id))
            .Should().Throw<BookingConflictException>();
    }
}
