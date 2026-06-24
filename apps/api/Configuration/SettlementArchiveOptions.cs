namespace SplitRail.Api.Configuration;

public class SettlementArchiveOptions
{
    public const string SectionName = "SettlementArchive";

    public string BucketName { get; set; } = string.Empty;

    /// <summary>Deletable staging bucket; defaults to {BucketName}-staging when unset.</summary>
    public string? StagingBucketName { get; set; }

    public int SignedUrlTtlMinutes { get; set; } = 15;

    /// <summary>Per-object retention duration applied on promote to the archive bucket.</summary>
    public int RetentionYears { get; set; } = 7;

    /// <summary>When true (Production default), startup validates archive bucket retention policy.</summary>
    public bool EnforceRetentionValidation { get; set; } = true;

    /// <summary>Force in-memory archive store (local/tests only — never set in deploy scripts).</summary>
    public bool UseInMemoryStore { get; set; }

    public string ResolveStagingBucketName() =>
        string.IsNullOrWhiteSpace(StagingBucketName)
            ? $"{BucketName}-staging"
            : StagingBucketName;
}
