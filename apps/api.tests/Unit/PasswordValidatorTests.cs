using FluentAssertions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class PasswordValidatorTests
{
    [Theory]
    [InlineData("valid@example.com", true)]
    [InlineData("invalid-email", false)]
    [InlineData("", false)]
    public void IsValidEmail_ValidatesFormat(string email, bool expected)
    {
        PasswordValidator.IsValidEmail(email).Should().Be(expected);
    }

    [Fact]
    public void ValidatePassword_ReturnsAllErrors_ForWeakPassword()
    {
        var errors = PasswordValidator.ValidatePassword("abc");
        errors.Should().HaveCountGreaterThan(1);
    }

    [Fact]
    public void ValidatePassword_ReturnsEmpty_ForStrongPassword()
    {
        var errors = PasswordValidator.ValidatePassword("SecurePass1");
        errors.Should().BeEmpty();
    }
}
