using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SplitRail.Api.Tests.TestSupport;

public sealed class LogCapturingWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly Action<IWebHostBuilder> _configureWebHost;

    public LogCapturingWebApplicationFactory(
        TestLogCollector logCollector,
        Action<IWebHostBuilder> configureWebHost)
    {
        LogCollector = logCollector;
        _configureWebHost = configureWebHost;
    }

    public TestLogCollector LogCollector { get; }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureLogging(logging =>
        {
            logging.AddProvider(LogCollector);
            logging.SetMinimumLevel(LogLevel.Trace);
        });

        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _configureWebHost(builder);
        base.ConfigureWebHost(builder);
    }
}
