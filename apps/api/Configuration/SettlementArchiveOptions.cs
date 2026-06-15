namespace SplitRail.Api.Configuration;

public class SettlementArchiveOptions
{
    public const string SectionName = "SettlementArchive";

    public string BucketName { get; set; } = string.Empty;

    public int SignedUrlTtlMinutes { get; set; } = 15;
}
