using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Booking commitment per artist appearance: every new appearance starts as a hold, promotion
/// and demotion are explicit and audited, and the artist-level status rolls up from the
/// appearances rather than being stored twice.
/// </summary>
public class FestivalBookingStatusTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateBlock_DefaultsToHold()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var block = await CreateBlockAsync(client, venueId, festival, "Cody Jinks", "20:00", "21:30");

        block.BookingStatus.Should().Be("HOLD");
    }

    [Fact]
    public async Task CreateBlock_AcceptsAnExplicitConfirmedBooking()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Locked In", "2026-08-14", festival.Stages[0].Id,
                "20:00", "21:00", "MUSIC", RequiresSettlement: true,
                BookingStatus: "CONFIRMED"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var block = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        block!.BookingStatus.Should().Be("CONFIRMED");
    }

    [Fact]
    public async Task CreateBlock_RejectsUnknownBookingStatus()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BlocksPath(venueId, festival.EventId),
            new CreateProgrammingBlockRequest(
                "Act", "2026-08-14", festival.Stages[0].Id,
                "20:00", "21:00", "MUSIC", false, BookingStatus: "PENCILED"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("booking status");
    }

    [Fact]
    public async Task BookingStatus_PromotesToConfirmedAndBackToHold()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");
        var path = BookingStatusPath(venueId, festival.EventId, block.Id);

        var confirm = await client.PostAsJsonAsync(
            path, new SetBlockBookingStatusRequest("CONFIRMED", "Contract signed"));

        confirm.StatusCode.Should().Be(HttpStatusCode.OK);
        (await confirm.Content.ReadFromJsonAsync<ProgrammingBlockResponse>())!
            .BookingStatus.Should().Be("CONFIRMED");

        var demote = await client.PostAsJsonAsync(
            path, new SetBlockBookingStatusRequest("HOLD", "Deal fell through"));

        demote.StatusCode.Should().Be(HttpStatusCode.OK);
        (await demote.Content.ReadFromJsonAsync<ProgrammingBlockResponse>())!
            .BookingStatus.Should().Be("HOLD");
    }

    [Fact]
    public async Task BookingStatusChange_IsRecordedWithPriorAndNewValues()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("CONFIRMED", "Contract signed"));

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        var entry = history.Should().ContainSingle(e => e.Action == "BookingStatusChange").Subject;
        entry.PriorValueJson.Should().Contain("HOLD");
        entry.NewValueJson.Should().Contain("CONFIRMED");
        entry.Reason.Should().Be("Contract signed");
        entry.UserId.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public async Task SettingTheSameBookingStatusTwice_IsANoOp()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("HOLD"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetHistoryAsync(client, venueId, festival.EventId, block.Id)).Should().BeEmpty();
    }

    [Fact]
    public async Task BookingStatus_RejectsUnknownValue()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("MAYBE"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BookingStatus_IsUnaffectedByAScheduleStatusChange()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        var response = await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}/status",
            new SetBlockStatusRequest("DELAYED"));

        var updated = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        updated!.ScheduleStatus.Should().Be("DELAYED");
        updated.BookingStatus.Should().Be("CONFIRMED",
            "a day-of delay does not un-confirm a booking");
    }

    [Fact]
    public async Task UpdateBlock_LeavesBookingStatusAloneWhenOmitted()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        // Mirrors a drag-and-drop move, which never sends a booking status.
        var response = await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Act", "2026-08-15", festival.Stages[0].Id, "21:00", "22:00", "MUSIC", false));

        var updated = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        updated!.BookingStatus.Should().Be("CONFIRMED");
    }

    [Fact]
    public async Task UpdateBlock_ChangesAndAuditsBookingStatusWhenSupplied()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00");

        var response = await client.PutAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{block.Id}",
            new UpdateProgrammingBlockRequest(
                "Act", "2026-08-14", festival.Stages[0].Id, "20:00", "21:00", "MUSIC", false,
                BookingStatus: "CONFIRMED"));

        var updated = await response.Content.ReadFromJsonAsync<ProgrammingBlockResponse>();
        updated!.BookingStatus.Should().Be("CONFIRMED");

        var history = await GetHistoryAsync(client, venueId, festival.EventId, block.Id);
        history.Should().ContainSingle(e => e.Action == "BookingStatusChange");
    }

    [Fact]
    public async Task Itinerary_ExposesBookingStatusPerBlock()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var held = await CreateBlockAsync(client, venueId, festival, "Held", "20:00", "21:00");
        var confirmed = await CreateBlockAsync(client, venueId, festival, "Confirmed", "22:00", "23:00");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, confirmed.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        var itinerary = await client.GetFromJsonAsync<ItineraryResponse>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/itinerary");

        itinerary!.Blocks.Single(b => b.Id == held.Id).BookingStatus.Should().Be("HOLD");
        itinerary.Blocks.Single(b => b.Id == confirmed.Id).BookingStatus.Should().Be("CONFIRMED");
    }

    [Fact]
    public async Task ArtistRollup_StaysOnHoldUntilEveryAppearanceIsConfirmed()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var saturday = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            dayDate: "2026-08-14", newArtistName: "Cody Jinks");
        var sunday = await CreateBlockAsync(client, venueId, festival, "Set B", "20:00", "21:00",
            dayDate: "2026-08-15", newArtistName: "Cody Jinks");

        var artistsPath = $"/api/venues/{venueId}/festivals/{festival.EventId}/artists";

        var onHold = await client.GetFromJsonAsync<List<FestivalArtistResponse>>(artistsPath);
        var artist = onHold.Should().ContainSingle().Subject;
        artist.BookingStatus.Should().Be("HOLD");
        artist.ConfirmedAppearanceCount.Should().Be(0);

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, saturday.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        var partiallyConfirmed = await client.GetFromJsonAsync<List<FestivalArtistResponse>>(artistsPath);
        partiallyConfirmed![0].BookingStatus.Should().Be("HOLD",
            "one held appearance keeps the whole booking a hold");
        partiallyConfirmed[0].ConfirmedAppearanceCount.Should().Be(1);

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, sunday.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        var fullyConfirmed = await client.GetFromJsonAsync<List<FestivalArtistResponse>>(artistsPath);
        fullyConfirmed![0].BookingStatus.Should().Be("CONFIRMED");
        fullyConfirmed[0].ConfirmedAppearanceCount.Should().Be(2);
    }

    [Fact]
    public async Task ArtistRollup_IgnoresCanceledAppearances()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var kept = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            dayDate: "2026-08-14", newArtistName: "Cody Jinks");
        var dropped = await CreateBlockAsync(client, venueId, festival, "Set B", "20:00", "21:00",
            dayDate: "2026-08-15", newArtistName: "Cody Jinks");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, kept.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));
        await client.PostAsJsonAsync(
            $"{BlocksPath(venueId, festival.EventId)}/{dropped.Id}/status",
            new SetBlockStatusRequest("CANCELED"));

        var artists = await client.GetFromJsonAsync<List<FestivalArtistResponse>>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/artists");

        artists![0].BookingStatus.Should().Be("CONFIRMED");
    }

    [Fact]
    public async Task NewArtist_StartsOnHold()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/festivals/{festival.EventId}/artists",
            new CreateFestivalArtistRequest("Cody Jinks"));

        var artist = await response.Content.ReadFromJsonAsync<FestivalArtistResponse>();
        artist!.BookingStatus.Should().Be("HOLD");
        artist.ConfirmedAppearanceCount.Should().Be(0);
    }

    [Fact]
    public async Task Appearances_CarryBookingStatus()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var block = await CreateBlockAsync(client, venueId, festival, "Set A", "20:00", "21:00",
            newArtistName: "Cody Jinks");

        await client.PostAsJsonAsync(
            BookingStatusPath(venueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        var appearances = await client.GetFromJsonAsync<List<ArtistAppearanceDto>>(
            $"/api/venues/{venueId}/festivals/{festival.EventId}" +
            $"/artists/{block.FestivalArtistId}/appearances");

        appearances.Should().ContainSingle();
        appearances![0].BookingStatus.Should().Be("CONFIRMED");
    }

    [Fact]
    public async Task BookingStatusEndpoint_RejectsCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);
        var block = await CreateBlockAsync(ownerClient, ownerVenueId, festival, "Act", "20:00", "21:00");

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        var response = await otherClient.PostAsJsonAsync(
            BookingStatusPath(ownerVenueId, festival.EventId, block.Id),
            new SetBlockBookingStatusRequest("CONFIRMED"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    internal static string BookingStatusPath(Guid venueId, Guid eventId, Guid blockId) =>
        $"{BlocksPath(venueId, eventId)}/{blockId}/booking-status";

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
