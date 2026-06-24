using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace SplitRail.Api.Tests.TestSupport;

public sealed class SaveChangesFailureInterceptor : SaveChangesInterceptor
{
    public bool ThrowOnNextSave { get; set; }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        if (ThrowOnNextSave)
        {
            ThrowOnNextSave = false;
            throw new InvalidOperationException("Simulated SaveChanges failure.");
        }

        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (ThrowOnNextSave)
        {
            ThrowOnNextSave = false;
            throw new InvalidOperationException("Simulated SaveChanges failure.");
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
