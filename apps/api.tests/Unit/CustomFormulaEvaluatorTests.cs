using FluentAssertions;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class CustomFormulaEvaluatorTests
{
    private readonly CustomFormulaEvaluator _evaluator = new();

    [Fact]
    public void Evaluate_NestedParentheses_ReturnsCorrectResult()
    {
        var result = _evaluator.Evaluate(
            "((GrossRevenue - TotalDeductions) * SplitPercentage)",
            grossRevenue: 10000m,
            totalDeductions: 2000m,
            baseGuarantee: 0m,
            backendPercentage: 50m);

        result.Should().Be(4000m);
    }

    [Fact]
    public void Evaluate_StripsInjectionCharacters()
    {
        var result = _evaluator.Evaluate(
            "GrossRevenue + 0@#$%",
            grossRevenue: 100m,
            totalDeductions: 0m,
            baseGuarantee: 0m,
            backendPercentage: 0m);

        result.Should().Be(100m);
    }

    [Fact]
    public void Evaluate_EmptyExpression_ThrowsFormulaEvaluationException()
    {
        var act = () => _evaluator.Evaluate(
            "",
            grossRevenue: 100m,
            totalDeductions: 0m,
            baseGuarantee: 0m,
            backendPercentage: 0m);

        act.Should().Throw<FormulaEvaluationException>();
    }

    [Fact]
    public void Evaluate_InvalidSyntax_ThrowsFormulaEvaluationException()
    {
        var act = () => _evaluator.Evaluate(
            "GrossRevenue + +",
            grossRevenue: 100m,
            totalDeductions: 0m,
            baseGuarantee: 0m,
            backendPercentage: 0m);

        act.Should().Throw<FormulaEvaluationException>();
    }

    [Fact]
    public void Evaluate_RoundsAwayFromZero()
    {
        var result = _evaluator.Evaluate(
            "GrossRevenue / 3",
            grossRevenue: 100m,
            totalDeductions: 0m,
            baseGuarantee: 0m,
            backendPercentage: 0m);

        result.Should().Be(33.33m);
    }

    [Fact]
    public void Evaluate_CustomDealFormula_MatchesSpec()
    {
        var result = _evaluator.Evaluate(
            "(GrossRevenue - TotalDeductions) * SplitPercentage - BaseGuarantee",
            grossRevenue: 10000m,
            totalDeductions: 2000m,
            baseGuarantee: 1000m,
            backendPercentage: 50m);

        result.Should().Be(3000m);
    }
}
