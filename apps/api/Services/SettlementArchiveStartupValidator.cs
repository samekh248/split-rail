using Google;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public sealed class SettlementArchiveStartupValidator : IHostedService
{
    private readonly SettlementArchiveOptions _options;
    private readonly IHostEnvironment _environment;
    private readonly PreviewOptions _preview;
    private readonly ILogger<SettlementArchiveStartupValidator> _logger;

    public SettlementArchiveStartupValidator(
        IOptions<SettlementArchiveOptions> options,
        IOptions<PreviewOptions> preview,
        IHostEnvironment environment,
        ILogger<SettlementArchiveStartupValidator> logger)
    {
        _options = options.Value;
        _preview = preview.Value;
        _environment = environment;
        _logger = logger;
    }

    public static bool ShouldRunRetentionValidation(
        SettlementArchiveOptions options,
        IHostEnvironment environment,
        PreviewOptions preview) =>
        options.EnforceRetentionValidation
        && !string.IsNullOrWhiteSpace(options.BucketName)
        && !SettlementArchiveStoreRegistration.ShouldUseInMemoryStore(environment, preview, options);

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!ShouldRunRetentionValidation(_options, _environment, _preview))
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
        catch (GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogError(
                ex,
                "Settlement archive bucket not found: {ArchiveBucket}",
                _options.BucketName);
            throw new SettlementArchiveException(
                $"Settlement archive bucket '{_options.BucketName}' was not found. " +
                "Provision buckets via deploy/infra/provision-settlement-buckets.ps1 (Windows) or " +
                "deploy/infra/provision-settlement-buckets.sh (ENV=dev), " +
                "or set SettlementArchive:EnforceRetentionValidation to false for local development.");
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
