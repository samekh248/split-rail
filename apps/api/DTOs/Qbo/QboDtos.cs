namespace SplitRail.Api.DTOs.Qbo;

using System.Text.Json.Serialization;
using SplitRail.Api.Serialization;

public record SyncResultDto(
    Guid EventId,
    Guid SyncBatchId,
    int TransactionsProcessed,
    int TransactionsMapped,
    int TransactionsUnmapped,
    IReadOnlyList<string> UnmappedAccountIds,
    DateTimeOffset SyncedAt);

public record SyncStatusDto(
    Guid EventId,
    DateTimeOffset? LastSyncedAt,
    Guid? LastSyncBatchId,
    int? TotalMappedTransactions,
    int? TotalUnmappedTransactions,
    bool QboConnected);

public record QboTrackingRefDto(string Type, string Id, string Name);

public record QboTrackingCatalogDto(IReadOnlyList<QboTrackingRefDto> Items);

public record QboTrackingMappingDto(
    Guid Id,
    string QboTrackingType,
    string QboTrackingId,
    string QboTrackingName,
    string TargetTier,
    Guid TargetEntityId,
    string? TargetDisplayName,
    DateTimeOffset CreatedAt);

public record QboTrackingMappingsResponse(
    Guid VenueId,
    IReadOnlyList<QboTrackingMappingDto> Mappings);

public record CreateTrackingMappingRequest(
    string QboTrackingType,
    string QboTrackingId,
    string QboTrackingName,
    string TargetTier,
    Guid TargetEntityId);

public record UpdateTrackingMappingRequest(
    string TargetTier,
    Guid TargetEntityId);

public record VenueQboIntegrationDto(
    Guid VenueId,
    bool QboConnected,
    string ConnectionState,
    string? CompanyName,
    string? RealmId,
    DateTimeOffset? LastSyncedAt,
    bool CanPurgeCache);

public record QboConnectUrlDto(string AuthUrl);

public record OrganizationQboSummaryDto(
    Guid OrganizationId,
    bool IsQboConnected,
    int ConnectedVenueCount,
    int TotalVenueCount);

public record QboAccountMappingDto(
    Guid Id,
    string QboAccountId,
    string QboAccountName,
    string MappedCategoryLabel,
    Guid? MappedLineItemId,
    DateTimeOffset CreatedAt);

public record QboAccountMappingsResponse(Guid VenueId, IReadOnlyList<QboAccountMappingDto> Mappings);

public record CreateMappingRequest(
    string QboAccountId,
    string QboAccountName,
    string MappedCategoryLabel,
    Guid? MappedLineItemId);

public record UpdateMappingRequest(
    string MappedCategoryLabel,
    Guid? MappedLineItemId);

public record UnmappedTransactionDto(
    Guid Id,
    string QboTransactionId,
    string QboAccountId,
    string QboAccountName,
    [property: JsonConverter(typeof(DecimalStringJsonConverter))] decimal Amount,
    DateOnly TransactionDate,
    DateTimeOffset SyncedAt);

public record UnmappedTransactionsResponse(
    Guid EventId,
    Guid VenueId,
    int UnmappedCount,
    IReadOnlyList<UnmappedTransactionDto> Transactions);

public record UnmappedCountDto(Guid EventId, int UnmappedCount);

public record VenueQboStatusDto(
    Guid VenueId,
    bool QboConnected,
    DateTimeOffset? LastSyncedAt);

public record VenueSyncEventResultDto(
    Guid EventId,
    string Title,
    bool Success,
    string? ErrorMessage);

public record VenueSyncResultDto(
    Guid VenueId,
    int AttemptedCount,
    int SucceededCount,
    IReadOnlyList<VenueSyncEventResultDto> Results);
