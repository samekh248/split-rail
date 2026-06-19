using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public static class LedgerVarianceHelper
{
    public static bool HasVarianceConcern(IEnumerable<FinancialLineItem> lineItems) =>
        lineItems.Any(li => Math.Abs(li.QboActualValue - li.SettlementValue) > 0m);
}
