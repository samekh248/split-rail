using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SplitRail.Api.Models;

namespace SplitRail.Api.Tests.TestSupport;

public sealed class QboSyncLedgerAppendOnlyInterceptor : SaveChangesInterceptor
{
    public List<QboSyncLedger> Violations { get; } = [];

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        CaptureViolations(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        CaptureViolations(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void CaptureViolations(DbContext? context)
    {
        if (context is null)
            return;

        foreach (var entry in context.ChangeTracker.Entries<QboSyncLedger>())
        {
            if (entry.State is EntityState.Modified or EntityState.Deleted)
                Violations.Add(entry.Entity);
        }
    }
}
