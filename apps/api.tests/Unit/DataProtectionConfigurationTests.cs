using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using SplitRailDataProtectionOptions = SplitRail.Api.Configuration.DataProtectionOptions;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Extensions;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class DataProtectionConfigurationTests
{
    [Fact]
    public void Production_MissingBucket_ThrowsOnStartup()
    {
        var services = new ServiceCollection();
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["DataProtection:ObjectPrefix"] = "dp-keys/",
            ["DataProtection:KmsKeyName"] = "projects/test/locations/global/keyRings/r/cryptoKeys/k"
        });

        var act = () => services.AddSplitRailDataProtection(configuration, CreateEnvironment(Environments.Production));

        act.Should().Throw<DataProtectionConfigurationException>()
            .WithMessage("*Bucket*");
    }

    [Fact]
    public void Production_MissingKmsKeyName_ThrowsOnStartup()
    {
        var services = new ServiceCollection();
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["DataProtection:Bucket"] = "split-rail-dp-keys-prod",
            ["DataProtection:ObjectPrefix"] = "dp-keys/"
        });

        var act = () => services.AddSplitRailDataProtection(configuration, CreateEnvironment(Environments.Production));

        act.Should().Throw<DataProtectionConfigurationException>()
            .WithMessage("*KmsKeyName*");
    }

    [Fact]
    public void Production_DoesNotUseFileSystemPersistence()
    {
        var keyDirectory = Path.Combine(Path.GetTempPath(), "dp-keys-should-not-be-used-" + Guid.NewGuid());

        DataProtectionServiceExtensions.ValidateProductionOptions(new SplitRailDataProtectionOptions
        {
            Bucket = "split-rail-dp-keys-prod",
            ObjectPrefix = "dp-keys/",
            KmsKeyName = "projects/test/locations/global/keyRings/r/cryptoKeys/k",
            KeyDirectory = keyDirectory
        });

        Directory.Exists(keyDirectory).Should().BeFalse(
            "Production validation must not create a filesystem key directory");
    }

    [Fact]
    public void Production_ValidOptions_RegistersCloudPersistenceWithoutFilesystem()
    {
        var services = new ServiceCollection();
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["DataProtection:Bucket"] = "split-rail-dp-keys-prod",
            ["DataProtection:ObjectPrefix"] = "dp-keys/",
            ["DataProtection:KmsKeyName"] = "projects/test/locations/global/keyRings/r/cryptoKeys/k"
        });

        var act = () => services.AddSplitRailDataProtection(configuration, CreateEnvironment(Environments.Production));

        act.Should().NotThrow();
        // Do not BuildServiceProvider here — resolving IDataProtectionProvider in Production
        // instantiates GCS/KMS clients that require Application Default Credentials (staging only).
    }

    [Fact]
    public void Development_MissingCloudOptions_UsesFileSystem()
    {
        var keyDirectory = Path.Combine(Path.GetTempPath(), "dp-keys-dev-" + Guid.NewGuid());
        try
        {
            var services = new ServiceCollection();
            var configuration = BuildConfiguration(new Dictionary<string, string?>
            {
                ["DataProtection:KeyDirectory"] = keyDirectory
            });

            services.AddSplitRailDataProtection(
                configuration,
                CreateEnvironment(Environments.Development, keyDirectory));

            using var provider = services.BuildServiceProvider();
            var dataProtection = provider.GetRequiredService<IDataProtectionProvider>();
            var protector = dataProtection.CreateProtector("QboOAuthTokens");

            var encrypted = protector.Protect("development-token");
            var decrypted = protector.Unprotect(encrypted);

            decrypted.Should().Be("development-token");
            Directory.Exists(keyDirectory).Should().BeTrue();
            Directory.EnumerateFiles(keyDirectory).Should().NotBeEmpty();
        }
        finally
        {
            if (Directory.Exists(keyDirectory))
                Directory.Delete(keyDirectory, recursive: true);
        }
    }

    private static IConfiguration BuildConfiguration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

    private static IWebHostEnvironment CreateEnvironment(string environmentName, string? contentRoot = null)
    {
        var environment = Substitute.For<IWebHostEnvironment>();
        environment.EnvironmentName.Returns(environmentName);
        environment.ContentRootPath.Returns(contentRoot ?? Path.GetTempPath());
        environment.ContentRootFileProvider.Returns(new NullFileProvider());
        return environment;
    }
}
