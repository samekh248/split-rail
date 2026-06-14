namespace SplitRail.Api.Models;

public class EventArtist
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string ArtistName { get; set; } = string.Empty;
    public int PerformanceOrder { get; set; } = 1;
    public string DealType { get; set; } = string.Empty;
    public string? CustomFormulaExpression { get; set; }
    public decimal BaseGuarantee { get; set; }
    public decimal BackendPercentage { get; set; }
    public decimal TaxWithholdingPercentage { get; set; }
    public decimal CalculatedNetPayout { get; set; }
    public uint Xmin { get; set; }

    public Event Event { get; set; } = null!;
}
