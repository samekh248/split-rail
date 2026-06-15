namespace SplitRail.Api.Configuration;

public class QboSyncOptions
{
    public const string SectionName = "QboSync";

    public int IntervalHours { get; set; } = 6;

    public bool EnableInProcessTimer { get; set; } = true;

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public string RedirectUri { get; set; } = string.Empty;

    public string InternalTriggerKey { get; set; } = string.Empty;

    public string IntuitAuthBaseUrl { get; set; } = "https://appcenter.intuit.com/connect/oauth2";

    public string IntuitTokenUrl { get; set; } = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

    public string IntuitRevokeUrl { get; set; } = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

    public string IntuitApiBaseUrl { get; set; } = "https://quickbooks.api.intuit.com/v3/company";
}
