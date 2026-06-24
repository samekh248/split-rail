using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class DealMathEngine
{
    private readonly CustomFormulaEvaluator _formulaEvaluator;

    public DealMathEngine(CustomFormulaEvaluator formulaEvaluator)
    {
        _formulaEvaluator = formulaEvaluator;
    }

    public decimal CalculateNetPayout(
        DealType dealType,
        decimal netShowRevenue,
        decimal grossRevenue,
        decimal totalDeductions,
        decimal baseGuarantee,
        decimal backendPercentage,
        decimal taxWithholdingPercentage,
        string? customFormulaExpression)
    {
        var grossArtistPayout = dealType switch
        {
            DealType.Guarantee => CalculateGuaranteeGross(netShowRevenue, baseGuarantee, backendPercentage),
            DealType.DoorSplit => CalculateDoorSplitGross(netShowRevenue, backendPercentage),
            DealType.Custom => _formulaEvaluator.Evaluate(
                customFormulaExpression,
                grossRevenue,
                totalDeductions,
                baseGuarantee,
                backendPercentage),
            _ => throw new ArgumentOutOfRangeException(nameof(dealType))
        };

        return ApplyTaxAndFloor(grossArtistPayout, taxWithholdingPercentage);
    }

    public static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static decimal CalculateGuaranteeGross(
        decimal netShowRevenue,
        decimal baseGuarantee,
        decimal backendPercentage)
    {
        var splitAmount = RoundMoney(netShowRevenue * backendPercentage / 100m);
        return Math.Max(baseGuarantee, splitAmount);
    }

    public static decimal CalculateDoorSplitGross(decimal netShowRevenue, decimal backendPercentage) =>
        RoundMoney(netShowRevenue * backendPercentage / 100m);

    public static decimal ApplyTaxAndFloor(decimal grossArtistPayout, decimal taxWithholdingPercentage)
    {
        var taxWithheld = RoundMoney(grossArtistPayout * taxWithholdingPercentage / 100m);

        var payout = RoundMoney(grossArtistPayout - taxWithheld);

        return Math.Max(0m, payout);
    }
}
