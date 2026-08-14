using FluentAssertions;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

/// <summary>
/// Festival deal math. Every assertion is exact to the cent — settlements are money
/// (Constitution I).
/// </summary>
public class DealMathEngineFestivalTests
{
    [Fact]
    public void BlockGrossPayout_TakesTheGreaterOfGuaranteeAndSplit()
    {
        // 10% of 50,000 = 5,000 beats the 4,000 guarantee.
        DealMathEngine.CalculateBlockGrossPayout(50_000m, 4_000m, 10m).Should().Be(5_000m);

        // 10% of 20,000 = 2,000 loses to the 4,000 guarantee.
        DealMathEngine.CalculateBlockGrossPayout(20_000m, 4_000m, 10m).Should().Be(4_000m);
    }

    [Fact]
    public void BlockGrossPayout_AddsBonusOnlyWhenThresholdIsMet()
    {
        var below = DealMathEngine.CalculateBlockGrossPayout(
            9_000m, 1_000m, 10m, bonusThresholdAmount: 10_000m, bonusAmount: 500m);
        below.Should().Be(1_000m, "the threshold was not reached");

        var atThreshold = DealMathEngine.CalculateBlockGrossPayout(
            10_000m, 1_000m, 10m, bonusThresholdAmount: 10_000m, bonusAmount: 500m);
        atThreshold.Should().Be(1_500m, "reaching the threshold exactly earns the bonus");
    }

    [Fact]
    public void BlockGrossPayout_AppliesCapAfterBonus()
    {
        var payout = DealMathEngine.CalculateBlockGrossPayout(
            100_000m, 1_000m, 10m,
            bonusThresholdAmount: 50_000m, bonusAmount: 5_000m,
            capAmount: 12_000m);

        // 10% of 100k = 10,000, +5,000 bonus = 15,000, capped to 12,000.
        payout.Should().Be(12_000m);
    }

    [Fact]
    public void BlockGrossPayout_AppliesFloorAfterCap()
    {
        // A floor must survive a cap — a contractual minimum cannot be capped away.
        var payout = DealMathEngine.CalculateBlockGrossPayout(
            1_000m, 0m, 10m, capAmount: 50m, floorAmount: 500m);

        payout.Should().Be(500m);
    }

    [Fact]
    public void BlockGrossPayout_HandlesZeroBasis()
    {
        DealMathEngine.CalculateBlockGrossPayout(0m, 2_500m, 15m).Should().Be(2_500m);
        DealMathEngine.CalculateBlockGrossPayout(0m, 0m, 15m).Should().Be(0m);
    }

    [Fact]
    public void BlockGrossPayout_RoundsAwayFromZeroAtTheFinalLine()
    {
        // 12.5% of 1,000.04 = 125.005 -> 125.01 (half away from zero, Constitution I).
        DealMathEngine.CalculateBlockGrossPayout(1_000.04m, 0m, 12.5m).Should().Be(125.01m);
    }

    [Fact]
    public void AllocateByPercentage_SplitsEvenlyWhenItDividesCleanly()
    {
        var result = DealMathEngine.AllocateByPercentage(1_000m, [50m, 50m]);

        result.Should().Equal(500m, 500m);
        result.Sum().Should().Be(1_000m);
    }

    [Fact]
    public void AllocateByPercentage_PlacesPennyRemainderOnLargestShare()
    {
        // 100.00 split 3 ways at 33.333...% each cannot divide evenly.
        var result = DealMathEngine.AllocateByPercentage(100m, [50m, 25m, 25m]);

        result.Sum().Should().Be(100m);
        result[0].Should().Be(50m);
    }

    [Fact]
    public void AllocateByPercentage_AlwaysSumsToTheDistributedTotal()
    {
        // 0.01 of variance would be a real settlement dispute — assert exactly.
        var cases = new[]
        {
            (Bucket: 1_000.00m, Pcts: new[] { 33.33m, 33.33m, 33.34m }),
            (Bucket: 10_000.01m, Pcts: new[] { 33.3333m, 33.3333m, 33.3334m }),
            (Bucket: 999.99m, Pcts: new[] { 16.6667m, 16.6667m, 16.6666m }),
            (Bucket: 87_654.32m, Pcts: new[] { 12.5m, 12.5m, 12.5m, 12.5m }),
        };

        foreach (var (bucket, pcts) in cases)
        {
            var result = DealMathEngine.AllocateByPercentage(bucket, pcts);
            var expectedTotal = DealMathEngine.RoundMoney(
                pcts.Sum(p => bucket * p / 100m));

            result.Sum().Should().Be(expectedTotal,
                $"bucket {bucket} split {string.Join('/', pcts)} must reconcile exactly");
        }
    }

    [Fact]
    public void AllocateByPercentage_HandlesPartialDistribution()
    {
        // Only 60% of the bucket is allocated; the rest stays unallocated.
        var result = DealMathEngine.AllocateByPercentage(1_000m, [40m, 20m]);

        result.Sum().Should().Be(600m);
        result.Should().Equal(400m, 200m);
    }

    [Fact]
    public void AllocateByPercentage_IsDeterministicAcrossRepeatedCalls()
    {
        var first = DealMathEngine.AllocateByPercentage(1_000.01m, [33.33m, 33.33m, 33.34m]);
        var second = DealMathEngine.AllocateByPercentage(1_000.01m, [33.33m, 33.33m, 33.34m]);

        second.Should().Equal(first, "recalculation must never move pennies around");
    }

    [Fact]
    public void AllocateByPercentage_ReturnsEmptyForNoParticipants()
    {
        DealMathEngine.AllocateByPercentage(1_000m, []).Should().BeEmpty();
    }

    [Fact]
    public void AllocateByPercentage_HandlesSingleParticipant()
    {
        DealMathEngine.AllocateByPercentage(333.33m, [100m]).Should().Equal(333.33m);
    }

    [Fact]
    public void BlockPayout_GrossBasis_SubtractsDeductionsAfterSplit()
    {
        // 10% of 10,000 = 1,000 gross, minus 200 deductions = 800, minus 10% tax = 720.
        var payout = DealMathEngine.CalculateBlockPayout(
            allocationBasis: 10_000m,
            deductions: 200m,
            percentBasis: PercentBasis.Gross,
            baseGuarantee: 0m,
            backendPercentage: 10m,
            taxWithholdingPercentage: 10m);

        payout.Should().Be(720m);
    }

    [Fact]
    public void BlockPayout_NetBasis_ComputesPercentageAfterDeductions()
    {
        // Net basis: 10% of (10,000 - 2,000) = 800, no post-split deduction, 10% tax = 720.
        var payout = DealMathEngine.CalculateBlockPayout(
            allocationBasis: 10_000m,
            deductions: 2_000m,
            percentBasis: PercentBasis.Net,
            baseGuarantee: 0m,
            backendPercentage: 10m,
            taxWithholdingPercentage: 10m);

        payout.Should().Be(720m);
    }

    [Fact]
    public void BlockPayout_AppliesCapFloorBonusInOrder()
    {
        var payout = DealMathEngine.CalculateBlockPayout(
            allocationBasis: 100_000m,
            deductions: 0m,
            percentBasis: PercentBasis.Gross,
            baseGuarantee: 1_000m,
            backendPercentage: 10m,
            taxWithholdingPercentage: 0m,
            bonusThresholdAmount: 50_000m,
            bonusAmount: 5_000m,
            capAmount: 12_000m,
            floorAmount: 500m);

        payout.Should().Be(12_000m);
    }
}
