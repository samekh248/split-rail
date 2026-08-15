using System.Text.Json;
using SplitRail.Api.Data;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

/// <summary>
/// Single write path for the festival audit trail. Serving every festival auditability
/// requirement through one table keeps the shape consistent across schedule history,
/// status changes, allocation edits, publish changes, and ledger access.
///
/// Entries are added to the change tracker but NOT saved — callers commit them in the same
/// SaveChanges as the change being audited, so an audit entry can never exist for a mutation
/// that rolled back.
/// </summary>
public class FestivalAuditService
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = false
    };

    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public FestivalAuditService(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public FestivalAuditEntry Record(
        Guid eventId,
        string entityType,
        Guid entityId,
        string action,
        object? priorValue = null,
        object? newValue = null,
        string? reason = null)
    {
        var entry = new FestivalAuditEntry
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            PriorValueJson = Serialize(priorValue),
            NewValueJson = Serialize(newValue),
            UserId = _tenantContext.UserId ?? Guid.Empty,
            OccurredAt = DateTimeOffset.UtcNow,
            Reason = reason
        };

        _db.FestivalAuditEntries.Add(entry);
        return entry;
    }

    private static string? Serialize(object? value) =>
        value is null ? null : JsonSerializer.Serialize(value, SerializerOptions);
}
