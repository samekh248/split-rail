using FluentAssertions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncCorrectionServiceTests
{
    [Theory]
    [InlineData(150, 100, 50)]
    [InlineData(120, 150, -30)]
    [InlineData(0, 100, -100)]
    public void CalculateNetToTargetOffset_ReturnsExpectedDelta(
        double targetUpstreamAmount,
        double netSum,
        double expectedOffset)
    {
        QboSyncCorrectionService.CalculateNetToTargetOffset(
                (decimal)targetUpstreamAmount,
                (decimal)netSum)
            .Should().Be((decimal)expectedOffset);
    }

    [Fact]
    public void HasExistingOffset_AmountChange_ReturnsTrueWhenMatchingTargetState()
    {
        var rows = new List<QboSyncLedger>
        {
            new()
            {
                EntryType = QboSyncLedgerEntryType.Original,
                Amount = 100m
            },
            new()
            {
                EntryType = QboSyncLedgerEntryType.OffsetCorrection,
                CorrectionType = QboSyncCorrectionType.AmountChange,
                TargetStateAbsent = false,
                TargetStateAmount = 150m,
                Amount = 50m
            }
        };

        QboSyncCorrectionService.HasExistingOffset(
                rows,
                QboSyncCorrectionType.AmountChange,
                targetAbsent: false,
                targetAmount: 150m)
            .Should().BeTrue();
    }

    [Fact]
    public void HasExistingOffset_VoidRemoval_ReturnsTrueWhenAbsentTargetApplied()
    {
        var rows = new List<QboSyncLedger>
        {
            new()
            {
                EntryType = QboSyncLedgerEntryType.OffsetCorrection,
                CorrectionType = QboSyncCorrectionType.VoidRemoval,
                TargetStateAbsent = true,
                TargetStateAmount = null,
                Amount = -100m
            }
        };

        QboSyncCorrectionService.HasExistingOffset(
                rows,
                QboSyncCorrectionType.VoidRemoval,
                targetAbsent: true,
                targetAmount: null)
            .Should().BeTrue();
    }
}
