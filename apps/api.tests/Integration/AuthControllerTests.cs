using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class AuthControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task Register_ReturnsCreated()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("newuser@example.com", "SecurePass1"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("dup@example.com", "SecurePass1"));
        var response = await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("dup@example.com", "SecurePass1"));
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("weak@example.com", "short"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_Success_ReturnsTokens()
    {
        await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("login@example.com", "SecurePass1"));
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("login@example.com", "SecurePass1"));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_BadCredentials_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("missing@example.com", "SecurePass1"));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_RotatesTokens()
    {
        var (_, refreshToken, _) = await RegisterAndLoginAsync("refresh@example.com");
        var response = await Client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(refreshToken));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Refresh_RevokedToken_Returns401()
    {
        var (_, refreshToken, _) = await RegisterAndLoginAsync("revoked@example.com");
        await Client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(refreshToken));
        var response = await Client.PostAsJsonAsync("/api/auth/refresh", new RefreshRequest(refreshToken));
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_RevokesTokens()
    {
        var (accessToken, refreshToken, _) = await RegisterAndLoginAsync("logout@example.com");
        using var authed = CreateAuthenticatedClient(accessToken);
        var logoutResponse = await authed.PostAsync("/api/auth/logout", null);
        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var refreshResponse = await Client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(refreshToken));
        refreshResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var response = await Client.GetAsync("/api/users/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
