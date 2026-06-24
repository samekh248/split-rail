using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public static class NameValidation
{
    public const int MaxLength = 200;

    /// <summary>
    /// Validates and normalizes a resource name: requires non-empty content, trims surrounding
    /// whitespace, and enforces the shared maximum length. Applied consistently to create and
    /// update for organizations and venues.
    /// </summary>
    public static string Normalize(string? name, string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException($"{fieldLabel} is required.");

        var trimmed = name.Trim();

        if (trimmed.Length > MaxLength)
            throw new ValidationException($"{fieldLabel} must be {MaxLength} characters or fewer.");

        return trimmed;
    }
}
