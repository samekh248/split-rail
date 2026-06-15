namespace SplitRail.Api.Models;

public class QboAccountMapping
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string QboAccountId { get; set; } = string.Empty;
    public string QboAccountName { get; set; } = string.Empty;
    public string MappedCategoryLabel { get; set; } = string.Empty;
    public Guid? MappedLineItemId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Venue Venue { get; set; } = null!;
    public FinancialLineItem? MappedLineItem { get; set; }
}
