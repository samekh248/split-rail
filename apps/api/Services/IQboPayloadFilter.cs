using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Qbo;

namespace SplitRail.Api.Services;

public interface IQboPayloadFilter
{
    SyncStatusDto Apply(SyncStatusDto status);

    LedgerGridResponse Apply(LedgerGridResponse ledger, bool qboConnected);

    DashboardResponse Apply(DashboardResponse dashboard, bool qboConnected);
}

public class QboPayloadFilter : IQboPayloadFilter
{
    public SyncStatusDto Apply(SyncStatusDto status)
    {
        if (status.QboConnected)
            return status;

        return status with
        {
            TotalMappedTransactions = null,
            TotalUnmappedTransactions = null,
            LastSyncedAt = null,
            LastSyncBatchId = null
        };
    }

    public LedgerGridResponse Apply(LedgerGridResponse ledger, bool qboConnected)
    {
        if (qboConnected)
            return ledger;

        var blocks = ledger.Blocks
            .Select(block => block with
            {
                Rows = block.Rows
                    .Select(row => row with
                    {
                        QboActualValue = null,
                        Variance = null,
                        HasQboCorrection = null
                    })
                    .ToList(),
                BlockTotals = block.BlockTotals with { QboActual = null }
            })
            .ToList();

        return ledger with { Blocks = blocks };
    }

    public DashboardResponse Apply(DashboardResponse dashboard, bool qboConnected)
    {
        if (qboConnected || dashboard.FinancialHealth is null)
            return dashboard;

        return dashboard with
        {
            FinancialHealth = dashboard.FinancialHealth with
            {
                ActualQboDeposits = null,
                Variance = null
            }
        };
    }
}
