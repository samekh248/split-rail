using FluentAssertions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncServiceTests
{
    [Fact]
    public void ParseQueryResponse_FiltersByTagName()
    {
        var json = """
            {
              "QueryResponse": {
                "Purchase": [
                  {
                    "Id": "1",
                    "TotalAmt": 25.50,
                    "TxnDate": "2026-06-10",
                    "Tag": [{ "Name": "EVENT-A" }],
                    "AccountRef": { "value": "ACC-1", "name": "Rent" }
                  },
                  {
                    "Id": "2",
                    "TotalAmt": 10.00,
                    "TxnDate": "2026-06-10",
                    "Tag": [{ "Name": "OTHER" }],
                    "AccountRef": { "value": "ACC-2", "name": "Other" }
                  }
                ]
              }
            }
            """;

        var results = QboTransactionClient.ParseQueryResponse(json, "Purchase", "EVENT-A");

        results.Should().HaveCount(1);
        results[0].TransactionId.Should().Be("1");
        results[0].Amount.Should().Be(25.50m);
        results[0].AccountId.Should().Be("ACC-1");
    }

    [Fact]
    public void ParseQueryResponse_ReturnsEmptyWhenNoMatchingTag()
    {
        var json = """
            {
              "QueryResponse": {
                "Purchase": [{
                  "Id": "1",
                  "TotalAmt": 25.50,
                  "TxnDate": "2026-06-10",
                  "Tag": [{ "Name": "OTHER" }],
                  "AccountRef": { "value": "ACC-1", "name": "Rent" }
                }]
              }
            }
            """;

        var results = QboTransactionClient.ParseQueryResponse(json, "Purchase", "EVENT-A");
        results.Should().BeEmpty();
    }
}
