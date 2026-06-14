namespace SplitRail.Api.DTOs.Auth;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresIn);
public record RegisterResponse(Guid Id, string Email, DateTimeOffset CreatedAt);
