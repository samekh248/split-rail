namespace SplitRail.Api.Configuration;

public class ContentSecurityPolicyOptions
{
    public const string SectionName = "ContentSecurityPolicy";

    public const string ProductionPolicy =
        "default-src 'self'; script-src 'self'; connect-src 'self' *.quickbooks.com *.googleapis.com; object-src 'none';";

    public const string DevelopmentStyleSrcSuffix = " style-src 'self' 'unsafe-inline'";

    public string HeaderName { get; set; } = "Content-Security-Policy";

    public static string GetPolicyForEnvironment(bool isDevelopment) =>
        isDevelopment ? ProductionPolicy + DevelopmentStyleSrcSuffix : ProductionPolicy;
}
