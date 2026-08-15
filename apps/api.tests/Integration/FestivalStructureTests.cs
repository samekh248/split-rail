using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class FestivalStructureTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateFestival_RequiresOnlyNameAndDateRange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Kalispell Roundup", "2026-08-14", "2026-08-16"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();
        festival!.Title.Should().Be("Kalispell Roundup");
        festival.EventType.Should().Be("FESTIVAL");
        festival.StartDate.Should().Be("2026-08-14");
        festival.EndDate.Should().Be("2026-08-16");
    }

    [Fact]
    public async Task CreateFestival_DerivesADayForEveryDateInRange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Three Day Fest", "2026-08-14", "2026-08-16"));

        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();

        festival!.Days.Should().HaveCount(3);
        festival.Days.Select(d => d.DayDate.ToString("yyyy-MM-dd"))
            .Should().ContainInOrder("2026-08-14", "2026-08-15", "2026-08-16");
        festival.Days.Should().OnlyContain(d => d.BlockCount == 0);
    }

    [Fact]
    public async Task CreateFestival_AutoCreatesDefaultStage()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Single Stage Fest", "2026-08-14", "2026-08-15"));

        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();

        festival!.Stages.Should().HaveCount(1);
        festival.Stages[0].Name.Should().Be("Main Stage");
    }

    [Fact]
    public async Task CreateFestival_GeneratesSingleMasterQboTag()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Kalispell", "2026-08-14", "2026-08-16"));

        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();

        festival!.QboTagName.Should().Be("#Fest-2026-KALISPELL");
    }

    [Fact]
    public async Task CreateFestival_RejectsRangeLongerThanThreeDays()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Week Long", "2026-08-14", "2026-08-20"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("3 days or fewer");
    }

    [Fact]
    public async Task CreateFestival_AcceptsExactlyThreeDays()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Boundary Fest", "2026-08-14", "2026-08-16"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateFestival_AcceptsSingleDayRange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("One Day Fest", "2026-08-14", "2026-08-14"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();
        festival!.Days.Should().HaveCount(1);
    }

    [Fact]
    public async Task CreateFestival_RejectsEndDateBeforeStartDate()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("Backwards", "2026-08-16", "2026-08-14"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("before the start date");
    }

    [Fact]
    public async Task CreateFestival_RejectsBlankName()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest("   ", "2026-08-14", "2026-08-15"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFestival_ReturnsStructure()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateFestivalAsync(client, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/festivals/{created.EventId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var festival = await response.Content.ReadFromJsonAsync<FestivalResponse>();
        festival!.EventId.Should().Be(created.EventId);
        festival.Stages.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetFestival_ReturnsNotFoundForAnotherOrganizationsFestival()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        var response = await otherClient.GetAsync(
            $"/api/venues/{ownerVenueId}/festivals/{festival.EventId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetFestival_RejectsStandardEvent()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var standard = await CreateEventViaApiAsync(client, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/festivals/{standard.EventId}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("not a festival");
    }

    [Fact]
    public async Task UpdateFestival_ChangesTitleAndRange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateFestivalAsync(client, venueId);

        var response = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{created.EventId}",
            new UpdateFestivalRequest("Renamed Fest", "2026-09-01", "2026-09-02"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<FestivalResponse>();
        updated!.Title.Should().Be("Renamed Fest");
        updated.Days.Should().HaveCount(2);
    }

    [Fact]
    public async Task RevertToStandard_SucceedsForAnUntouchedFestival()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateFestivalAsync(client, venueId);

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/festivals/{created.EventId}/revert-to-standard", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // It is no longer reachable as a festival.
        var get = await client.GetAsync($"/api/venues/{venueId}/festivals/{created.EventId}");
        get.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RevertToStandard_BlockedOnceASecondStageExists()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var created = await CreateFestivalAsync(client, venueId);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{created.EventId}/stages",
            new CreateStageZoneRequest("Rodeo Arena"));

        var response = await client.PostAsync(
            $"/api/venues/{venueId}/festivals/{created.EventId}/revert-to-standard", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    internal static async Task<FestivalResponse> CreateFestivalAsync(
        HttpClient client,
        Guid venueId,
        string title = "Test Festival",
        string startDate = "2026-08-14",
        string endDate = "2026-08-16")
    {
        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals",
            new CreateFestivalRequest(title, startDate, endDate));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<FestivalResponse>())!;
    }
}
