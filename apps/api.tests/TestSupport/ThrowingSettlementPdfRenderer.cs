using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;

namespace SplitRail.Api.Tests.TestSupport;

public sealed class ThrowingSettlementPdfRenderer : ISettlementPdfRenderer
{
    public bool ThrowOnRender { get; set; }

    public byte[] Render(SettlementSnapshotDto snapshot, IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes)
    {
        if (ThrowOnRender)
            throw new SettlementArchiveException("Simulated PDF render failure.");

        return new SettlementPdfRenderer().Render(snapshot, strokes);
    }
}
