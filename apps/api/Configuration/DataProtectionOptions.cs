namespace SplitRail.Api.Configuration;

public class DataProtectionOptions
{
    public const string SectionName = "DataProtection";

    public string ApplicationName { get; set; } = "split-rail-api";

    /// <summary>GCS bucket for Production key ring XML (required in Production).</summary>
    public string Bucket { get; set; } = string.Empty;

    /// <summary>Object prefix within the bucket for key ring files (required in Production).</summary>
    public string ObjectPrefix { get; set; } = string.Empty;

    /// <summary>Full Cloud KMS crypto key resource name (required in Production).</summary>
    public string KmsKeyName { get; set; } = string.Empty;

    /// <summary>
    /// Optional filesystem override for non-Production environments and integration tests.
    /// Defaults to {ContentRoot}/dp-keys when unset.
    /// </summary>
    public string? KeyDirectory { get; set; }
}
