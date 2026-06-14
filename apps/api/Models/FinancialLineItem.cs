namespace SplitRail.Api.Models;

public class FinancialLineItem
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string BlockType { get; set; } = string.Empty;
    public string RowLabel { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsArtistDeduction { get; set; }
    public decimal ProformaValue { get; set; }
    public decimal SettlementValue { get; set; }
    public decimal QboActualValue { get; set; }
    public string? Notes { get; set; }
    public bool IsHiddenFromPromoter { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public uint Xmin { get; set; }

    public Event Event { get; set; } = null!;
}
