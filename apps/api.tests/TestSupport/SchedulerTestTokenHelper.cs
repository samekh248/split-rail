using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace SplitRail.Api.Tests.TestSupport;

public static class SchedulerTestTokenHelper
{
    public static readonly SymmetricSecurityKey TestSigningKey =
        new(Encoding.UTF8.GetBytes("scheduler-test-signing-key-at-least-32-bytes"));

    public const string TestSchedulerEmail = "split-rail-qbo-scheduler-prod@split-rail.iam.gserviceaccount.com";
    public const string TestAudience = "https://split-rail-api-test.example.com";

    public static string CreateSchedulerToken(string email, string audience)
    {
        var credentials = new SigningCredentials(TestSigningKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: "https://accounts.google.com",
            audience: audience,
            claims: [new Claim("email", email)],
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
