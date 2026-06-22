namespace SplitRail.Api.Configuration;

/// <summary>
/// Validates production boot secrets are present and not placeholder values (SPLR-48, Constitution VIII).
/// </summary>
public static class ProductionSecretConfigurationValidator
{
    private static readonly string[] JwtPlaceholderFragments =
    [
        "replace-with-production-secret",
        "dev-secret-key-at-least-32-characters-long",
    ];

    public static void Validate(JwtSettings jwt, QboSyncOptions qbo, string? dbPassword)
    {
        ValidateJwtSecret(jwt.Secret);
        ValidateRequired("QboSync:ClientId", qbo.ClientId);
        ValidateRequired("QboSync:ClientSecret", qbo.ClientSecret);
        ValidateRequired("QboSync:InternalTriggerKey", qbo.InternalTriggerKey);
        ValidateRequired("DB_PASSWORD", dbPassword);
    }

    private static void ValidateJwtSecret(string? secret)
    {
        ValidateRequired("Jwt:Secret", secret);

        if (secret!.Length < 32)
        {
            throw new InvalidOperationException(
                "Production JWT signing key must be at least 32 characters.");
        }

        foreach (var fragment in JwtPlaceholderFragments)
        {
            if (secret.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Production JWT signing key must be supplied via Secret Manager, not a placeholder.");
            }
        }
    }

    private static void ValidateRequired(string name, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Production configuration requires {name} from Secret Manager.");
        }

        if (name.Contains("InternalTriggerKey", StringComparison.Ordinal)
            && value.Contains("dev-internal-sync-key", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Production configuration requires {name} from Secret Manager, not a development default.");
        }
    }
}
