using SplitRail.Api.Configuration;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class ProductionSecretConfigurationValidatorTests
{
    [Fact]
    public void Validate_acceptsProductionReadySecrets()
    {
        var jwt = new JwtSettings { Secret = "production-test-secret-at-least-32-chars" };
        var qbo = new QboSyncOptions
        {
            ClientId = "client",
            ClientSecret = "secret",
            InternalTriggerKey = "trigger",
        };

        ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password");
    }

    [Fact]
    public void Validate_rejectsMissingJwtSecret()
    {
        var jwt = new JwtSettings { Secret = "" };
        var qbo = new QboSyncOptions
        {
            ClientId = "client",
            ClientSecret = "secret",
            InternalTriggerKey = "trigger",
        };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password"));

        Assert.Contains("Jwt:Secret", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejectsPlaceholderJwtSecret()
    {
        var jwt = new JwtSettings { Secret = "replace-with-production-secret-at-least-32-chars" };
        var qbo = new QboSyncOptions
        {
            ClientId = "client",
            ClientSecret = "secret",
            InternalTriggerKey = "trigger",
        };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password"));

        Assert.Contains("placeholder", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejectsDevInternalTriggerKey()
    {
        var jwt = new JwtSettings { Secret = "production-test-secret-at-least-32-chars" };
        var qbo = new QboSyncOptions
        {
            ClientId = "client",
            ClientSecret = "secret",
            InternalTriggerKey = "dev-internal-sync-key",
        };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password"));

        Assert.Contains("InternalTriggerKey", ex.Message, StringComparison.Ordinal);
    }
}
