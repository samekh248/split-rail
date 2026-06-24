using SplitRail.Api.DTOs.Settlement;

namespace SplitRail.Api.Services;

public interface ISettlementPdfRenderer
{
    byte[] Render(SettlementSnapshotDto snapshot, IReadOnlyList<IReadOnlyList<SignaturePoint>> strokes);
}
