namespace SplitRail.Api.Models.Enums;

public enum BlockType
{
    Revenue,
    Expenses,
    DealMath
}

public static class BlockTypeExtensions
{
    public static string ToStorage(this BlockType blockType) => blockType switch
    {
        BlockType.Revenue => "REVENUE",
        BlockType.Expenses => "EXPENSES",
        BlockType.DealMath => "DEAL_MATH",
        _ => throw new ArgumentOutOfRangeException(nameof(blockType))
    };

    public static BlockType FromStorage(string value) => value.ToUpperInvariant() switch
    {
        "REVENUE" => BlockType.Revenue,
        "EXPENSES" => BlockType.Expenses,
        "DEAL_MATH" => BlockType.DealMath,
        _ => throw new ArgumentOutOfRangeException(nameof(value), $"Unknown block type: {value}")
    };
}
