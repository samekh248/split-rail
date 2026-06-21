using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;

namespace SplitRail.Api.Data.Interceptors;

public sealed class FrozenEventImmutabilityInterceptor : SaveChangesInterceptor
{
    private readonly IFrozenEventSaveContext _saveContext;
    private readonly FrozenEventMutationAuditor _auditor;
    private readonly ITenantContext _tenantContext;

    public FrozenEventImmutabilityInterceptor(
        IFrozenEventSaveContext saveContext,
        FrozenEventMutationAuditor auditor,
        ITenantContext tenantContext)
    {
        _saveContext = saveContext;
        _auditor = auditor;
        _tenantContext = tenantContext;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ValidateChanges(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ValidateChanges(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ValidateChanges(DbContext? context)
    {
        if (context is null)
            return;

        var parentEvents = LoadParentEventSnapshots(context);

        foreach (var entry in context.ChangeTracker.Entries<Event>())
            ValidateEventEntry(entry);

        foreach (var entry in context.ChangeTracker.Entries<EventArtist>())
            ValidateEventArtistEntry(entry, parentEvents);

        foreach (var entry in context.ChangeTracker.Entries<FinancialLineItem>())
            ValidateLineItemEntry(entry, parentEvents);
    }

    private void ValidateEventEntry(EntityEntry<Event> entry)
    {
        if (entry.State is EntityState.Unchanged or EntityState.Detached or EntityState.Added)
            return;

        var originalStatus = GetOriginalEventStatus(entry);
        if (!IsFrozenStatus(originalStatus))
            return;

        if (entry.State == EntityState.Deleted)
        {
            Reject(
                new EventSnapshot(entry.Entity.Id, entry.Entity.VenueId, originalStatus),
                FrozenEventMutationOperation.PersistenceDeleteEvent,
                originalStatus);
            return;
        }

        if (entry.State == EntityState.Modified &&
            !IsAuthorizedFrozenEventModification(entry, originalStatus))
        {
            Reject(
                new EventSnapshot(entry.Entity.Id, entry.Entity.VenueId, originalStatus),
                FrozenEventMutationOperation.PersistenceUpdateEvent,
                originalStatus);
        }
    }

    private void ValidateEventArtistEntry(
        EntityEntry<EventArtist> entry,
        IReadOnlyDictionary<Guid, EventSnapshot> parentEvents)
    {
        if (entry.State is EntityState.Unchanged or EntityState.Detached)
            return;

        if (!TryGetFrozenParent(entry.Entity.EventId, parentEvents, out var parent))
            return;

        var operation = entry.State switch
        {
            EntityState.Added => FrozenEventMutationOperation.PersistenceCreateArtist,
            EntityState.Deleted => FrozenEventMutationOperation.PersistenceDeleteArtist,
            _ => FrozenEventMutationOperation.PersistenceUpdateArtist
        };

        Reject(parent, operation, parent.Status);
    }

    private void ValidateLineItemEntry(
        EntityEntry<FinancialLineItem> entry,
        IReadOnlyDictionary<Guid, EventSnapshot> parentEvents)
    {
        if (entry.State is EntityState.Unchanged or EntityState.Detached)
            return;

        if (!TryGetFrozenParent(entry.Entity.EventId, parentEvents, out var parent))
            return;

        if (entry.State == EntityState.Modified && IsOnlyQboActualsUpdate(entry))
            return;

        var operation = entry.State switch
        {
            EntityState.Added => FrozenEventMutationOperation.PersistenceCreateLineItem,
            EntityState.Deleted => FrozenEventMutationOperation.PersistenceDeleteLineItem,
            _ => FrozenEventMutationOperation.PersistenceUpdateLineItem
        };

        Reject(parent, operation, parent.Status);
    }

    private bool IsAuthorizedFrozenEventModification(EntityEntry<Event> entry, EventStatus originalStatus)
    {
        var reason = _saveContext.CurrentReason;
        var currentStatus = entry.Entity.Status;

        return reason switch
        {
            FrozenEventSaveReason.SettlementReversal =>
                originalStatus == EventStatus.Settled &&
                currentStatus == EventStatus.PreShow,
            FrozenEventSaveReason.EventReconciliation =>
                originalStatus == EventStatus.Settled &&
                currentStatus == EventStatus.Reconciled,
            _ => false
        };
    }

    private static bool IsOnlyQboActualsUpdate(EntityEntry<FinancialLineItem> entry)
    {
        if (entry.State != EntityState.Modified)
            return false;

        var hasPermittedChange = false;
        foreach (var property in entry.Properties)
        {
            if (!property.IsModified)
                continue;

            if (property.Metadata.Name is nameof(FinancialLineItem.QboActualValue)
                or nameof(FinancialLineItem.UpdatedAt))
            {
                hasPermittedChange = true;
                continue;
            }

            return false;
        }

        return hasPermittedChange;
    }

    private static EventStatus GetOriginalEventStatus(EntityEntry<Event> entry)
    {
        if (entry.State == EntityState.Added)
            return entry.Entity.Status;

        return (EventStatus)entry.OriginalValues[nameof(Event.Status)]!;
    }

    private static bool IsFrozenStatus(EventStatus status) =>
        status is EventStatus.Settled or EventStatus.Reconciled;

    private static bool TryGetFrozenParent(
        Guid eventId,
        IReadOnlyDictionary<Guid, EventSnapshot> parentEvents,
        out EventSnapshot parent)
    {
        if (!parentEvents.TryGetValue(eventId, out parent!))
            return false;

        return IsFrozenStatus(parent.Status);
    }

    private Dictionary<Guid, EventSnapshot> LoadParentEventSnapshots(DbContext context)
    {
        var eventIds = new HashSet<Guid>();

        foreach (var entry in context.ChangeTracker.Entries<EventArtist>())
        {
            if (entry.State is EntityState.Unchanged or EntityState.Detached)
                continue;
            eventIds.Add(entry.Entity.EventId);
        }

        foreach (var entry in context.ChangeTracker.Entries<FinancialLineItem>())
        {
            if (entry.State is EntityState.Unchanged or EntityState.Detached)
                continue;
            eventIds.Add(entry.Entity.EventId);
        }

        if (eventIds.Count == 0)
            return new Dictionary<Guid, EventSnapshot>();

        return context.Set<Event>()
            .AsNoTracking()
            .Where(e => eventIds.Contains(e.Id))
            .Select(e => new EventSnapshot(e.Id, e.VenueId, e.Status))
            .AsEnumerable()
            .ToDictionary(e => e.Id);
    }

    private void Reject(EventSnapshot snapshot, string operation, EventStatus status)
    {
        var evt = new Event
        {
            Id = snapshot.Id,
            VenueId = snapshot.VenueId,
            Status = status
        };

        _auditor.RejectIfFrozen(evt, snapshot.VenueId, _tenantContext.UserId, operation);
    }

    private sealed record EventSnapshot(Guid Id, Guid VenueId, EventStatus Status);
}
