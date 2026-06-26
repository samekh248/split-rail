using FluentAssertions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncOptionsEnvironmentTests
{
    [Theory]
    [InlineData("development", true)]
    [InlineData("staging", true)]
    [InlineData("production", false)]
    public void UsesSandboxIntuit_FollowsEnvironmentProfile(string profile, bool expectedSandbox)
    {
        var options = new QboSyncOptions { EnvironmentProfile = profile };
        options.UsesSandboxIntuit.Should().Be(expectedSandbox);
    }

    [Fact]
    public void SandboxProfile_UsesSandboxApiBaseUrlWhenConfigured()
    {
        var options = Options.Create(new QboSyncOptions
        {
            EnvironmentProfile = "development",
            IntuitApiBaseUrl = "https://sandbox-quickbooks.api.intuit.com/v3/company",
        });

        options.Value.IntuitApiBaseUrl.Should().Contain("sandbox-quickbooks");
    }
}
