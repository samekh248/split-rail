using SplitRail.Api.Configuration;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class ContentSecurityPolicyOptionsTests
{
    private const string ContractLiteral =
        "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';";

    [Fact]
    public void ProductionPolicy_MatchesContractLiteral()
    {
        Assert.Equal(ContractLiteral, ContentSecurityPolicyOptions.ProductionPolicy);
    }

    [Fact]
    public void ProductionPolicy_ContainsObjectSrcNone()
    {
        Assert.Contains("object-src 'none'", ContentSecurityPolicyOptions.ProductionPolicy);
    }

    [Fact]
    public void ProductionPolicy_ContainsAllRequiredDirectives()
    {
        var policy = ContentSecurityPolicyOptions.ProductionPolicy;
        Assert.Contains("default-src 'self'", policy);
        Assert.Contains("script-src 'self'", policy);
        Assert.Contains("connect-src 'self'", policy);
        Assert.Contains("*.quickbooks.com", policy);
        Assert.Contains("*.googleapis.com", policy);
        Assert.Contains("object-src 'none'", policy);
    }

    [Fact]
    public void ProductionPolicy_DoesNotContainUnsafeInline()
    {
        Assert.DoesNotContain("unsafe-inline", ContentSecurityPolicyOptions.ProductionPolicy);
    }

    [Fact]
    public void DevelopmentPolicy_MayAppendStyleSrcUnsafeInline()
    {
        var developmentPolicy = ContentSecurityPolicyOptions.GetPolicyForEnvironment(isDevelopment: true);
        var productionPolicy = ContentSecurityPolicyOptions.GetPolicyForEnvironment(isDevelopment: false);

        Assert.Equal(ContentSecurityPolicyOptions.ProductionPolicy, productionPolicy);
        Assert.StartsWith(ContentSecurityPolicyOptions.ProductionPolicy, developmentPolicy);
        Assert.EndsWith("style-src 'self' 'unsafe-inline'", developmentPolicy);
        Assert.Contains("unsafe-inline", developmentPolicy);
    }
}
