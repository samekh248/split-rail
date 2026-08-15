namespace SplitRail.Api.Services;

public interface IBlockSettlementDocumentRenderer
{
    byte[] Render(string snapshotJson);
}

public sealed class BlockSettlementDocumentRenderer : IBlockSettlementDocumentRenderer
{
    public byte[] Render(string snapshotJson) =>
        System.Text.Encoding.UTF8.GetBytes(snapshotJson);
}
