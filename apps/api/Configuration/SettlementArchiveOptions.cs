namespace SplitRail.Api.Configuration;

public class SettlementArchiveOptions
{
    public const string SectionName = "SettlementArchive";

    public string BucketName { get; set; } = string.Empty;

    /// <summary>Deletable staging bucket; defaults to {BucketName}-staging when unset.</summary>
    public string? StagingBucketName { get; set; }

    public int SignedUrlTtlMinutes { get; set; } = 15;

    public string ResolveStagingBucketName() =>
        string.IsNullOrWhiteSpace(StagingBucketName)
            ? $"{BucketName}-staging"
            : StagingBucketName;
}
