using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class AuthService
{
    private readonly ApplicationDbContext _db;
    private readonly TokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(ApplicationDbContext db, TokenService tokenService, ILogger<AuthService> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (!PasswordValidator.IsValidEmail(request.Email))
            throw new ValidationException("Invalid email address.");

        var passwordErrors = PasswordValidator.ValidatePassword(request.Password);
        if (passwordErrors.Count > 0)
            throw new ValidationException(passwordErrors);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (exists)
            throw new ConflictException("Email already registered.");

        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User registered with id {UserId}", user.Id);

        return new RegisterResponse(user.Id, user.Email, user.CreatedAt);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken)
            ?? throw new AuthenticationException("Invalid credentials.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new AuthenticationException("Invalid credentials.");

        var (accessToken, refreshToken, expiresIn) =
            await _tokenService.IssueTokenPairAsync(user, cancellationToken: cancellationToken);

        _logger.LogInformation("User {UserId} logged in", user.Id);

        return new AuthResponse(accessToken, refreshToken, expiresIn);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken = default)
    {
        var (accessToken, refreshToken, expiresIn) =
            await _tokenService.RefreshAsync(request.RefreshToken, cancellationToken);

        return new AuthResponse(accessToken, refreshToken, expiresIn);
    }

    public async Task LogoutAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await _tokenService.RevokeAllForUserAsync(userId, cancellationToken);
        _logger.LogInformation("User {UserId} logged out", userId);
    }
}
