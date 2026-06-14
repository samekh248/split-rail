using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class TokenService
{
    private readonly ApplicationDbContext _db;
    private readonly JwtSettings _settings;

    public TokenService(ApplicationDbContext db, IOptions<JwtSettings> settings)
    {
        _db = db;
        _settings = settings.Value;
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresIn)> IssueTokenPairAsync(
        User user,
        Guid? organizationId = null,
        CancellationToken cancellationToken = default)
    {
        var orgId = organizationId ?? await GetPrimaryOrganizationIdAsync(user.Id, cancellationToken);
        var accessToken = GenerateAccessToken(user, orgId);
        var refreshToken = GenerateRefreshToken();
        await StoreRefreshTokenAsync(user.Id, refreshToken, cancellationToken);
        return (accessToken, refreshToken, _settings.AccessTokenExpirationMinutes * 60);
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresIn)> RefreshAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var hash = HashToken(refreshToken);
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && !t.IsRevoked, cancellationToken)
            ?? throw new AuthenticationException("Invalid or expired refresh token.");

        if (stored.ExpiresAt <= DateTimeOffset.UtcNow)
            throw new AuthenticationException("Invalid or expired refresh token.");

        stored.IsRevoked = true;

        var user = await _db.Users.FirstAsync(u => u.Id == stored.UserId, cancellationToken);
        return await IssueTokenPairAsync(user, cancellationToken: cancellationToken);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
            token.IsRevoked = true;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public string GenerateAccessToken(User user, Guid? organizationId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (organizationId.HasValue)
            claims.Add(new Claim("org_id", organizationId.Value.ToString()));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpirationMinutes);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private async Task StoreRefreshTokenAsync(Guid userId, string refreshToken, CancellationToken cancellationToken)
    {
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_settings.RefreshTokenExpirationDays),
            IsRevoked = false
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<Guid?> GetPrimaryOrganizationIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _db.UserOrganizationMappings
            .IgnoreQueryFilters()
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.OrganizationId)
            .Select(m => (Guid?)m.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
