using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

/// <summary>
/// Per-festival stage/zone management. Stages exist only inside their Festival Wrapper and
/// are never shared across events in v1 (research.md D3).
/// </summary>
public class StageZoneService
{
    private readonly ApplicationDbContext _db;
    private readonly FestivalAccessGuard _guard;

    public StageZoneService(ApplicationDbContext db, FestivalAccessGuard guard)
    {
        _db = db;
        _guard = guard;
    }

    public async Task<IReadOnlyList<StageZoneResponse>> ListAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        return await _db.StageZones
            .AsNoTracking()
            .Where(s => s.EventId == eventId)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name)
            .Select(s => new StageZoneResponse(s.Id, s.Name, s.SortOrder, s.ProgrammingBlocks.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<StageZoneResponse> CreateAsync(
        Guid venueId,
        Guid eventId,
        CreateStageZoneRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var name = ValidateName(request.Name);
        await AssertNameAvailableAsync(eventId, name, excludingStageId: null, cancellationToken);

        var sortOrder = request.SortOrder
            ?? await NextSortOrderAsync(eventId, cancellationToken);

        var stage = new StageZone
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = name,
            SortOrder = sortOrder
        };

        _db.StageZones.Add(stage);
        await _db.SaveChangesAsync(cancellationToken);

        return new StageZoneResponse(stage.Id, stage.Name, stage.SortOrder, 0);
    }

    public async Task<StageZoneResponse> UpdateAsync(
        Guid venueId,
        Guid eventId,
        Guid stageId,
        UpdateStageZoneRequest request,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var stage = await _db.StageZones
            .FirstOrDefaultAsync(s => s.Id == stageId && s.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Stage not found.");

        var name = ValidateName(request.Name);
        await AssertNameAvailableAsync(eventId, name, stageId, cancellationToken);

        stage.Name = name;
        if (request.SortOrder is int sortOrder)
            stage.SortOrder = sortOrder;

        await _db.SaveChangesAsync(cancellationToken);

        var blockCount = await _db.ProgrammingBlocks
            .CountAsync(b => b.StageZoneId == stageId, cancellationToken);

        return new StageZoneResponse(stage.Id, stage.Name, stage.SortOrder, blockCount);
    }

    public async Task DeleteAsync(
        Guid venueId,
        Guid eventId,
        Guid stageId,
        CancellationToken cancellationToken = default)
    {
        await _guard.RequireFestivalAsync(venueId, eventId, asNoTracking: true, cancellationToken);

        var stage = await _db.StageZones
            .FirstOrDefaultAsync(s => s.Id == stageId && s.EventId == eventId, cancellationToken)
            ?? throw new NotFoundException("Stage not found.");

        // A scheduled Day always needs at least one stage to hang blocks from (spec FR-003).
        var stageCount = await _db.StageZones.CountAsync(s => s.EventId == eventId, cancellationToken);
        if (stageCount <= 1)
            throw new ConflictException("A festival must keep at least one stage.");

        var blockingBlockIds = await _db.ProgrammingBlocks
            .AsNoTracking()
            .Where(b => b.StageZoneId == stageId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        if (blockingBlockIds.Count > 0)
        {
            throw new ConflictException(
                $"This stage still has {blockingBlockIds.Count} programming block(s). " +
                "Move or cancel them before deleting the stage.");
        }

        _db.StageZones.Remove(stage);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AssertNameAvailableAsync(
        Guid eventId,
        string name,
        Guid? excludingStageId,
        CancellationToken cancellationToken)
    {
        var taken = await _db.StageZones.AnyAsync(
            s => s.EventId == eventId
                 && s.Name.ToLower() == name.ToLower()
                 && (excludingStageId == null || s.Id != excludingStageId),
            cancellationToken);

        if (taken)
            throw new ConflictException($"A stage named '{name}' already exists in this festival.");
    }

    private async Task<int> NextSortOrderAsync(Guid eventId, CancellationToken cancellationToken)
    {
        var hasStages = await _db.StageZones.AnyAsync(s => s.EventId == eventId, cancellationToken);
        if (!hasStages)
            return 0;

        return await _db.StageZones
            .Where(s => s.EventId == eventId)
            .MaxAsync(s => s.SortOrder, cancellationToken) + 1;
    }

    private static string ValidateName(string name)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new ValidationException("Stage name is required.");

        if (trimmed.Length > 255)
            throw new ValidationException("Stage name must be 255 characters or fewer.");

        return trimmed;
    }
}
