namespace SplitRail.Api.Constants;

public static class TimeDisplayFormats
{
    public const string Default = "12h";

    public static readonly string[] Allowed =
    [
        "12h",
        "24h",
    ];

    public static bool IsAllowed(string? value) =>
        value != null && Allowed.Contains(value, StringComparer.Ordinal);
}
