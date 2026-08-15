using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Every schedule and status change must leave a trail (spec FR-012, FR-013).
/// </summary>
public class BlockStatusAuditTests : IntegrationTestBase
{
    [Theory]
    [InlineData("DELAYED")]
    [InlineData("PARTIALLY_COMPLETED")]
    [InlineData("CANCELED")]
    public async Task StatusChange_IsRecordedWithPriorAndNewValues(string status)
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}/status",
            new SetBlockStatusRequest(status, "Weather delay"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        updated!.ScheduleStatus.Should().Be(status);

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        var entry = history.Should().ContainSingle(e => e.Action == "StatusChange").Subject;
        entry.PriorValueJson.Should().Contain("SCHEDULED");
        entry.NewValueJson.Should().Contain(status);
        entry.Reason.Should().Be("Weather delay");
        entry.UserId.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public async Task StatusChange_RejectsUnknownStatus()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}/status",
            new SetBlockStatusRequest("EXPLODED"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reschedule_RecordsPriorAndNewTimes()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Act", "2026-08-14", festival.Stages[0].Id, "21:00", "22:00", "MUSIC", false));

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        var entry = history.Should().ContainSingle(e => e.Action == "Reschedule").Subject;
        entry.PriorValueJson.Should().Contain("20:00");
        entry.NewValueJson.Should().Contain("21:00");
    }

    [Fact]
    public async Task MovingToAnotherDay_IsRecordedAsAMove()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Act", "2026-08-16", festival.Stages[0].Id, "20:00", "21:00", "MUSIC", false));

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        var entry = history.Should().ContainSingle(e => e.Action == "Moved").Subject;
        entry.PriorValueJson.Should().Contain("2026-08-14");
        entry.NewValueJson.Should().Contain("2026-08-16");
    }

    [Fact]
    public async Task NonSchedulingEdits_DoNotCreateHistoryNoise()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        // Only the title changes — placement is untouched.
        await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Renamed Act", "2026-08-14", festival.Stages[0].Id, "20:00", "21:00", "MUSIC", false));

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        history.Should().BeEmpty("a rename is not a schedule change");
    }

    [Fact]
    public async Task RepeatedStatusChanges_AccumulateHistory()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");
        var statusPath = $"{BlocksPath(venueId, festival.EventId)}/{block.Id}/status";

        await client.PostAsJsonAsync(statusPath, new SetBlockStatusRequest("DELAYED"));
        await client.PostAsJsonAsync(statusPath, new SetBlockStatusRequest("PARTIALLY_COMPLETED"));

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        history.Should().HaveCount(2);
        history.Should().OnlyContain(e => e.Action == "StatusChange");
    }

    [Fact]
    public async Task SettingTheSameStatusTwice_IsANoOp()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}/status",
            new SetBlockStatusRequest("SCHEDULED"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetHistoryAsync(client, venueId, festival.EventId, block.Id)).Should().BeEmpty();
    }

    private static async Task<List<FestivalAuditEntryResponse>> GetHistoryAsync(
        HttpClient client,
        Guid venueId,
        Guid eventId,
        Guid blockId)
    {
        var response = await client.GetAsync($"{BlocksPath(venueId, eventId)}/{blockId}/history");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<FestivalAuditEntryResponse>>())!;
    }
}
