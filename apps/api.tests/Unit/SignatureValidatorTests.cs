using FluentAssertions;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class SignatureValidatorTests
{
    private readonly SignatureValidator _validator = new();

    [Fact]
    public void ValidVector_Passes()
    {
        var strokes = _validator.ValidateAndParse(IntegrationTestHelper.ValidSignatureBase64());
        strokes.Should().HaveCount(1);
        strokes[0].Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public void MissingSignature_Throws()
    {
        var act = () => _validator.ValidateAndParse("");
        act.Should().Throw<SignatureValidationException>();
    }

    [Fact]
    public void NonBase64_Throws()
    {
        var act = () => _validator.ValidateAndParse("not-base64!!!");
        act.Should().Throw<SignatureValidationException>();
    }

    [Fact]
    public void ZeroStroke_Throws()
    {
        var json = "[]";
        var encoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));
        var act = () => _validator.ValidateAndParse(encoded);
        act.Should().Throw<SignatureValidationException>();
    }
}

internal static class IntegrationTestHelper
{
    public static string ValidSignatureBase64()
    {
        const string json = "[[{\"x\":10,\"y\":20},{\"x\":30,\"y\":40}]]";
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));
    }
}
