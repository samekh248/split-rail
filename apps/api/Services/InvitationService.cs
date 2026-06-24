using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class InvitationService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly TokenService _tokenService;
    private readonly ILogger<InvitationService> _logger;

    public InvitationService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        TokenService tokenService,
        ILogger<InvitationService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<(InvitationResponse Response, string RawToken)> SendInvitationAsync(
        CreateInvitationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        if (!PasswordValidator.IsValidEmail(request.Email))
            throw new ValidationException("Invalid email address.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var role = await _db.OrganizationRoles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.OrganizationId == orgId, cancellationToken)
            ?? throw new ValidationException("Invalid role ID.");

        var existingUser = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            var isMember = await _db.UserOrganizationMappings
                .IgnoreQueryFilters()
                .AnyAsync(m => m.UserId == existingUser.Id && m.OrganizationId == orgId, cancellationToken);
            if (isMember)
                throw new ConflictException("User is already a member of this organization.");
        }

        if (request.VenueIds is { Count: > 0 })
        {
            var validCount = await _db.Venues
                .CountAsync(v => request.VenueIds.Contains(v.Id) && v.OrganizationId == orgId, cancellationToken);
            if (validCount != request.VenueIds.Count)
                throw new ValidationException("One or more venue IDs are invalid.");
        }

        var rawToken = TokenService.GenerateSecureToken();
        var invitation = new Invitation
        {
            OrganizationId = orgId,
            Email = normalizedEmail,
            RoleId = role.Id,
            TokenHash = TokenService.HashToken(rawToken),
            Status = InvitationStatus.Pending,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        _db.Invitations.Add(invitation);
        await _db.SaveChangesAsync(cancellationToken);

        if (request.VenueIds is { Count: > 0 })
        {
            foreach (var venueId in request.VenueIds.Distinct())
            {
                _db.InvitationVenueScopes.Add(new InvitationVenueScope
                {
                    InvitationId = invitation.Id,
                    VenueId = venueId
                });
            }
            await _db.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("Invitation {InvitationId} sent to {Email} for org {OrgId}",
            invitation.Id, normalizedEmail, orgId);

        var venueScopes = await LoadInvitationVenueScopesAsync(invitation.Id, cancellationToken);

        return (new InvitationResponse(
            invitation.Id,
            invitation.Email,
            role.RoleName,
            invitation.Status,
            invitation.ExpiresAt,
            invitation.CreatedAt,
            venueScopes), rawToken);
    }

    public async Task<AcceptInvitationResponse> AcceptInvitationAsync(
        AcceptInvitationRequest request,
        CancellationToken cancellationToken = default)
    {
        var hash = TokenService.HashToken(request.Token);
        var invitation = await _db.Invitations
            .IgnoreQueryFilters()
            .Include(i => i.Role)
            .Include(i => i.VenueScopes)
            .FirstOrDefaultAsync(i => i.TokenHash == hash, cancellationToken)
            ?? throw new NotFoundException("Invitation not found or expired.");

        if (invitation.Status == InvitationStatus.Accepted)
            throw new ConflictException("User is already a member of this organization.");

        if (invitation.Status == InvitationStatus.Expired || invitation.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            invitation.Status = InvitationStatus.Expired;
            await _db.SaveChangesAsync(cancellationToken);
            throw new NotFoundException("Invitation not found or expired.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == invitation.Email, cancellationToken);
        if (user is null)
        {
            if (string.IsNullOrEmpty(request.Password))
                throw new ValidationException("Password is required for new accounts.");

            var passwordErrors = PasswordValidator.ValidatePassword(request.Password);
            if (passwordErrors.Count > 0)
                throw new ValidationException(passwordErrors);

            user = new User
            {
                Email = invitation.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var alreadyMember = await _db.UserOrganizationMappings
            .IgnoreQueryFilters()
            .AnyAsync(m => m.UserId == user.Id && m.OrganizationId == invitation.OrganizationId, cancellationToken);
        if (alreadyMember)
            throw new ConflictException("User is already a member of this organization.");

        _db.UserOrganizationMappings.Add(new UserOrganizationMapping
        {
            UserId = user.Id,
            OrganizationId = invitation.OrganizationId,
            RoleId = invitation.RoleId
        });

        foreach (var scope in invitation.VenueScopes)
        {
            _db.UserVenueScopes.Add(new UserVenueScope
            {
                UserId = user.Id,
                VenueId = scope.VenueId
            });
        }

        invitation.Status = InvitationStatus.Accepted;
        await _db.SaveChangesAsync(cancellationToken);

        var (accessToken, refreshToken, expiresIn) =
            await _tokenService.IssueTokenPairAsync(user, invitation.OrganizationId, cancellationToken);

        _logger.LogInformation("Invitation {InvitationId} accepted by user {UserId}", invitation.Id, user.Id);

        return new AcceptInvitationResponse(accessToken, refreshToken, expiresIn, invitation.OrganizationId);
    }

    public async Task<(InvitationResponse Response, string RawToken)> ResendInvitationAsync(
        Guid invitationId,
        CancellationToken cancellationToken = default)
    {
        var invitation = await _db.Invitations
            .Include(i => i.Role)
            .Include(i => i.VenueScopes)
            .ThenInclude(vs => vs.Venue)
            .FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken)
            ?? throw new NotFoundException("Invitation not found.");

        if (invitation.Status == InvitationStatus.Accepted)
            throw new ValidationException("Cannot resend an accepted invitation.");

        var rawToken = TokenService.GenerateSecureToken();
        invitation.TokenHash = TokenService.HashToken(rawToken);
        invitation.Status = InvitationStatus.Pending;
        invitation.ExpiresAt = DateTimeOffset.UtcNow.AddDays(7);
        await _db.SaveChangesAsync(cancellationToken);

        return (new InvitationResponse(
            invitation.Id,
            invitation.Email,
            invitation.Role.RoleName,
            invitation.Status,
            invitation.ExpiresAt,
            invitation.CreatedAt,
            MapVenueScopes(invitation.VenueScopes)), rawToken);
    }

    public async Task<IReadOnlyList<InvitationResponse>> ListInvitationsAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Invitations
            .AsNoTracking()
            .Include(i => i.Role)
            .Include(i => i.VenueScopes)
            .ThenInclude(vs => vs.Venue)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new InvitationResponse(
                i.Id,
                i.Email,
                i.Role.RoleName,
                i.Status,
                i.ExpiresAt,
                i.CreatedAt,
                i.VenueScopes.Select(vs => new VenueScopeDto(vs.VenueId, vs.Venue.Name)).ToList()))
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<VenueScopeDto>> LoadInvitationVenueScopesAsync(
        Guid invitationId,
        CancellationToken cancellationToken)
    {
        return await _db.InvitationVenueScopes
            .AsNoTracking()
            .Where(vs => vs.InvitationId == invitationId)
            .Join(
                _db.Venues.AsNoTracking(),
                vs => vs.VenueId,
                v => v.Id,
                (vs, v) => new VenueScopeDto(vs.VenueId, v.Name))
            .ToListAsync(cancellationToken);
    }

    private static IReadOnlyList<VenueScopeDto> MapVenueScopes(IEnumerable<InvitationVenueScope> scopes) =>
        scopes.Select(vs => new VenueScopeDto(vs.VenueId, vs.Venue.Name)).ToList();

    public async Task CancelInvitationAsync(Guid invitationId, CancellationToken cancellationToken = default)
    {
        var invitation = await _db.Invitations
            .FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken)
            ?? throw new NotFoundException("Invitation not found.");

        if (invitation.Status == InvitationStatus.Accepted)
            throw new ValidationException("Cannot cancel an accepted invitation.");

        _db.Invitations.Remove(invitation);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
