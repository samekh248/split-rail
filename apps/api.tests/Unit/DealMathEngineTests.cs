using FluentAssertions;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class DealMathEngineTests
{
    private readonly DealMathEngine _engine = new(new CustomFormulaEvaluator());

    [Fact]
    public void Guarantee_UsesBaseWhenSplitLower()
    {
        var payout = _engine.CalculateNetPayout(
            DealType.Guarantee,
            netShowRevenue: 6000m,
            grossRevenue: 8000m,
            totalDeductions: 2000m,
            baseGuarantee: 5000m,
            backendPercentage: 70m,
            taxWithholdingPercentage: 0m,
            customFormulaExpression: null);

        payout.Should().Be(5000m);
    }

    [Fact]
    public void Guarantee_UsesSplitWhenHigher()
    {
        var payout = _engine.CalculateNetPayout(
            DealType.Guarantee,
            netShowRevenue: 10000m,
            grossRevenue: 10000m,
            totalDeductions: 0m,
            baseGuarantee: 5000m,
            backendPercentage: 70m,
            taxWithholdingPercentage: 0m,
            customFormulaExpression: null);

        payout.Should().Be(7000m);
    }

    [Fact]
    public void DoorSplit_CalculatesPercentageOfNet()
    {
        var payout = _engine.CalculateNetPayout(
            DealType.DoorSplit,
            netShowRevenue: 8000m,
            grossRevenue: 10000m,
            totalDeductions: 2000m,
            baseGuarantee: 0m,
            backendPercentage: 50m,
            taxWithholdingPercentage: 0m,
            customFormulaExpression: null);

        payout.Should().Be(4000m);
    }

    [Fact]
    public void TaxWithholding_RoundsAwayFromZero()
    {
        var payout = DealMathEngine.ApplyTaxAndFloor(100.05m, 10m);
        payout.Should().Be(90.04m);
    }

    [Fact]
    public void ZeroGross_YieldsZeroPayout()
    {
        var payout = _engine.CalculateNetPayout(
            DealType.DoorSplit,
            netShowRevenue: 0m,
            grossRevenue: 0m,
            totalDeductions: 0m,
            baseGuarantee: 5000m,
            backendPercentage: 70m,
            taxWithholdingPercentage: 0m,
            customFormulaExpression: null);

        payout.Should().Be(0m);
    }

    [Fact]
    public void DeductionsExceedGross_FloorsPayoutAtZero()
    {
        var payout = _engine.CalculateNetPayout(
            DealType.DoorSplit,
            netShowRevenue: -500m,
            grossRevenue: 1000m,
            totalDeductions: 1500m,
            baseGuarantee: 0m,
            backendPercentage: 50m,
            taxWithholdingPercentage: 0m,
            customFormulaExpression: null);

        payout.Should().Be(0m);
    }

    [Fact]
    public void FractionalSplit_RoundsCorrectly()
    {
        var gross = DealMathEngine.CalculateDoorSplitGross(1000m, 33.33m);
        var payout = DealMathEngine.ApplyTaxAndFloor(gross, 0m);
        payout.Should().Be(333.30m);
    }

    [Fact]
    public void MultiArtist_SharesSameNetRevenueBase()
    {
        const decimal net = 10000m;
        const decimal gross = 12000m;
        const decimal deductions = 2000m;

        var headliner = _engine.CalculateNetPayout(
            DealType.Guarantee, net, gross, deductions, 5000m, 70m, 0m, null);

        var support = _engine.CalculateNetPayout(
            DealType.DoorSplit, net, gross, deductions, 0m, 20m, 0m, null);

        headliner.Should().Be(7000m);
        support.Should().Be(2000m);
    }
}
