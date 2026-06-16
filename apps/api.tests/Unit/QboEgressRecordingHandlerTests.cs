using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Http;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboEgressRecordingHandlerTests
{
    private readonly QboEgressRecordingHandler _handler;
    private const string IntuitApiBaseUrl = "https://quickbooks.api.intuit.com/v3/company";

    public QboEgressRecordingHandlerTests()
    {
        var options = Options.Create(new QboSyncOptions
        {
            IntuitApiBaseUrl = IntuitApiBaseUrl
        });
        _handler = new QboEgressRecordingHandler(options, NullLogger<QboEgressRecordingHandler>.Instance)
        {
            InnerHandler = new HttpClientHandler()
        };
    }

    [Fact]
    public async Task SendAsync_RecordsGetRequest()
    {
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://example.com/") };

        await client.GetAsync("/test");

        var records = _handler.GetRecords();
        Assert.Single(records);
        Assert.Equal("GET", records[0].Method);
    }

    [Fact]
    public async Task SendAsync_BlocksMutatingIntuitRequest()
    {
        var client = new HttpClient(_handler);

        await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync("https://quickbooks.api.intuit.com/v3/company/realm/purchase", null));
    }

    [Fact]
    public async Task SendAsync_BlocksPatchToIntuitBaseUrl()
    {
        var client = new HttpClient(_handler);

        await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PatchAsync(IntuitApiBaseUrl + "/realm/account/1", null));
    }

    [Fact]
    public async Task SendAsync_ClearRecords_RemovesPriorEntries()
    {
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://example.com/") };
        await client.GetAsync("/test");

        Assert.NotEmpty(_handler.GetRecords());
        _handler.ClearRecords();
        Assert.Empty(_handler.GetRecords());
    }
}
