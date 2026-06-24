using FluentAssertions;
using Microsoft.Extensions.Hosting;
using SplitRail.Api.Configuration;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class SettlementArchiveStoreRegistrationTests
{
    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    public void ShouldUseInMemoryStore_ReturnsFalse_ForDevelopmentAndProduction(string environmentName)
    {
        var environment = new FakeHostEnvironment { EnvironmentName = environmentName };
        var preview = new PreviewOptions { UseFakeQboConnector = false, EnableTestSeeding = false };
        var archive = new SettlementArchiveOptions { UseInMemoryStore = false };

        SettlementArchiveStoreRegistration.ShouldUseInMemoryStore(environment, preview, archive)
            .Should().BeFalse();
    }

    [Fact]
    public void ShouldUseInMemoryStore_ReturnsTrue_ForPreviewWithSeeding()
    {
        var environment = new FakeHostEnvironment { EnvironmentName = "Preview" };
        var preview = new PreviewOptions { UseFakeQboConnector = true, EnableTestSeeding = true };
        var archive = new SettlementArchiveOptions { UseInMemoryStore = false };

        SettlementArchiveStoreRegistration.ShouldUseInMemoryStore(environment, preview, archive)
            .Should().BeTrue();
    }

    [Fact]
    public void ShouldUseInMemoryStore_ReturnsTrue_WhenExplicitUseInMemoryStore()
    {
        var environment = new FakeHostEnvironment { EnvironmentName = "Production" };
        var preview = new PreviewOptions();
        var archive = new SettlementArchiveOptions { UseInMemoryStore = true };

        SettlementArchiveStoreRegistration.ShouldUseInMemoryStore(environment, preview, archive)
            .Should().BeTrue();
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "split-rail-api.tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
