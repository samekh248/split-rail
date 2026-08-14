using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// One artist identity per festival, linking that artist's many Programming Blocks so deal
/// terms and reporting can be understood both per block and across the whole event
/// (spec FR-008). Deliberately scoped to a festival rather than an org-wide directory (D5).
/// </summary>
public class FestivalArtistService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;

    public FestivalArtistService(ApplicationDbContext db, FestivalAccessGuard guard)
    {
        _db = db;
        _guard = guard;
    }

    public async Task<IReadOnlyList<FestivalArtistResponse>> ListAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var rows = await _db.FestivalArtists
            .AsNoTracking()
            .Where(a => a.EventId == eventId)
            .OrderBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                AppearanceCount = a.ProgrammingBlocks.Count,
                CountedAppearances = a.ProgrammingBlocks
                    .Count(b => b.ScheduleStatus != BlockScheduleStatus.Canceled),
                ConfirmedAppearances = a.ProgrammingBlocks
                    .Count(b => b.ScheduleStatus != BlockScheduleStatus.Canceled
                                && b.BookingStatus == BlockBookingStatus.Confirmed)
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(a => new FestivalArtistResponse(
                a.Id,
                a.Name,
                a.AppearanceCount,
                BlockBookingStatusFormat.ToApiString(
                    RollUpBookingStatus(a.CountedAppearances, a.ConfirmedAppearances)),
                a.ConfirmedAppearances))
            .ToList();
    }

    /// <summary>
    /// An artist is only confirmed for the festival once every appearance that still counts is
    /// confirmed — one held appearance keeps the whole booking a hold. Canceled appearances are
    /// ignored, and an artist with no appearances yet is a hold.
    /// </summary>
    private static BlockBookingStatus RollUpBookingStatus(int countedAppearances, int confirmedAppearances) =>
        countedAppearances > 0 && confirmedAppearances == countedAppearances
            ? BlockBookingStatus.Confirmed
            : BlockBookingStatus.Hold;

    public async Task<FestivalArtistResponse> CreateAsync(
        Guid venueId,
        Guid eventId,
        CreateFestivalArtistRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var name = (request.Name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(name))
            throw new ValidationException("Artist name is required.");
        if (name.Length > 255)
            throw new ValidationException("Artist name must be 255 characters or fewer.");

        var exists = await _db.FestivalArtists.AnyAsync(
            a => a.EventId == eventId && a.Name.ToLower() == name.ToLower(), cancellationToken);
        if (exists)
            throw new ConflictException($"An artist named '{name}' already exists in this festival.");

        var artist = new FestivalArtist
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = name,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.FestivalArtists.Add(artist);
        await _db.SaveChangesAsync(cancellationToken);

        return new FestivalArtistResponse(
            artist.Id,
            artist.Name,
            0,
            BlockBookingStatusFormat.ToApiString(BlockBookingStatus.Hold),
            0);
    }

    /// <summary>
    /// All of one artist's appearances across the festival, so schedulers can see the full
    /// picture while each block still settles independently.
    /// </summary>
    public async Task<IReadOnlyList<ArtistAppearanceDto>> GetAppearancesAsync(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);
        await RequireArtistAsync(eventId, artistId, cancellationToken);

        return await _db.ProgrammingBlocks
            .AsNoTracking()
            .Include(b => b.StageZone)
            .Where(b => b.EventId == eventId && b.FestivalArtistId == artistId)
            .OrderBy(b => b.DayDate).ThenBy(b => b.StartTime)
            .Select(b => new ArtistAppearanceDto(
                b.Id,
                b.Title,
                b.DayDate.ToString("yyyy-MM-dd"),
                b.StageZone.Name,
                b.StartTime.ToString("HH:mm"),
                b.EndTime.ToString("HH:mm"),
                BlockScheduleStatusFormat.ToApiString(b.ScheduleStatus),
                BlockSettlementStatusFormat.ToApiString(b.SettlementStatus),
                null,
                BlockBookingStatusFormat.ToApiString(b.BookingStatus)))
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Copies deal terms from one of an artist's blocks onto their other blocks — the PRD's
    /// "easy to reuse deal terms across related appearances". Finalized targets are refused
    /// so a finalized settlement is never rewritten (Constitution V).
    /// </summary>
    public async Task<int> CopyDealTermsAsync(
        Guid venueId,
        Guid eventId,
        Guid artistId,
        CopyDealTermsRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        await RequireArtistAsync(eventId, artistId, cancellationToken);

        var source = await _db.ProgrammingBlocks
            .AsNoTracking()
            .FirstOrDefaultAsync(
                b => b.Id == request.SourceBlockId && b.EventId == eventId,
                cancellationToken)
            ?? throw new NotFoundException("Source block not found.");

        if (request.TargetBlockIds.Count == 0)
            return 0;

        var targets = await _db.ProgrammingBlocks
            .Where(b => b.EventId == eventId
                        && request.TargetBlockIds.Contains(b.Id)
                        && b.Id != source.Id)
            .ToListAsync(cancellationToken);

        var finalized = targets.Where(t => t.SettlementStatus == BlockSettlementStatus.Finalized).ToList();
        if (finalized.Count > 0)
        {
            throw new ConflictException(
                $"{finalized.Count} target block(s) have finalized settlements. " +
                "Reopen them before copying deal terms.");
        }

        foreach (var target in targets)
        {
            target.DealType = source.DealType;
            target.BaseGuarantee = source.BaseGuarantee;
            target.BackendPercentage = source.BackendPercentage;
            target.PercentBasis = source.PercentBasis;
            target.CapAmount = source.CapAmount;
            target.FloorAmount = source.FloorAmount;
            target.BonusThresholdAmount = source.BonusThresholdAmount;
            target.BonusAmount = source.BonusAmount;
            target.TaxWithholdingPercentage = source.TaxWithholdingPercentage;
            target.CustomFormulaExpression = source.CustomFormulaExpression;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return targets.Count;
    }

    private async Task RequireArtistAsync(
        Guid eventId,
        Guid artistId,
        CancellationToken cancellationToken)
    {
        var exists = await _db.FestivalArtists
            .AnyAsync(a => a.Id == artistId && a.EventId == eventId, cancellationToken);

        if (!exists)
            throw new NotFoundException("Artist not found in this festival.");
    }
}
