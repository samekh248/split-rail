using SplitRail.Api.Configuration;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class ProductionSecretConfigurationValidatorTests
{
    private static QboSyncOptions ValidQbo() => new()
    {
        ClientId = "client",
        ClientSecret = "secret",
        SchedulerServiceAccountEmail = "split-rail-qbo-scheduler-prod@split-rail.iam.gserviceaccount.com",
        SchedulerTokenAudience = "https://split-rail-api.example.com",
    };

    [Fact]
    public void Validate_acceptsProductionReadySecrets()
    {
        var jwt = new JwtSettings { Secret = "production-test-secret-at-least-32-chars" };
        ProductionSecretConfigurationValidator.Validate(jwt, ValidQbo(), "db-password");
    }

    [Fact]
    public void Validate_rejectsMissingJwtSecret()
    {
        var jwt = new JwtSettings { Secret = "" };
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, ValidQbo(), "db-password"));

        Assert.Contains("Jwt:Secret", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejectsPlaceholderJwtSecret()
    {
        var jwt = new JwtSettings { Secret = "replace-with-production-secret-at-least-32-chars" };
        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, ValidQbo(), "db-password"));

        Assert.Contains("placeholder", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_rejectsMissingSchedulerServiceAccountEmail()
    {
        var jwt = new JwtSettings { Secret = "production-test-secret-at-least-32-chars" };
        var qbo = ValidQbo();
        qbo.SchedulerServiceAccountEmail = "";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password"));

        Assert.Contains("SchedulerServiceAccountEmail", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_noLongerRequiresInternalTriggerKey()
    {
        var jwt = new JwtSettings { Secret = "production-test-secret-at-least-32-chars" };
        var qbo = ValidQbo();
        qbo.InternalTriggerKey = "dev-internal-sync-key";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionSecretConfigurationValidator.Validate(jwt, qbo, "db-password"));

        Assert.Contains("InternalTriggerKey", ex.Message, StringComparison.Ordinal);
    }
}
