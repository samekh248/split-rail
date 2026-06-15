using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public record QboFetchedTransaction(
    string TransactionId,
    string AccountId,
    string AccountName,
    decimal Amount,
    DateOnly TransactionDate);

public class QboTransactionClient
{
    private static readonly string[] TransactionEntityTypes = ["Purchase", "Bill", "Deposit", "JournalEntry"];

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly QboSyncOptions _options;
    private readonly ILogger<QboTransactionClient> _logger;

    public QboTransactionClient(
        IHttpClientFactory httpClientFactory,
        IOptions<QboSyncOptions> options,
        ILogger<QboTransactionClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<QboFetchedTransaction>> FetchTransactionsByTagAsync(
        string accessToken,
        string realmId,
        string tagName,
        CancellationToken cancellationToken = default)
    {
        var client = _httpClientFactory.CreateClient("QboApi");
        var results = new List<QboFetchedTransaction>();
        var seenIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var entityType in TransactionEntityTypes)
        {
            var query = $"SELECT * FROM {entityType} WHERE MetaData.LastUpdatedTime > '1970-01-01'";
            var url =
                $"{_options.IntuitApiBaseUrl}/{realmId}/query?query={Uri.EscapeDataString(query)}&minorversion=65";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "QBO query failed for {EntityType}: {StatusCode}",
                    entityType,
                    response.StatusCode);
                throw new QboSyncException(
                    $"QBO API error querying {entityType}: {response.StatusCode}",
                    body.Length > 100 ? body[..100] : body);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var parsed = ParseQueryResponse(json, entityType, tagName);
            foreach (var txn in parsed)
            {
                if (seenIds.Add(txn.TransactionId))
                    results.Add(txn);
            }
        }

        return results;
    }

    internal static IReadOnlyList<QboFetchedTransaction> ParseQueryResponse(
        string json,
        string entityType,
        string tagName)
    {
        var results = new List<QboFetchedTransaction>();
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("QueryResponse", out var queryResponse))
            return results;

        if (!queryResponse.TryGetProperty(entityType, out var entities))
            return results;

        foreach (var entity in entities.EnumerateArray())
        {
            if (!EntityMatchesTag(entity, tagName))
                continue;

            var transactionId = entity.TryGetProperty("Id", out var idProp)
                ? idProp.GetString() ?? Guid.NewGuid().ToString("N")
                : Guid.NewGuid().ToString("N");

            var accountId = ExtractAccountId(entity) ?? "UNKNOWN";
            var accountName = ExtractAccountName(entity) ?? accountId;
            var amount = ExtractAmount(entity);
            var txnDate = ExtractTransactionDate(entity);

            results.Add(new QboFetchedTransaction(transactionId, accountId, accountName, amount, txnDate));
        }

        return results;
    }

    private static bool EntityMatchesTag(JsonElement entity, string tagName)
    {
        if (entity.TryGetProperty("Tag", out var tagArray))
        {
            foreach (var tag in tagArray.EnumerateArray())
            {
                if (tag.TryGetProperty("Name", out var nameProp) &&
                    string.Equals(nameProp.GetString(), tagName, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
        }

        return entity.TryGetProperty("PrivateNote", out var noteProp) &&
               noteProp.GetString()?.Contains(tagName, StringComparison.OrdinalIgnoreCase) == true;
    }

    private static string? ExtractAccountId(JsonElement entity)
    {
        if (entity.TryGetProperty("AccountRef", out var accountRef) &&
            accountRef.TryGetProperty("value", out var valueProp))
            return valueProp.GetString();

        if (entity.TryGetProperty("Line", out var lines))
        {
            foreach (var line in lines.EnumerateArray())
            {
                if (line.TryGetProperty("AccountBasedExpenseLineDetail", out var detail) &&
                    detail.TryGetProperty("AccountRef", out var lineAccountRef) &&
                    lineAccountRef.TryGetProperty("value", out var lineValue))
                    return lineValue.GetString();
            }
        }

        return null;
    }

    private static string? ExtractAccountName(JsonElement entity)
    {
        if (entity.TryGetProperty("AccountRef", out var accountRef) &&
            accountRef.TryGetProperty("name", out var nameProp))
            return nameProp.GetString();

        return null;
    }

    private static decimal ExtractAmount(JsonElement entity)
    {
        if (entity.TryGetProperty("TotalAmt", out var totalProp))
            return ParseDecimal(totalProp);

        if (entity.TryGetProperty("Amount", out var amountProp))
            return ParseDecimal(amountProp);

        return 0m;
    }

    private static DateOnly ExtractTransactionDate(JsonElement entity)
    {
        if (entity.TryGetProperty("TxnDate", out var dateProp))
        {
            var dateStr = dateProp.GetString();
            if (DateOnly.TryParse(dateStr, CultureInfo.InvariantCulture, out var date))
                return date;
        }

        return DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private static decimal ParseDecimal(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.GetDecimal(),
            JsonValueKind.String => decimal.Parse(element.GetString()!, CultureInfo.InvariantCulture),
            _ => 0m
        };
    }
}
