using SplitRail.Api.DTOs.Qbo;

namespace SplitRail.Api.Services;

public interface IQboMetadataClient
{
    Task<QboTrackingCatalogDto> QueryTrackingCatalogAsync(
        string accessToken,
        string realmId,
        CancellationToken cancellationToken = default);
}

public class QboMetadataClient : IQboMetadataClient
{
    public Task<QboTrackingCatalogDto> QueryTrackingCatalogAsync(
        string accessToken,
        string realmId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(new QboTrackingCatalogDto(Array.Empty<QboTrackingRefDto>()));
}
