using System.Net;
using System.Text.Json;
using SplitRail.Api.DTOs;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Middleware;

public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;

    public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, type, detail, errors) = exception switch
        {
            AuthenticationException auth => (HttpStatusCode.Unauthorized, "authentication", auth.Message, (IReadOnlyList<string>?)null),
            AuthorizationException authz => (HttpStatusCode.Forbidden, "authorization", authz.Message, null),
            ValidationException validation => (HttpStatusCode.BadRequest, "validation", validation.Message,
                validation.Errors.Count > 0 ? validation.Errors : null),
            LastAdminException lastAdmin => (HttpStatusCode.BadRequest, "validation", lastAdmin.Message, null),
            NotFoundException notFound => (HttpStatusCode.NotFound, "not_found", notFound.Message, null),
            ConflictException conflict => (HttpStatusCode.Conflict, "conflict", conflict.Message, null),
            LedgerStateException ledgerState => (HttpStatusCode.BadRequest, "ledger_state", ledgerState.Message, null),
            FormulaEvaluationException formula => (HttpStatusCode.UnprocessableEntity, "formula_evaluation", formula.Message, null),
            ConcurrencyConflictException concurrency => (HttpStatusCode.Conflict, "concurrency", concurrency.Message, null),
            QboTokenRefreshException tokenRefresh => (HttpStatusCode.BadGateway, "qbo_token_refresh", tokenRefresh.Message, null),
            QboSyncException sync => (HttpStatusCode.BadGateway, "qbo_sync", sync.Message, null),
            QboMappingConflictException mapping => (HttpStatusCode.Conflict, "qbo_mapping", mapping.Message, null),
            SettlementStateException settlementState => (HttpStatusCode.BadRequest, "ledger_state", settlementState.Message, null),
            SignatureValidationException signature => (HttpStatusCode.BadRequest, "validation", signature.Message, null),
            SettlementArchiveException archive => (HttpStatusCode.BadGateway, "settlement_archive", archive.Message, null),
            _ => (HttpStatusCode.InternalServerError, "internal", "An unexpected error occurred.", null)
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(exception, "Unhandled exception");
        else
            _logger.LogWarning("Request failed with {ExceptionType}", exception.GetType().Name);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = new ErrorResponse
        {
            Type = type,
            Detail = detail,
            Errors = errors
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
