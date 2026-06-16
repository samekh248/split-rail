namespace SplitRail.Api.DTOs.Seeding;

public record OrgSeedContextDto(
    Guid OrganizationId,
    string AdminEmail,
    string AdminPassword,
    string ScopedUserEmail,
    string ScopedUserPassword,
    Guid InScopeVenueId,
    Guid OutOfScopeVenueId,
    Guid AdminUserId,
    Guid ScopedUserId);

public record SeedSentinelsDto(
    IReadOnlyList<string> OrgAString,
    IReadOnlyList<string> OrgBStrings);

public record ResetSeedResponseDto(
    OrgSeedContextDto OrgA,
    OrgSeedContextDto OrgB,
    SeedSentinelsDto Sentinels);

public record LifecycleEventSeedRequestDto(
    Guid OrganizationId,
    Guid VenueId);

public record ExpectedSettlementDto(
    string ComputedNetPayout,
    string GrossRevenue,
    string NetShowRevenue);

public record LifecycleEventSeedResponseDto(
    Guid EventId,
    Guid VenueId,
    string QboTagName,
    ExpectedSettlementDto ExpectedSettlement,
    IReadOnlyDictionary<string, string> ExpectedVariance);

public record QboEgressRecordDto(string Method, string Host, DateTimeOffset Timestamp);

public record SettlementPdfHashResponseDto(string HashHex);

public record MutateSettledEventRequestDto(Guid EventId, decimal NewSettlementValue);

public record MutateSettledEventResponseDto(bool Rejected, string? Message);
