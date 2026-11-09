## MODIFIED Requirements

### Requirement: Time-series response envelope

Edition: CE. Every time-series endpoint SHALL respond `200` with
`{ granularity, from, to, series: [{ name, points: [[ts, value]] }] }` where `from`/`to` are the resolved
range in UTC, `granularity` is the applied bucket size, `ts` is the bucket start as an ISO 8601 UTC string and
every series is dense over the range (a bucket without data holds `0` for counters and `null` for averages and peaks;
a UTC day whose `uniqueIdentities` the aggregator has not computed yet holds `null`).

#### Scenario: Dense series

- **GIVEN** `granularity=1h` over a 24 h range with data in only 3 hours
- **WHEN** the series is requested
- **THEN** each series has 24 points and the 21 empty buckets hold `0` (counter) or `null` (average)
