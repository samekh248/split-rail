namespace SplitRail.Api.Exceptions;

public abstract class ApiException : Exception
{
    protected ApiException(string message) : base(message) { }
}

public sealed class AuthenticationException : ApiException
{
    public AuthenticationException(string message = "Authentication failed.") : base(message) { }
}

public sealed class AuthorizationException : ApiException
{
    public AuthorizationException(string message = "Access denied.") : base(message) { }
}

public sealed class ValidationException : ApiException
{
    public ValidationException(string message) : base(message) { }

    public ValidationException(IEnumerable<string> errors)
        : base(string.Join("; ", errors))
    {
        Errors = errors.ToList();
    }

    public IReadOnlyList<string> Errors { get; } = [];
}

public sealed class ConflictException : ApiException
{
    public ConflictException(string message) : base(message) { }
}

public sealed class NotFoundException : ApiException
{
    public NotFoundException(string message = "Resource not found.") : base(message) { }
}

public sealed class LastAdminException : ApiException
{
    public LastAdminException()
        : base("Cannot remove the last Admin.") { }
}

public sealed class LedgerStateException : ApiException
{
    public LedgerStateException(string message) : base(message) { }
}

public sealed class FormulaEvaluationException : ApiException
{
    public FormulaEvaluationException(string message, Guid? artistId = null) : base(message)
    {
        ArtistId = artistId;
    }

    public Guid? ArtistId { get; }
}

public sealed class ConcurrencyConflictException : ApiException
{
    public ConcurrencyConflictException(string message = "The record was modified by another user. Please refresh and retry.")
        : base(message) { }
}

public sealed class QboTokenRefreshException : ApiException
{
    public QboTokenRefreshException(string message, Guid? venueId = null, string? realmId = null) : base(message)
    {
        VenueId = venueId;
        RealmId = realmId;
    }

    public Guid? VenueId { get; }
    public string? RealmId { get; }
}

public sealed class QboSyncException : ApiException
{
    public QboSyncException(string message, string? errorCode = null) : base(message)
    {
        ErrorCode = errorCode;
    }

    public string? ErrorCode { get; }
}

public sealed class QboMappingConflictException : ApiException
{
    public QboMappingConflictException(string message) : base(message) { }
}

public sealed class SettlementStateException : ApiException
{
    public SettlementStateException(string message) : base(message) { }
}

public sealed class SettlementArchiveException : ApiException
{
    public SettlementArchiveException(string message) : base(message) { }
}

public sealed class SignatureValidationException : ApiException
{
    public SignatureValidationException(string message) : base(message) { }
}

public sealed class DataProtectionConfigurationException : ApiException
{
    public DataProtectionConfigurationException(string message) : base(message) { }
}
