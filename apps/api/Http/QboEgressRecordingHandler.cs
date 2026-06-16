using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Http;

public sealed class QboEgressRecord
{
    public required string Method { get; init; }
    public required string Host { get; init; }
    public DateTimeOffset Timestamp { get; init; }
}

public class QboEgressRecordingHandler : DelegatingHandler
{
    private static readonly HashSet<string> MutatingVerbs =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "DELETE", "PATCH" };

    private readonly ConcurrentBag<QboEgressRecord> _records = [];
    private readonly QboSyncOptions _options;
    private readonly ILogger<QboEgressRecordingHandler> _logger;

    public QboEgressRecordingHandler(
        IOptions<QboSyncOptions> options,
        ILogger<QboEgressRecordingHandler> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public IReadOnlyList<QboEgressRecord> GetRecords() => _records.ToList();

    public void ClearRecords()
    {
        while (_records.TryTake(out _)) { }
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri;
        var method = request.Method.Method;
        var host = uri?.Host ?? "unknown";

        _records.Add(new QboEgressRecord
        {
            Method = method,
            Host = host,
            Timestamp = DateTimeOffset.UtcNow
        });

        _logger.LogDebug("QBO egress {Method} {Host}", method, host);

        if (IsMutatingIntuitRequest(request))
        {
            throw new QboSyncException(
                $"Mutating QBO request blocked: {method} {uri}",
                "zero_write_infiltration");
        }

        return base.SendAsync(request, cancellationToken);
    }

    private bool IsMutatingIntuitRequest(HttpRequestMessage request)
    {
        if (!MutatingVerbs.Contains(request.Method.Method))
            return false;

        var uri = request.RequestUri?.ToString() ?? string.Empty;
        return uri.Contains("intuit.com", StringComparison.OrdinalIgnoreCase)
               || uri.StartsWith(_options.IntuitApiBaseUrl, StringComparison.OrdinalIgnoreCase);
    }
}
