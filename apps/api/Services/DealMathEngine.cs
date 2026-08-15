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

    // ---- Festival deal math (spec 082) -----------------------------------

    /// <summary>
    /// Computes a Programming Block's gross payout from its allocation basis.
    ///
    /// Order matters and is fixed: guarantee-vs-split first, then the bonus, then the cap,
    /// then the floor. The floor is applied last so a contractual minimum can never be
    /// undercut by a cap (spec FR-021).
    ///
    /// Everything runs at full decimal precision; only the caller's final payable line is
    /// rounded (Constitution I).
    /// </summary>
    public static decimal CalculateBlockGrossPayout(
        decimal allocationBasis,
        decimal baseGuarantee,
        decimal backendPercentage,
        decimal? bonusThresholdAmount = null,
        decimal? bonusAmount = null,
        decimal? capAmount = null,
        decimal? floorAmount = null)
    {
        var split = allocationBasis * backendPercentage / 100m;
        var payout = Math.Max(baseGuarantee, split);

        if (bonusThresholdAmount is decimal threshold
            && bonusAmount is decimal bonus
            && allocationBasis >= threshold)
        {
            payout += bonus;
        }

        if (capAmount is decimal cap)
            payout = Math.Min(payout, cap);

        if (floorAmount is decimal floor)
            payout = Math.Max(payout, floor);

        return RoundMoney(payout);
    }

    /// <summary>
    /// Splits a bucket across participants at full precision, rounds each share, then places
    /// any penny remainder on the largest share so the parts always sum to exactly the
    /// distributed total (spec FR-022, research.md D7).
    ///
    /// Percentages are shares of <paramref name="bucketAmount"/> and need not total 100%;
    /// the remainder rule applies to whatever portion is actually distributed.
    /// </summary>
    public static decimal[] AllocateByPercentage(decimal bucketAmount, decimal[] percentages)
    {
        ArgumentNullException.ThrowIfNull(percentages);

        if (percentages.Length == 0)
            return [];

        var exact = new decimal[percentages.Length];
        var rounded = new decimal[percentages.Length];
        var exactTotal = 0m;

        for (var i = 0; i < percentages.Length; i++)
        {
            exact[i] = bucketAmount * percentages[i] / 100m;
            rounded[i] = RoundMoney(exact[i]);
            exactTotal += exact[i];
        }

        var targetTotal = RoundMoney(exactTotal);
        var roundedTotal = rounded.Sum();
        var remainder = targetTotal - roundedTotal;

        if (remainder != 0m)
        {
            // Largest calculated share absorbs the penny difference — deterministic, so
            // repeated recalculation always lands on the same cents.
            var largestIndex = 0;
            for (var i = 1; i < exact.Length; i++)
            {
                if (exact[i] > exact[largestIndex])
                    largestIndex = i;
            }

            rounded[largestIndex] = RoundMoney(rounded[largestIndex] + remainder);
        }

        return rounded;
    }

    /// <summary>
    /// Full block payout: allocation basis through deal terms, deductions, and tax.
    /// Net-basis deals compute the percentage after deductions; gross-basis deals subtract
    /// deductions after the split (spec FR-021).
    /// </summary>
    public static decimal CalculateBlockPayout(
        decimal allocationBasis,
        decimal deductions,
        PercentBasis percentBasis,
        decimal baseGuarantee,
        decimal backendPercentage,
        decimal taxWithholdingPercentage,
        decimal? bonusThresholdAmount = null,
        decimal? bonusAmount = null,
        decimal? capAmount = null,
        decimal? floorAmount = null)
    {
        var basis = percentBasis == PercentBasis.Net
            ? Math.Max(0m, allocationBasis - deductions)
            : allocationBasis;

        var gross = CalculateBlockGrossPayout(
            basis,
            baseGuarantee,
            backendPercentage,
            bonusThresholdAmount,
            bonusAmount,
            capAmount,
            floorAmount);

        var afterDeductions = percentBasis == PercentBasis.Net
            ? gross
            : RoundMoney(gross - deductions);

        return ApplyTaxAndFloor(afterDeductions, taxWithholdingPercentage);
    }
}
