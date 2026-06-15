using System.Text.Json.Serialization;
using SplitRail.Api.DTOs.Ledger;

namespace SplitRail.Api.DTOs.Settlement;

public record FinalizeSettlementRequest(string SignatureData, bool Confirmed);

public record ReverseSettlementRequest(string Reason);

public record SettlementResultDto(
    Guid EventId,
    string Status,
    DateTimeOffset? SettledAt,
    Guid? SettledByUserId,
    bool SettlementPdfAvailable,
    EditabilityDto Editability);

public record SettlementPdfLinkDto(string Url, DateTimeOffset ExpiresAt);

public record SettlementSnapshotDto(
    string EventTitle,
    string EventDate,
    string VenueName,
    string OrganizationName,
    IReadOnlyList<SettlementLineItemSnapshot> LineItems,
    IReadOnlyList<SettlementArtistSnapshot> Artists,
    SettlementSummarySnapshot Summary);

public record SettlementLineItemSnapshot(
    string BlockType,
    string RowLabel,
    int SortOrder,
    bool IsArtistDeduction,
    string SettlementValue);

public record SettlementArtistSnapshot(
    string ArtistName,
    int PerformanceOrder,
    string DealType,
    string CalculatedNetPayout);

public record SettlementSummarySnapshot(
    string GrossRevenue,
    string TotalDeductions,
    string NetShowRevenue);
