using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class QboTokenService
{
    private const string ProtectorPurpose = "QboOAuthTokens";

    private readonly ApplicationDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;
    private readonly QboSyncOptions _options;
    private readonly ILogger<QboTokenService> _logger;

    public QboTokenService(
        ApplicationDbContext db,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider dataProtectionProvider,
        IOptions<QboSyncOptions> options,
        ILogger<QboTokenService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> IsConnectedAsync(Guid venueId, CancellationToken cancellationToken = default) =>
        await _db.QboVenueCredentials
            .AsNoTracking()
            .AnyAsync(c => c.VenueId == venueId && !c.IsExpired, cancellationToken);

    public async Task<QboVenueCredential?> GetCredentialAsync(
        Guid venueId,
        CancellationToken cancellationToken = default) =>
        await _db.QboVenueCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.VenueId == venueId, cancellationToken);

    public async Task<(string AccessToken, string RealmId)> GetValidAccessTokenAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        var credential = await _db.QboVenueCredentials
            .AsNoTracking()
            .Include(c => c.Venue)
            .FirstOrDefaultAsync(c => c.VenueId == venueId, cancellationToken)
            ?? throw new QboTokenRefreshException("QBO is not connected for this venue.", venueId);

        if (credential.TokenExpiresAt <= DateTimeOffset.UtcNow.AddMinutes(5))
        {
            credential = await RefreshTokenAsync(credential.VenueId, cancellationToken);
        }

        var accessToken = Unprotect(credential.EncryptedAccessToken);
        return (accessToken, credential.RealmId);
    }

    public async Task StoreTokensAsync(
        Guid venueId,
        string realmId,
        string accessToken,
        string refreshToken,
        DateTimeOffset expiresAt,
        Guid? connectedByUserId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _db.QboVenueCredentials
            .FirstOrDefaultAsync(c => c.VenueId == venueId, cancellationToken);

        if (existing is null)
        {
            existing = new QboVenueCredential { VenueId = venueId };
            _db.QboVenueCredentials.Add(existing);
        }

        existing.RealmId = realmId;
        existing.EncryptedAccessToken = Protect(accessToken);
        existing.EncryptedRefreshToken = Protect(refreshToken);
        existing.TokenExpiresAt = expiresAt;
        existing.ConnectedAt = DateTimeOffset.UtcNow;
        existing.ConnectedByUserId = connectedByUserId;
        existing.IsExpired = false;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("QBO credentials stored for venue {VenueId}, realm {RealmId}", venueId, realmId);
    }

    public async Task DisconnectAsync(Guid venueId, CancellationToken cancellationToken = default)
    {
        var credential = await _db.QboVenueCredentials
            .FirstOrDefaultAsync(c => c.VenueId == venueId, cancellationToken);

        if (credential is null)
            return;

        try
        {
            var refreshToken = Unprotect(credential.EncryptedRefreshToken);
            await RevokeTokenAsync(refreshToken, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to revoke QBO token for venue {VenueId}", venueId);
        }

        _db.QboVenueCredentials.Remove(credential);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("QBO disconnected for venue {VenueId}", venueId);
    }

    public async Task<(string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt)> ExchangeCodeAsync(
        string code,
        CancellationToken cancellationToken = default)
    {
        using var client = _httpClientFactory.CreateClient("QboOAuth");
        using var request = new HttpRequestMessage(HttpMethod.Post, _options.IntuitTokenUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}")));

        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _options.RedirectUri
        });

        var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new QboTokenRefreshException("Failed to exchange authorization code.");

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseTokenResponse(json);
    }

    internal string Protect(string value) => _protector.Protect(value);

    internal string Unprotect(string value) => _protector.Unprotect(value);

    private async Task<QboVenueCredential> RefreshTokenAsync(
        Guid venueId,
        CancellationToken cancellationToken)
    {
        var credential = await _db.QboVenueCredentials
            .Include(c => c.Venue)
            .FirstOrDefaultAsync(c => c.VenueId == venueId, cancellationToken)
            ?? throw new QboTokenRefreshException("QBO credentials not found.", venueId);

        try
        {
            var refreshToken = Unprotect(credential.EncryptedRefreshToken);

            using var client = _httpClientFactory.CreateClient("QboOAuth");
            using var request = new HttpRequestMessage(HttpMethod.Post, _options.IntuitTokenUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}")));

            request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken
            });

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                credential.IsExpired = true;
                await _db.SaveChangesAsync(cancellationToken);
                throw new QboTokenRefreshException(
                    "Failed to refresh QBO access token.",
                    venueId,
                    credential.RealmId);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var (accessToken, newRefreshToken, expiresAt) = ParseTokenResponse(json);

            credential.EncryptedAccessToken = Protect(accessToken);
            credential.EncryptedRefreshToken = Protect(newRefreshToken);
            credential.TokenExpiresAt = expiresAt;
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("QBO token refreshed for venue {VenueId}, realm {RealmId}", venueId, credential.RealmId);
            return credential;
        }
        catch (QboTokenRefreshException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "QBO token refresh failed for venue {VenueId}, realm {RealmId}", venueId, credential.RealmId);
            throw new QboTokenRefreshException(
                "Failed to refresh QBO access token.",
                venueId,
                credential.RealmId);
        }
    }

    private async Task RevokeTokenAsync(string token, CancellationToken cancellationToken)
    {
        using var client = _httpClientFactory.CreateClient("QboOAuth");
        using var request = new HttpRequestMessage(HttpMethod.Post, _options.IntuitRevokeUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}")));

        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["token"] = token
        });

        await client.SendAsync(request, cancellationToken);
    }

    private static (string AccessToken, string RefreshToken, DateTimeOffset ExpiresAt) ParseTokenResponse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var accessToken = root.GetProperty("access_token").GetString()
            ?? throw new QboTokenRefreshException("Token response missing access_token.");
        var refreshToken = root.GetProperty("refresh_token").GetString()
            ?? throw new QboTokenRefreshException("Token response missing refresh_token.");
        var expiresIn = root.TryGetProperty("expires_in", out var expiresProp)
            ? expiresProp.GetInt32()
            : 3600;

        return (accessToken, refreshToken, DateTimeOffset.UtcNow.AddSeconds(expiresIn));
    }
}
