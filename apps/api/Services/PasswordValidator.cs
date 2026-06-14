using System.Text.RegularExpressions;

namespace SplitRail.Api.Services;

public static class PasswordValidator
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && email.Length <= 255 && EmailRegex.IsMatch(email);

    public static IReadOnlyList<string> ValidatePassword(string password)
    {
        var errors = new List<string>();
        if (string.IsNullOrEmpty(password) || password.Length < 8)
            errors.Add("Password must be at least 8 characters.");
        if (!password.Any(char.IsUpper))
            errors.Add("Password must contain at least one uppercase letter.");
        if (!password.Any(char.IsLower))
            errors.Add("Password must contain at least one lowercase letter.");
        if (!password.Any(char.IsDigit))
            errors.Add("Password must contain at least one digit.");
        return errors;
    }
}

public static class RoleNames
{
    public const string Admin = "Admin";
    public const string VenueManager = "Venue Manager";
    public const string Promoter = "Promoter";
    public const string ExternalBookkeeper = "External Bookkeeper";
}

public static class PermissionNames
{
    public const string ManagePermissions = "can_manage_permissions";
    public const string LockBudget = "can_lock_budget";
    public const string EditSettlement = "can_edit_settlement";
    public const string SignSettlement = "can_sign_settlement";
    public const string TriggerQboSync = "can_trigger_qbo_sync";
    public const string MapQboAccounts = "can_map_qbo_accounts";
    public const string ViewFinancials = "can_view_financials";
}
