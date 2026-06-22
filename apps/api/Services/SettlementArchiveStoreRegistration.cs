using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Services;

namespace SplitRail.Api.Services;

public static class SettlementArchiveStoreRegistration
{
    public static bool ShouldUseInMemoryStore(
        IHostEnvironment environment,
        PreviewOptions preview,
        SettlementArchiveOptions archive)
    {
        if (archive.UseInMemoryStore)
            return true;

        if (environment.IsEnvironment("Preview")
            && (preview.UseFakeQboConnector || preview.EnableTestSeeding))
            return true;

        return false;
    }

    public static void Register(IServiceCollection services)
    {
        services.AddSingleton<InMemorySettlementArchiveStore>();
        services.AddSingleton<GcsSettlementArchiveStore>();
        services.AddSingleton<ISettlementArchiveStore>(sp =>
        {
            var environment = sp.GetRequiredService<IHostEnvironment>();
            var preview = sp.GetRequiredService<IOptions<PreviewOptions>>().Value;
            var archive = sp.GetRequiredService<IOptions<SettlementArchiveOptions>>().Value;

            if (ShouldUseInMemoryStore(environment, preview, archive))
                return sp.GetRequiredService<InMemorySettlementArchiveStore>();

            return sp.GetRequiredService<GcsSettlementArchiveStore>();
        });
    }
}
