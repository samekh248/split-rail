using FluentAssertions;
using Google.Apis.Storage.v1.Data;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class SettlementArchiveStartupValidatorTests
{
    private static SettlementArchiveOptions DefaultOptions => new()
    {
        BucketName = "split-rail-settlements-prod",
        StagingBucketName = "split-rail-settlements-staging",
        RetentionYears = 7,
        EnforceRetentionValidation = true
    };

    [Fact]
    public void Validate_RejectsArchiveBucketWithInsufficientRetention()
    {
        var options = DefaultOptions;
        var required = SettlementArchiveRetentionPolicyValidator.RetentionPeriodSeconds(options.RetentionYears);
        var archive = new Bucket
        {
            Name = options.BucketName,
            RetentionPolicy = new Bucket.RetentionPolicyData { RetentionPeriod = required / 2 }
        };
        var staging = new Bucket { Name = options.StagingBucketName };

        var act = () => SettlementArchiveRetentionPolicyValidator.Validate(options, archive, staging);

        act.Should().Throw<SettlementArchiveException>()
            .WithMessage("*shorter than required*");
    }

    [Fact]
    public void Validate_RejectsArchiveBucketWithNoRetentionPolicy()
    {
        var options = DefaultOptions;
        var archive = new Bucket { Name = options.BucketName };
        var staging = new Bucket { Name = options.StagingBucketName };

        var act = () => SettlementArchiveRetentionPolicyValidator.Validate(options, archive, staging);

        act.Should().Throw<SettlementArchiveException>()
            .WithMessage("*no Object Retention Policy*");
    }

    [Fact]
    public void Validate_RejectsStagingBucketWithRetentionLock()
    {
        var options = DefaultOptions;
        var required = SettlementArchiveRetentionPolicyValidator.RetentionPeriodSeconds(options.RetentionYears);
        var archive = new Bucket
        {
            Name = options.BucketName,
            RetentionPolicy = new Bucket.RetentionPolicyData { RetentionPeriod = required }
        };
        var staging = new Bucket
        {
            Name = options.StagingBucketName,
            RetentionPolicy = new Bucket.RetentionPolicyData { RetentionPeriod = 86_400 }
        };

        var act = () => SettlementArchiveRetentionPolicyValidator.Validate(options, archive, staging);

        act.Should().Throw<SettlementArchiveException>()
            .WithMessage("*staging bucket*must not have a retention lock*");
    }

    [Fact]
    public void Validate_PassesWhenCorrectlyConfigured()
    {
        var options = DefaultOptions;
        var required = SettlementArchiveRetentionPolicyValidator.RetentionPeriodSeconds(options.RetentionYears);
        var archive = new Bucket
        {
            Name = options.BucketName,
            RetentionPolicy = new Bucket.RetentionPolicyData { RetentionPeriod = required }
        };
        var staging = new Bucket { Name = options.StagingBucketName };

        var act = () => SettlementArchiveRetentionPolicyValidator.Validate(options, archive, staging);

        act.Should().NotThrow();
    }

    [Fact]
    public async Task StartAsync_InDevelopment_SkipsValidationEvenWhenEnforced()
    {
        var options = Options.Create(new SettlementArchiveOptions
        {
            BucketName = "split-rail-settlements-prod",
            EnforceRetentionValidation = true
        });
        var environment = new FakeHostEnvironment { EnvironmentName = Environments.Development };
        var validator = new SettlementArchiveStartupValidator(
            options,
            environment,
            NullLogger<SettlementArchiveStartupValidator>.Instance);

        var act = () => validator.StartAsync(CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task StartAsync_WhenValidationDisabled_SkipsValidationInProduction()
    {
        var options = Options.Create(new SettlementArchiveOptions
        {
            BucketName = "split-rail-settlements-prod",
            EnforceRetentionValidation = false
        });
        var environment = new FakeHostEnvironment { EnvironmentName = Environments.Production };
        var validator = new SettlementArchiveStartupValidator(
            options,
            environment,
            NullLogger<SettlementArchiveStartupValidator>.Instance);

        await validator.StartAsync(CancellationToken.None);
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "split-rail-api.tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
