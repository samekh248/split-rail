namespace SplitRail.Api.Services;

public static class NightlyDispatchSelector
{
    public static bool IsOrganizationEligible(string timeZoneId, DateTimeOffset utcNow)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return false;

        try
        {
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTime(utcNow, timeZone);
            return local.Hour == 3 && local.Minute < 15;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }
}
