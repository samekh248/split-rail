namespace SplitRail.Api.DTOs;

public class ErrorResponse
{
    public string Type { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public IReadOnlyList<string>? Errors { get; set; }
}
