using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Programming block CRUD, same-stage conflict validation, status transitions, and the
/// audit trail behind them.
///
/// Two rules shape everything here: overlapping blocks on the SAME stage are rejected while
/// cross-stage overlap is core supported behavior (spec FR-010), and status changes never
/// silently rewrite a settlement outcome (spec FR-014).
/// </summary>
public class ProgrammingBlockService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;
    private readonly FestivalAuditService _audit;

    public ProgrammingBlockService(
        ApplicationDbContext db,
        FestivalAccessGuard guard,
        FestivalAuditService audit)
    {
        _db = db;
        _guard = guard;
        _audit = audit;
    }

    public async Task<ProgrammingBlockResponse> CreateAsync(
        Guid venueId,
        Guid eventId,
        CreateProgrammingBlockRequest request,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);

        var parsed = ParseAndValidate(
            festival,
            request.Title,
            request.DayDate,
            request.StartTime,
            request.EndTime,
            request.Category,
            request.LoadInTime,
            request.SoundcheckTime);

        await AssertStageBelongsToFestivalAsync(eventId, request.StageZoneId, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, request.StageZoneId, cancellationToken);

        await AssertNoSameStageConflictAsync(
            eventId, request.StageZoneId, parsed.DayDate, parsed.StartTime, parsed.EndTime,
            excludingBlockId: null, cancellationToken);

        var artistId = await ResolveArtistIdAsync(
            eventId, request.FestivalArtistId, request.NewArtistName, cancellationToken);

        var bookingStatus = ParseBookingStatus(request.BookingStatus) ?? BlockBookingStatus.Hold;

        var block = new ProgrammingBlock
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            StageZoneId = request.StageZoneId,
            FestivalArtistId = artistId,
            DayDate = parsed.DayDate,
            StartTime = parsed.StartTime,
            EndTime = parsed.EndTime,
            Title = parsed.Title,
            Category = parsed.Category,
            RequiresSettlement = request.RequiresSettlement,
            SettlementStatus = request.RequiresSettlement
                ? BlockSettlementStatus.Draft
                : BlockSettlementStatus.NotRequired,
            IsPubliclyVisible = request.IsPubliclyVisible,
            Description = request.Description,
            LoadInTime = parsed.LoadInTime,
            SoundcheckTime = parsed.SoundcheckTime,
            ScheduleStatus = BlockScheduleStatus.Scheduled,
            BookingStatus = bookingStatus,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.ProgrammingBlocks.Add(block);
        await _db.SaveChangesAsync(cancellationToken);

        var warnings = await BuildArtistOverlapWarningsAsync(block, cancellationToken);
        return await ToResponseAsync(block.Id, warnings, cancellationToken);
    }

    public async Task<ProgrammingBlockResponse> UpdateAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        UpdateProgrammingBlockRequest request,
        CancellationToken cancellationToken = default)
    {
        var festival = await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);

        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This block's settlement is finalized. Reopen it before changing the block.");
        }

        var parsed = ParseAndValidate(
            festival,
            request.Title,
            request.DayDate,
            request.StartTime,
            request.EndTime,
            request.Category,
            request.LoadInTime,
            request.SoundcheckTime);

        await AssertStageBelongsToFestivalAsync(eventId, request.StageZoneId, cancellationToken);
        await _guard.RequireStageAccessAsync(eventId, request.StageZoneId, cancellationToken);

        // Only active blocks compete for a slot, and the block being edited never conflicts
        // with itself — which is also what frees its previous slot on a move.
        if (block.ScheduleStatus.IsActive())
        {
            await AssertNoSameStageConflictAsync(
                eventId, request.StageZoneId, parsed.DayDate, parsed.StartTime, parsed.EndTime,
                excludingBlockId: blockId, cancellationToken);
        }

        var moved = block.StageZoneId != request.StageZoneId || block.DayDate != parsed.DayDate;
        var rescheduled = block.StartTime != parsed.StartTime || block.EndTime != parsed.EndTime;

        var prior = new
        {
            DayDate = block.DayDate.ToString("yyyy-MM-dd"),
            StageZoneId = block.StageZoneId,
            StartTime = block.StartTime.ToString("HH:mm"),
            EndTime = block.EndTime.ToString("HH:mm")
        };

        block.StageZoneId = request.StageZoneId;
        block.FestivalArtistId = await ResolveArtistIdAsync(
            eventId, request.FestivalArtistId, request.NewArtistName, cancellationToken);
        block.DayDate = parsed.DayDate;
        block.StartTime = parsed.StartTime;
        block.EndTime = parsed.EndTime;
        block.Title = parsed.Title;
        block.Category = parsed.Category;
        block.RequiresSettlement = request.RequiresSettlement;
        block.IsPubliclyVisible = request.IsPubliclyVisible;
        block.Description = request.Description;
        block.LoadInTime = parsed.LoadInTime;
        block.SoundcheckTime = parsed.SoundcheckTime;

        if (request.RequiresSettlement && block.SettlementStatus == BlockSettlementStatus.NotRequired)
            block.SettlementStatus = BlockSettlementStatus.Draft;

        if (ParseBookingStatus(request.BookingStatus) is BlockBookingStatus requestedBooking
            && requestedBooking != block.BookingStatus)
        {
            RecordBookingStatusChange(eventId, block, requestedBooking, reason: null);
            block.BookingStatus = requestedBooking;
        }

        if (moved || rescheduled)
        {
            // A material schedule change after settlement work started must be reviewed
            // before the settlement can be finalized (spec FR-014).
            if (HasSettlementWorkStarted(block))
                block.RequiresSettlementReview = true;

            _audit.Record(
                eventId,
                FestivalAuditEntityTypes.ProgrammingBlock,
                block.Id,
                moved ? FestivalAuditActions.Moved : FestivalAuditActions.Reschedule,
                prior,
                new
                {
                    DayDate = block.DayDate.ToString("yyyy-MM-dd"),
                    StageZoneId = block.StageZoneId,
                    StartTime = block.StartTime.ToString("HH:mm"),
                    EndTime = block.EndTime.ToString("HH:mm")
                });
        }

        await _db.SaveChangesAsync(cancellationToken);

        var warnings = await BuildArtistOverlapWarningsAsync(block, cancellationToken);
        return await ToResponseAsync(block.Id, warnings, cancellationToken);
    }

    public async Task<ProgrammingBlockResponse> SetStatusAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        SetBlockStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);

        if (!BlockScheduleStatusFormat.TryFromApiString(request.Status, out var newStatus))
            throw new ValidationException($"Unknown block status '{request.Status}'.");

        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        var priorStatus = block.ScheduleStatus;
        if (priorStatus == newStatus)
            return await ToResponseAsync(blockId, [], cancellationToken);

        // Reinstating a block re-enters the competition for its slot.
        if (!priorStatus.IsActive() && newStatus.IsActive())
        {
            await AssertNoSameStageConflictAsync(
                eventId, block.StageZoneId, block.DayDate, block.StartTime, block.EndTime,
                excludingBlockId: blockId, cancellationToken);
        }

        block.ScheduleStatus = newStatus;

        // Canceled / partially completed blocks with settlement work must be reviewed rather
        // than silently settled or written off (spec FR-013, FR-014).
        var needsReview = newStatus is BlockScheduleStatus.Canceled or BlockScheduleStatus.PartiallyCompleted;
        if (needsReview && HasSettlementWorkStarted(block))
            block.RequiresSettlementReview = true;

        _audit.Record(
            eventId,
            FestivalAuditEntityTypes.ProgrammingBlock,
            blockId,
            FestivalAuditActions.StatusChange,
            new { Status = BlockScheduleStatusFormat.ToApiString(priorStatus) },
            new { Status = BlockScheduleStatusFormat.ToApiString(newStatus) },
            request.Reason);

        await _db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(blockId, [], cancellationToken);
    }

    /// <summary>
    /// Promotes a held appearance to confirmed, or demotes it back to a hold. Booking commitment
    /// is deliberately separate from the schedule lifecycle, so a confirmed block can still be
    /// delayed or canceled and a held block can still occupy its slot.
    /// </summary>
    public async Task<ProgrammingBlockResponse> SetBookingStatusAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        SetBlockBookingStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);

        if (!BlockBookingStatusFormat.TryFromApiString(request.BookingStatus, out var newStatus))
            throw new ValidationException($"Unknown booking status '{request.BookingStatus}'.");

        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        if (block.SettlementStatus == BlockSettlementStatus.Finalized)
        {
            throw new SettlementStateException(
                "This block's settlement is finalized. Reopen it before changing the booking status.");
        }

        if (block.BookingStatus == newStatus)
            return await ToResponseAsync(blockId, [], cancellationToken);

        RecordBookingStatusChange(eventId, block, newStatus, request.Reason);
        block.BookingStatus = newStatus;

        await _db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(blockId, [], cancellationToken);
    }

    public async Task DeleteAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, false, cancellationToken);
        var block = await RequireBlockAsync(eventId, blockId, tracked: true, cancellationToken);

        await _guard.RequireStageAccessAsync(eventId, block.StageZoneId, cancellationToken);

        // Once money is involved the block is cancelled, never erased — deleting would
        // destroy the settlement trail.
        if (HasSettlementWorkStarted(block))
        {
            throw new ConflictException(
                "This block has settlement work. Cancel it instead of deleting it.");
        }

        _db.ProgrammingBlocks.Remove(block);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FestivalAuditEntryResponse>> GetHistoryAsync(
        Guid venueId,
        Guid eventId,
        Guid blockId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        return await _db.FestivalAuditEntries
            .AsNoTracking()
            .Where(e => e.EventId == eventId
                        && e.EntityType == FestivalAuditEntityTypes.ProgrammingBlock
                        && e.EntityId == blockId)
            .OrderByDescending(e => e.OccurredAt)
            .Select(e => new FestivalAuditEntryResponse(
                e.Id, e.EntityType, e.EntityId, e.Action,
                e.PriorValueJson, e.NewValueJson, e.UserId, e.OccurredAt, e.Reason))
            .ToListAsync(cancellationToken);
    }

    // ---- internals -------------------------------------------------------

    /// <summary>
    /// Same-stage overlap check. Two active blocks conflict when each starts before the other
    /// ends; canceled blocks and blocks that moved away no longer hold their slot (D12).
    /// </summary>
    private async Task AssertNoSameStageConflictAsync(
        Guid eventId,
        Guid stageZoneId,
        DateOnly dayDate,
        TimeOnly startTime,
        TimeOnly endTime,
        Guid? excludingBlockId,
        CancellationToken cancellationToken)
    {
        var conflict = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.EventId == eventId
                        && b.StageZoneId == stageZoneId
                        && b.DayDate == dayDate
                        && (excludingBlockId == null || b.Id != excludingBlockId)
                        && (b.ScheduleStatus == BlockScheduleStatus.Scheduled
                            || b.ScheduleStatus == BlockScheduleStatus.Delayed)
                        && startTime < b.EndTime
                        && endTime > b.StartTime)
            .Select(b => new { b.Id, b.Title, b.StartTime, b.EndTime })
            .FirstOrDefaultAsync(cancellationToken);

        if (conflict is not null)
        {
            throw new BlockConflictException(
                $"'{conflict.Title}' already occupies this stage from " +
                $"{conflict.StartTime:HH\\:mm} to {conflict.EndTime:HH\\:mm}.",
                conflict.Id,
                conflict.Title,
                conflict.StartTime,
                conflict.EndTime);
        }
    }

    /// <summary>
    /// The same artist booked into overlapping appearances is surfaced as a warning rather
    /// than blocked — cross-stage overlap can be intentional (spec FR-011).
    /// </summary>
    private async Task<List<FestivalWarning>> BuildArtistOverlapWarningsAsync(
        ProgrammingBlock block,
        CancellationToken cancellationToken)
    {
        var warnings = new List<FestivalWarning>();

        if (block.FestivalArtistId is not Guid artistId)
            return warnings;

        var overlapping = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.EventId == block.EventId
                        && b.Id != block.Id
                        && b.FestivalArtistId == artistId
                        && b.DayDate == block.DayDate
                        && (b.ScheduleStatus == BlockScheduleStatus.Scheduled
                            || b.ScheduleStatus == BlockScheduleStatus.Delayed)
                        && block.StartTime < b.EndTime
                        && block.EndTime > b.StartTime)
            .Select(b => b.Title)
            .FirstOrDefaultAsync(cancellationToken);

        if (overlapping is not null)
        {
            warnings.Add(new FestivalWarning(
                FestivalWarningCodes.ArtistDoubleBooked,
                $"This artist also appears in '{overlapping}' at an overlapping time."));
        }

        if (block.RequiresSettlementReview)
        {
            warnings.Add(new FestivalWarning(
                FestivalWarningCodes.SettlementReviewRequired,
                "This block changed after settlement work started and needs review before finalizing."));
        }

        return warnings;
    }

    private void RecordBookingStatusChange(
        Guid eventId,
        ProgrammingBlock block,
        BlockBookingStatus newStatus,
        string? reason) =>
        _audit.Record(
            eventId,
            FestivalAuditEntityTypes.ProgrammingBlock,
            block.Id,
            FestivalAuditActions.BookingStatusChange,
            new { BookingStatus = BlockBookingStatusFormat.ToApiString(block.BookingStatus) },
            new { BookingStatus = BlockBookingStatusFormat.ToApiString(newStatus) },
            reason);

    private static BlockBookingStatus? ParseBookingStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!BlockBookingStatusFormat.TryFromApiString(raw, out var status))
            throw new ValidationException($"Unknown booking status '{raw}'.");

        return status;
    }

    private static bool HasSettlementWorkStarted(ProgrammingBlock block) =>
        block.RequiresSettlement
        && block.SettlementStatus != BlockSettlementStatus.NotRequired;

    private async Task<Guid?> ResolveArtistIdAsync(
        Guid eventId,
        Guid? artistId,
        string? newArtistName,
        CancellationToken cancellationToken)
    {
        if (artistId is Guid id)
        {
            var exists = await _db.FestivalArtists
                .AnyAsync(a => a.Id == id && a.EventId == eventId, cancellationToken);
            if (!exists)
                throw new ValidationException("The selected artist is not part of this festival.");
            return id;
        }

        var name = newArtistName?.Trim();
        if (string.IsNullOrEmpty(name))
            return null;

        var existing = await _db.FestivalArtists
            .FirstOrDefaultAsync(
                a => a.EventId == eventId && a.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (existing is not null)
            return existing.Id;

        var artist = new FestivalArtist
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = name,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.FestivalArtists.Add(artist);
        return artist.Id;
    }

    private async Task AssertStageBelongsToFestivalAsync(
        Guid eventId,
        Guid stageZoneId,
        CancellationToken cancellationToken)
    {
        var valid = await _db.StageZones
            .AnyAsync(s => s.Id == stageZoneId && s.EventId == eventId, cancellationToken);

        if (!valid)
            throw new ValidationException("The selected stage is not part of this festival.");
    }

    private async Task<ProgrammingBlock> RequireBlockAsync(
        Guid eventId,
        Guid blockId,
        bool tracked,
        CancellationToken cancellationToken)
    {
        var query = _db.ProgrammingBlocks.Where(b => b.Id == blockId && b.EventId == eventId);
        if (!tracked)
            query = query.AsNoTracking();

        return await query.FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Programming block not found.");
    }

    private sealed record ParsedBlock(
        string Title,
        DateOnly DayDate,
        TimeOnly StartTime,
        TimeOnly EndTime,
        BlockCategory Category,
        TimeOnly? LoadInTime,
        TimeOnly? SoundcheckTime);

    private static ParsedBlock ParseAndValidate(
        Event festival,
        string title,
        string dayDateRaw,
        string startTimeRaw,
        string endTimeRaw,
        string categoryRaw,
        string? loadInRaw,
        string? soundcheckRaw)
    {
        var trimmedTitle = (title ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmedTitle))
            throw new ValidationException("Title or act name is required.");
        if (trimmedTitle.Length > 255)
            throw new ValidationException("Title must be 255 characters or fewer.");

        if (!DateOnly.TryParse(dayDateRaw, out var dayDate))
            throw new ValidationException("Day must be a valid date (yyyy-MM-dd).");

        var lastDay = festival.EndDate ?? festival.EventDate;
        if (dayDate < festival.EventDate || dayDate > lastDay)
        {
            throw new ValidationException(
                $"The selected day falls outside the festival range " +
                $"({festival.EventDate:yyyy-MM-dd} to {lastDay:yyyy-MM-dd}).");
        }

        if (!TimeOnly.TryParse(startTimeRaw, out var startTime))
            throw new ValidationException("Start time must be a valid time (HH:mm).");
        if (!TimeOnly.TryParse(endTimeRaw, out var endTime))
            throw new ValidationException("End time must be a valid time (HH:mm).");

        if (startTime >= endTime)
            throw new ValidationException("End time must be after the start time.");

        if (!BlockCategoryFormat.TryFromApiString(categoryRaw, out var category))
            throw new ValidationException($"Unknown block category '{categoryRaw}'.");

        TimeOnly? loadIn = null;
        if (!string.IsNullOrWhiteSpace(loadInRaw))
        {
            if (!TimeOnly.TryParse(loadInRaw, out var parsedLoadIn))
                throw new ValidationException("Load-in time must be a valid time (HH:mm).");
            loadIn = parsedLoadIn;
        }

        TimeOnly? soundcheck = null;
        if (!string.IsNullOrWhiteSpace(soundcheckRaw))
        {
            if (!TimeOnly.TryParse(soundcheckRaw, out var parsedSoundcheck))
                throw new ValidationException("Soundcheck time must be a valid time (HH:mm).");
            soundcheck = parsedSoundcheck;
        }

        return new ParsedBlock(trimmedTitle, dayDate, startTime, endTime, category, loadIn, soundcheck);
    }

    internal async Task<ProgrammingBlockResponse> ToResponseAsync(
        Guid blockId,
        IReadOnlyList<FestivalWarning> warnings,
        CancellationToken cancellationToken)
    {
        var row = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Include(b => b.StageZone)
            .Include(b => b.FestivalArtist)
            .FirstAsync(b => b.Id == blockId, cancellationToken);

        return ToResponse(row, warnings);
    }

    internal static ProgrammingBlockResponse ToResponse(
        ProgrammingBlock block,
        IReadOnlyList<FestivalWarning> warnings) =>
        new(
            block.Id,
            block.EventId,
            block.StageZoneId,
            block.StageZone?.Name ?? string.Empty,
            block.FestivalArtistId,
            block.FestivalArtist?.Name,
            block.DayDate.ToString("yyyy-MM-dd"),
            block.StartTime.ToString("HH:mm"),
            block.EndTime.ToString("HH:mm"),
            block.Title,
            BlockCategoryFormat.ToApiString(block.Category),
            BlockScheduleStatusFormat.ToApiString(block.ScheduleStatus),
            BlockBookingStatusFormat.ToApiString(block.BookingStatus),
            BlockSettlementStatusFormat.ToApiString(block.SettlementStatus),
            block.RequiresSettlement,
            block.RequiresSettlementReview,
            block.IsPubliclyVisible,
            block.Description,
            block.LoadInTime?.ToString("HH:mm"),
            block.SoundcheckTime?.ToString("HH:mm"),
            warnings);
}
