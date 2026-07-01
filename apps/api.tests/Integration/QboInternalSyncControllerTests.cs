using System.Net;
using FluentAssertions;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboInternalSyncControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task TriggerSync_WithValidKey_ReturnsAccepted()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Add("X-Internal-Sync-Key", "test-internal-key");

        var response = await Client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }

    [Fact]
    public async Task TriggerSync_WithInvalidKey_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Add("X-Internal-Sync-Key", "wrong-key");

        var response = await Client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TriggerSync_WithNightlyMode_ReturnsAccepted()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger?mode=nightly");
        request.Headers.Add("X-Internal-Sync-Key", "test-internal-key");

        var response = await Client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }
}

public class QboInternalSyncLoggingTests : IntegrationTestBase
{
    protected override bool EnableLogCapture => true;

    [Fact]
    public async Task TriggerSync_logsStructuredOutcome()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Add("X-Internal-Sync-Key", "test-internal-key");

        var response = await Client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var entry = LogCollector!.Entries.Should().ContainSingle(e =>
            e.Message.Contains("Internal QBO sync trigger completed", StringComparison.Ordinal)).Subject;

        GetAuditStateValue(entry, "TriggerSource").Should().Be("dev-key");
        GetAuditStateValue(entry, "EventsSynced").Should().NotBeNull();
        entry.Message.Should().NotContain("test-internal-key");
    }

    private static object? GetAuditStateValue(TestSupport.TestLogCollector.LogEntry entry, string key) =>
        entry.State.FirstOrDefault(kvp => kvp.Key == key).Value;
}
