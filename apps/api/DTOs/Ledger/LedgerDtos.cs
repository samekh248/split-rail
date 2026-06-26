using System.Globalization;
using System.Text.Json.Serialization;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Serialization;

namespace SplitRail.Api.DTOs.Ledger;

public static class MoneyFormat
{
    public static string ToMoneyString(decimal value) =>
        value.ToString("F2", CultureInfo.InvariantCulture);

    public static decimal ParseMoney(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0m;
        return decimal.Parse(value, CultureInfo.InvariantCulture);
    }
}

public static class RowVersionFormat
{
    public static string ToRowVersion(uint xmin) =>
        Convert.ToBase64String(BitConverter.GetBytes(xmin));

    public static uint FromRowVersion(string rowVersion)
    {
        var bytes = Convert.FromBase64String(rowVersion);
        return BitConverter.ToUInt32(bytes, 0);
    }
}

public record EditabilityDto(
    string Proforma,
    string Settlement,
    string QboActuals);

public record BlockTotalsDto(
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal Proforma,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal Settlement,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    decimal? QboActual = null);

public record LineItemDto(
    Guid Id,
    string RowLabel,
    int SortOrder,
    bool IsArtistDeduction,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal ProformaValue,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal SettlementValue,
    bool VarianceFlagged,
    string? Notes,
    bool IsHiddenFromPromoter,
    string RowVersion,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    decimal? QboActualValue = null,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    decimal? Variance = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    bool? HasQboCorrection = null);

public record EventArtistDto(
    Guid Id,
    string ArtistName,
    int PerformanceOrder,
    string DealType,
    string? CustomFormulaExpression,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BaseGuarantee,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BackendPercentage,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal TaxWithholdingPercentage,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal CalculatedNetPayout,
    string RowVersion);

public record LedgerBlockDto(
    string BlockType,
    IReadOnlyList<LineItemDto> Rows,
    BlockTotalsDto BlockTotals);

public record LedgerSummaryDto(
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal GrossRevenue,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal TotalDeductions,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal NetShowRevenue);

public record LedgerGridResponse(
    Guid EventId,
    Guid VenueId,
    string Title,
    string EventDate,
    string Status,
    bool IsBudgetLocked,
    string QboTagName,
    EditabilityDto Editability,
    IReadOnlyList<LedgerBlockDto> Blocks,
    IReadOnlyList<EventArtistDto> Artists,
    LedgerSummaryDto Summary,
    DateTimeOffset? SettledAt = null,
    bool SettlementPdfAvailable = false);

public record EventResponse(
    Guid EventId,
    Guid VenueId,
    string Title,
    string EventDate,
    string Status,
    bool IsBudgetLocked,
    string QboTagName,
    EditabilityDto Editability,
    DateTimeOffset? SettledAt = null,
    bool SettlementPdfAvailable = false,
    DateTimeOffset? ReconciledAt = null,
    Guid? ReconciledByUserId = null,
    string BookingPlacementStatus = "CONFIRMED",
    string? DoorsTime = null,
    string? LoadInTime = null,
    string? CurfewTime = null,
    string? SupportLineup = null,
    bool WorkspaceAllowed = true);

public record CreateEventRequest(
    string Title,
    string EventDate,
    string? QboTagName,
    string? BookingPlacementStatus = null,
    string? DoorsTime = null,
    string? LoadInTime = null,
    string? CurfewTime = null,
    string? SupportLineup = null);

public record UpdateEventRequest(
    string Title,
    string EventDate,
    string? QboTagName,
    string? BookingPlacementStatus = null,
    string? DoorsTime = null,
    string? LoadInTime = null,
    string? CurfewTime = null,
    string? SupportLineup = null);

public record CreateLineItemRequest(
    string BlockType,
    string RowLabel,
    int SortOrder,
    bool IsArtistDeduction,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal ProformaValue,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal SettlementValue,
    string? Notes,
    bool IsHiddenFromPromoter = false);

public record UpdateLineItemRequest(
    string RowLabel,
    int SortOrder,
    bool IsArtistDeduction,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal ProformaValue,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal SettlementValue,
    string? Notes,
    bool IsHiddenFromPromoter,
    string RowVersion);

public record CreateArtistRequest(
    string ArtistName,
    int PerformanceOrder,
    string DealType,
    string? CustomFormulaExpression,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BaseGuarantee,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BackendPercentage,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal TaxWithholdingPercentage);

public record UpdateArtistRequest(
    string ArtistName,
    int PerformanceOrder,
    string DealType,
    string? CustomFormulaExpression,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BaseGuarantee,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal BackendPercentage,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal TaxWithholdingPercentage,
    string RowVersion);

public static class EventStatusFormat
{
    public static string ToApiString(EventStatus status) => status switch
    {
        EventStatus.PreShow => "PRE_SHOW",
        EventStatus.Settled => "SETTLED",
        EventStatus.Reconciled => "RECONCILED",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static EventStatus FromApiString(string value) => value switch
    {
        "PRE_SHOW" => EventStatus.PreShow,
        "SETTLED" => EventStatus.Settled,
        "RECONCILED" => EventStatus.Reconciled,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown event status.")
    };
}
