using System.Net;
using System.Reflection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Http;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboEgressRecordingHandlerTests
{
    private const string IntuitApiBaseUrl = "https://quickbooks.api.intuit.com/v3/company";

    private static QboEgressRecordingHandler CreateHandler(
        ILogger<QboEgressRecordingHandler>? logger = null,
        HttpMessageHandler? innerHandler = null)
    {
        var options = Options.Create(new QboSyncOptions
        {
            IntuitApiBaseUrl = IntuitApiBaseUrl
        });
        return new QboEgressRecordingHandler(options, logger ?? NullLogger<QboEgressRecordingHandler>.Instance)
        {
            InnerHandler = innerHandler ?? new HttpClientHandler()
        };
    }

    [Fact]
    public async Task SendAsync_RecordsGetRequest()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://example.com/") };

        await client.GetAsync("/test");

        var records = handler.GetRecords();
        Assert.Single(records);
        Assert.Equal("GET", records[0].Method);
    }

    [Fact]
    public async Task SendAsync_BlocksMutatingIntuitRequest()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync("https://quickbooks.api.intuit.com/v3/company/realm/purchase", null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_BlocksPatchToIntuitBaseUrl()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PatchAsync(IntuitApiBaseUrl + "/realm/account/1", null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_BlocksPutToIntuitBaseUrl()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PutAsync(IntuitApiBaseUrl + "/realm/account/1", null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_BlocksDeleteToIntuitBaseUrl()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.DeleteAsync(IntuitApiBaseUrl + "/realm/account/1"));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_ClearRecords_RemovesPriorEntries()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://example.com/") };
        await client.GetAsync("/test");

        Assert.NotEmpty(handler.GetRecords());
        handler.ClearRecords();
        Assert.Empty(handler.GetRecords());
    }

    [Fact]
    public async Task SendAsync_BlockedMutatingRequest_LogsVerbAndHostOnly()
    {
        var logger = new CollectingLogger<QboEgressRecordingHandler>();
        var handler = CreateHandler(logger);
        var client = new HttpClient(handler);

        await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync("https://quickbooks.api.intuit.com/v3/company/realm/purchase", null));

        Assert.Contains(logger.Entries, e =>
            e.Level == LogLevel.Warning &&
            e.Message.Contains("POST") &&
            e.Message.Contains("quickbooks.api.intuit.com"));
        Assert.DoesNotContain(logger.Entries, e =>
            e.Message.Contains("Authorization", StringComparison.OrdinalIgnoreCase) ||
            e.Message.Contains("token", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task SendAsync_PermittedGet_DoesNotThrowZeroWriteInfiltration()
    {
        var inner = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        var handler = CreateHandler(innerHandler: inner);
        var client = new HttpClient(handler);

        var response = await client.GetAsync(
            "https://quickbooks.api.intuit.com/v3/company/realm/query?query=select%20*%20from%20Account");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.Single(inner.Requests);
    }

    [Fact]
    public async Task SendAsync_PermitsMutatingRequestToNonIntuitHost()
    {
        var inner = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        var handler = CreateHandler(innerHandler: inner);
        var client = new HttpClient(handler);

        var response = await client.PostAsync("https://example.com/webhook", null);

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        Assert.Single(inner.Requests);
    }

    [Fact]
    public async Task SendAsync_BlocksMutatingRequestMatchingConfiguredBaseUrlPrefix()
    {
        var customBase = "http://localhost:9999/v3/company";
        var options = Options.Create(new QboSyncOptions { IntuitApiBaseUrl = customBase });
        var handler = new QboEgressRecordingHandler(options, NullLogger<QboEgressRecordingHandler>.Instance)
        {
            InnerHandler = new HttpClientHandler()
        };
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync(customBase + "/realm/invoice", null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_BlocksMutatingRequestToSandboxIntuitHost()
    {
        var handler = CreateHandler();
        var client = new HttpClient(handler);

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync("https://sandbox-quickbooks.api.intuit.com/v3/company/realm/purchase", null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
    }

    [Fact]
    public async Task SendAsync_WithNullRequestUri_RecordsUnknownHostAndPermitsNonIntuitMutationCheck()
    {
        var inner = new StubHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var handler = CreateHandler(innerHandler: inner);
        var request = new HttpRequestMessage(HttpMethod.Post, (Uri?)null);

        var sendAsync = typeof(QboEgressRecordingHandler).GetMethod(
            "SendAsync",
            BindingFlags.Instance | BindingFlags.NonPublic)!;

        await (Task<HttpResponseMessage>)sendAsync.Invoke(
            handler,
            [request, CancellationToken.None])!;

        var records = handler.GetRecords();
        Assert.Single(records);
        Assert.Equal("unknown", records[0].Host);
        Assert.Single(inner.Requests);
    }

    private sealed class CollectingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }

    private sealed class StubHttpHandler : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) =>
            _responder = responder;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return Task.FromResult(_responder(request));
        }
    }
}
