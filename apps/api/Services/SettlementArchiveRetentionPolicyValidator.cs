using Google.Apis.Storage.v1.Data;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public static class SettlementArchiveRetentionPolicyValidator
{
    public static void Validate(SettlementArchiveOptions options, Bucket archiveBucket, Bucket stagingBucket)
    {
        var requiredSeconds = RetentionPeriodSeconds(options.RetentionYears);

        var archiveRetention = archiveBucket.RetentionPolicy?.RetentionPeriod;
        if (archiveRetention is null or 0)
        {
            throw new SettlementArchiveException(
                $"Settlement archive bucket '{archiveBucket.Name}' has no Object Retention Policy configured.");
        }

        if (archiveRetention < requiredSeconds)
        {
            throw new SettlementArchiveException(
                $"Settlement archive bucket '{archiveBucket.Name}' retention period is shorter than required {options.RetentionYears} years.");
        }

        var stagingRetention = stagingBucket.RetentionPolicy?.RetentionPeriod;
        if (stagingRetention is > 0)
        {
            throw new SettlementArchiveException(
                $"Settlement staging bucket '{stagingBucket.Name}' must not have a retention lock (orphan cleanup requires deletable staging objects).");
        }
    }

    public static long RetentionPeriodSeconds(int retentionYears) =>
        (long)(retentionYears * 365.25 * 24 * 3600);
}
