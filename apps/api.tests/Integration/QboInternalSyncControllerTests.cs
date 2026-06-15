using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
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
}
