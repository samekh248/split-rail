using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public sealed class SettlementArchiveStartupValidator : IHostedService
{
    private readonly SettlementArchiveOptions _options;
    private readonly ILogger<SettlementArchiveStartupValidator> _logger;

    public SettlementArchiveStartupValidator(
        IOptions<SettlementArchiveOptions> options,
        IHostEnvironment environment,
        ILogger<SettlementArchiveStartupValidator> logger)
    {
        _ = environment;
        _options = options.Value;
        _logger = logger;
    }

    public static bool ShouldRunRetentionValidation(SettlementArchiveOptions options) =>
        options.EnforceRetentionValidation && !string.IsNullOrWhiteSpace(options.BucketName);

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!ShouldRunRetentionValidation(_options))
            return;

        try
        {
            var client = StorageClient.Create();
            var archiveBucket = await client.GetBucketAsync(_options.BucketName, cancellationToken: cancellationToken);
            var stagingBucket = await client.GetBucketAsync(
                _options.ResolveStagingBucketName(),
                cancellationToken: cancellationToken);

            SettlementArchiveRetentionPolicyValidator.Validate(_options, archiveBucket, stagingBucket);

            _logger.LogInformation(
                "Settlement archive retention policy validated for bucket {ArchiveBucket} (staging: {StagingBucket})",
                _options.BucketName,
                _options.ResolveStagingBucketName());
        }
        catch (SettlementArchiveException ex)
        {
            _logger.LogError(
                ex,
                "Settlement archive bucket misconfiguration detected for {ArchiveBucket}",
                _options.BucketName);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to validate settlement archive retention for bucket {ArchiveBucket}",
                _options.BucketName);
            throw new SettlementArchiveException(
                "Failed to validate settlement archive bucket retention policy.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
