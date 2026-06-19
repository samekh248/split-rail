using Microsoft.Extensions.Logging;

namespace SplitRail.Api.Tests.TestSupport;

public sealed class TestLogCollector : ILoggerProvider, IDisposable
{
    public IList<LogEntry> Entries { get; } = new List<LogEntry>();

    public ILogger CreateLogger(string categoryName) => new TestLogger(this, categoryName);

    public void Clear() => Entries.Clear();

    public void Dispose()
    {
    }

    public sealed class LogEntry
    {
        public LogLevel Level { get; init; }
        public string Category { get; init; } = string.Empty;
        public string Message { get; init; } = string.Empty;
        public IReadOnlyList<KeyValuePair<string, object?>> State { get; init; } =
            Array.Empty<KeyValuePair<string, object?>>();
    }

    private sealed class TestLogger(TestLogCollector collector, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull =>
            NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var message = formatter(state, exception);
            var stateValues = state is IEnumerable<KeyValuePair<string, object?>> keyValues
                ? keyValues.ToList()
                : new List<KeyValuePair<string, object?>>();

            collector.Entries.Add(new LogEntry
            {
                Level = logLevel,
                Category = category,
                Message = message,
                State = stateValues
            });
        }
    }

    private sealed class NullScope : IDisposable
    {
        public static readonly NullScope Instance = new();

        public void Dispose()
        {
        }
    }
}
