namespace SplitRail.Api.Configuration;

public class PreviewOptions
{
    public const string SectionName = "Preview";

    public bool UseFakeQboConnector { get; set; }

    public bool EnableTestSeeding { get; set; }
}
