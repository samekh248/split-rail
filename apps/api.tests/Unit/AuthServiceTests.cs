using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class AuthServiceTests
{
    private static (AuthService AuthService, ApplicationDbContext Db) CreateSut()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ApplicationDbContext(options, tenantContext);
        var jwtSettings = Options.Create(new JwtSettings
        {
            Secret = "dev-secret-key-at-least-32-characters-long",
            Issuer = "split-rail",
            Audience = "split-rail-api"
        });
        var tokenService = new TokenService(db, jwtSettings);
        var authService = new AuthService(db, tokenService, NullLogger<AuthService>.Instance);
        return (authService, db);
    }

    [Fact]
    public async Task Register_RejectsWeakPassword()
    {
        var (authService, _) = CreateSut();
        var act = () => authService.RegisterAsync(new RegisterRequest("user@example.com", "weak"));
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task Register_RejectsDuplicateEmail()
    {
        var (authService, db) = CreateSut();
        db.Users.Add(new User
        {
            Email = "user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("SecurePass1")
        });
        await db.SaveChangesAsync();

        var act = () => authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Register_StoresBcryptHash()
    {
        var (authService, db) = CreateSut();
        await authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        var user = await db.Users.FirstAsync();
        BCrypt.Net.BCrypt.Verify("SecurePass1", user.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task Login_IssuesTokenPair()
    {
        var (authService, _) = CreateSut();
        await authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        var result = await authService.LoginAsync(new LoginRequest("user@example.com", "SecurePass1"));
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.ExpiresIn.Should().Be(3600);
    }

    [Fact]
    public async Task Login_InvalidPassword_ThrowsAuthenticationException()
    {
        var (authService, _) = CreateSut();
        await authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        var act = () => authService.LoginAsync(new LoginRequest("user@example.com", "WrongPass1"));
        await act.Should().ThrowAsync<AuthenticationException>();
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var (authService, db) = CreateSut();
        var registered = await authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        var login = await authService.LoginAsync(new LoginRequest("user@example.com", "SecurePass1"));
        await authService.LogoutAsync(registered.Id);
        var act = () => authService.RefreshAsync(new RefreshRequest(login.RefreshToken));
        await act.Should().ThrowAsync<AuthenticationException>();
    }

    [Fact]
    public async Task Refresh_RotatesTokenPair()
    {
        var (authService, _) = CreateSut();
        await authService.RegisterAsync(new RegisterRequest("user@example.com", "SecurePass1"));
        var login = await authService.LoginAsync(new LoginRequest("user@example.com", "SecurePass1"));
        var refreshed = await authService.RefreshAsync(new RefreshRequest(login.RefreshToken));
        refreshed.AccessToken.Should().NotBe(login.AccessToken);
        refreshed.RefreshToken.Should().NotBe(login.RefreshToken);
    }
}
