namespace SplitRail.Api.Tests.Integration;

public abstract class TestSeedingIntegrationTestBase : IntegrationTestBase
{
    protected override bool ReplaceSettlementArchiveStore => true;

    protected override void AddAppConfiguration(Dictionary<string, string?> config)
    {
        base.AddAppConfiguration(config);
        config["Preview:EnableTestSeeding"] = "true";
        config["Preview:UseFakeQboConnector"] = "true";
    }
}
