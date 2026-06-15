using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Services;

namespace SplitRail.Api.BackgroundServices;

public class QboSyncHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly QboSyncOptions _options;
    private readonly ILogger<QboSyncHostedService> _logger;

    public QboSyncHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<QboSyncOptions> options,
        ILogger<QboSyncHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.EnableInProcessTimer)
        {
            _logger.LogInformation("QBO in-process sync timer is disabled.");
            return;
        }

        var interval = TimeSpan.FromHours(Math.Max(1, _options.IntervalHours));
        _logger.LogInformation("QBO sync timer started with interval {IntervalHours}h", _options.IntervalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(interval, stoppingToken);
                await RunScheduledSyncAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scheduled QBO sync failed.");
            }
        }
    }

    internal async Task RunScheduledSyncAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<QboSyncService>();
        var count = await syncService.SyncAllEligibleEventsAsync(cancellationToken);
        _logger.LogInformation("Scheduled QBO sync completed for {EventCount} events.", count);
    }
}
