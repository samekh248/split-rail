using FluentAssertions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class NightlyDispatchSelectorTests
{
    [Fact]
    public void IsOrganizationEligible_ReturnsTrueAtLocal0305Utc()
    {
        var utcNow = new DateTimeOffset(2026, 6, 26, 3, 5, 0, TimeSpan.Zero);
        NightlyDispatchSelector.IsOrganizationEligible("UTC", utcNow).Should().BeTrue();
    }

    [Fact]
    public void IsOrganizationEligible_ReturnsFalseAtLocal0400Utc()
    {
        var utcNow = new DateTimeOffset(2026, 6, 26, 4, 0, 0, TimeSpan.Zero);
        NightlyDispatchSelector.IsOrganizationEligible("UTC", utcNow).Should().BeFalse();
    }

    [Fact]
    public void IsOrganizationEligible_ReturnsFalseForInvalidTimeZone()
    {
        NightlyDispatchSelector.IsOrganizationEligible("Not/A/Zone", DateTimeOffset.UtcNow)
            .Should().BeFalse();
    }
}
