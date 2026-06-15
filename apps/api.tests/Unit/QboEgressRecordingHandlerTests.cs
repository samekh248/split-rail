using System.Net;
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

    public QboEgressRecordingHandlerTests()
    {
        var options = Options.Create(new QboSyncOptions
        {
            IntuitApiBaseUrl = "https://quickbooks.api.intuit.com/v3/company"
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
}
