namespace SplitRail.Api.DTOs.Qbo;

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
    int TotalMappedTransactions,
    int TotalUnmappedTransactions,
    bool QboConnected);

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
    decimal Amount,
    DateOnly TransactionDate,
    DateTimeOffset SyncedAt);

public record UnmappedTransactionsResponse(
    Guid EventId,
    Guid VenueId,
    int UnmappedCount,
    IReadOnlyList<UnmappedTransactionDto> Transactions);

public record UnmappedCountDto(Guid EventId, int UnmappedCount);
