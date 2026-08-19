namespace SplitRail.Api.Constants;

public static class DateDisplayFormats
{
    public const string Default = "MM/dd/yyyy";

    public static readonly string[] Allowed =
    [
        "MM/dd/yyyy",
        "dd/MM/yyyy",
        "yyyy-MM-dd",
        "MMM d, yyyy",
    ];

    public static bool IsAllowed(string? value) =>
        value != null && Allowed.Contains(value, StringComparer.Ordinal);
}
