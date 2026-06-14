using System.Text.RegularExpressions;
using NCalc;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class CustomFormulaEvaluator
{
    private static readonly Regex Sanitizer = new(@"[^a-zA-Z0-9\s+\-*/().]", RegexOptions.Compiled);

    public decimal Evaluate(
        string? expression,
        decimal grossRevenue,
        decimal totalDeductions,
        decimal baseGuarantee,
        decimal backendPercentage)
    {
        if (string.IsNullOrWhiteSpace(expression))
            throw new FormulaEvaluationException("Custom formula expression is required.");

        var sanitized = Sanitizer.Replace(expression, string.Empty);
        if (string.IsNullOrWhiteSpace(sanitized))
            throw new FormulaEvaluationException("Custom formula expression is invalid after sanitization.");

        try
        {
            var splitPercentage = backendPercentage / 100m;
            var ncalcExpression = new Expression(sanitized, ExpressionOptions.DecimalAsDefault);
            ncalcExpression.Parameters["GrossRevenue"] = grossRevenue;
            ncalcExpression.Parameters["TotalDeductions"] = totalDeductions;
            ncalcExpression.Parameters["BaseGuarantee"] = baseGuarantee;
            ncalcExpression.Parameters["SplitPercentage"] = splitPercentage;

            var result = ncalcExpression.Evaluate();
            if (result is null)
                throw new FormulaEvaluationException("Formula evaluation returned no result.");

            var decimalResult = Convert.ToDecimal(result);
            return Math.Round(decimalResult, 2, MidpointRounding.AwayFromZero);
        }
        catch (FormulaEvaluationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new FormulaEvaluationException($"Formula evaluation failed: {ex.Message}");
        }
    }
}
