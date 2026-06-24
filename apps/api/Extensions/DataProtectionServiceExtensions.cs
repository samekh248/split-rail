using Google.Cloud.AspNetCore.DataProtection.Kms;
using Google.Cloud.AspNetCore.DataProtection.Storage;
using Microsoft.AspNetCore.DataProtection;
using SplitRail.Api.Exceptions;
using SplitRailDataProtectionOptions = SplitRail.Api.Configuration.DataProtectionOptions;

namespace SplitRail.Api.Extensions;

public static class DataProtectionServiceExtensions
{
    public static IServiceCollection AddSplitRailDataProtection(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var options = configuration.GetSection(SplitRailDataProtectionOptions.SectionName)
            .Get<SplitRailDataProtectionOptions>()
            ?? new SplitRailDataProtectionOptions();

        var applicationName = string.IsNullOrWhiteSpace(options.ApplicationName)
            ? "split-rail-api"
            : options.ApplicationName;

        var dataProtection = services
            .AddDataProtection()
            .SetApplicationName(applicationName);

        if (environment.IsProduction())
        {
            ValidateProductionOptions(options);
            dataProtection
                .PersistKeysToGoogleCloudStorage(options.Bucket, options.ObjectPrefix)
                .ProtectKeysWithGoogleKms(options.KmsKeyName);
        }
        else
        {
            var keyDirectory = options.KeyDirectory
                ?? Path.Combine(environment.ContentRootPath, "dp-keys");
            Directory.CreateDirectory(keyDirectory);
            dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keyDirectory));
        }

        return services;
    }

    internal static void ValidateProductionOptions(SplitRailDataProtectionOptions options)
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(options.Bucket))
            missing.Add(nameof(SplitRailDataProtectionOptions.Bucket));

        if (string.IsNullOrWhiteSpace(options.ObjectPrefix))
            missing.Add(nameof(SplitRailDataProtectionOptions.ObjectPrefix));

        if (string.IsNullOrWhiteSpace(options.KmsKeyName))
            missing.Add(nameof(SplitRailDataProtectionOptions.KmsKeyName));

        if (missing.Count > 0)
        {
            throw new DataProtectionConfigurationException(
                $"Production Data Protection requires: {string.Join(", ", missing)}.");
        }
    }
}
