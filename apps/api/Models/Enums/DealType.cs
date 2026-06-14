namespace SplitRail.Api.Models.Enums;

public enum DealType
{
    Guarantee,
    DoorSplit,
    Custom
}

public static class DealTypeExtensions
{
    public static string ToStorage(this DealType dealType) => dealType switch
    {
        DealType.Guarantee => "guarantee",
        DealType.DoorSplit => "door_split",
        DealType.Custom => "custom",
        _ => throw new ArgumentOutOfRangeException(nameof(dealType))
    };

    public static DealType FromStorage(string value) => value.ToLowerInvariant() switch
    {
        "guarantee" => DealType.Guarantee,
        "door_split" => DealType.DoorSplit,
        "custom" => DealType.Custom,
        _ => throw new ArgumentOutOfRangeException(nameof(value), $"Unknown deal type: {value}")
    };
}
