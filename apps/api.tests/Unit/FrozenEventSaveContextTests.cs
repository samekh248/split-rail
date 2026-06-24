using FluentAssertions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FrozenEventSaveContextTests
{
    [Fact]
    public void Authorize_SetsCurrentReasonUntilDisposed()
    {
        var context = new FrozenEventSaveContext();

        context.CurrentReason.Should().BeNull();

        using (context.Authorize(FrozenEventSaveReason.SettlementReversal))
        {
            context.CurrentReason.Should().Be(FrozenEventSaveReason.SettlementReversal);
        }

        context.CurrentReason.Should().BeNull();
    }

    [Fact]
    public void Authorize_NestedScopesRestorePreviousReason()
    {
        var context = new FrozenEventSaveContext();

        using (context.Authorize(FrozenEventSaveReason.SettlementReversal))
        {
            context.CurrentReason.Should().Be(FrozenEventSaveReason.SettlementReversal);

            using (context.Authorize(FrozenEventSaveReason.EventReconciliation))
            {
                context.CurrentReason.Should().Be(FrozenEventSaveReason.EventReconciliation);
            }

            context.CurrentReason.Should().Be(FrozenEventSaveReason.SettlementReversal);
        }

        context.CurrentReason.Should().BeNull();
    }
}
