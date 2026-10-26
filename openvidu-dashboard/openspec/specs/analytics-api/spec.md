# analytics-api Specification

## Purpose
Usage analytics of the deployment read from the rollup collections: dense time series, breakdowns, KPI
summary and CSV export, with the source collection chosen by granularity and every query backed by the
`{ scope, bucket }` index.

## Requirements

### Requirement: Series endpoint

Edition: CE. `GET /api/v1/analytics/series` SHALL accept `metrics` (comma-separated, at least one), `from`, `to`,
`tz`, `granularity` and `scope` (default `global`) and answer the time-series envelope extended with `scope`, one
series per requested metric named as the metric, where `egressEnded` expands into one series per stored end status
named `egressEnded.<status>` (`egressEnded.complete`). Unknown metrics, duplicated metrics and a malformed `scope`
SHALL be rejected with `400`.

#### Scenario: Default request

- **GIVEN** the current time is 2026-10-13T12:00:00Z
- **WHEN** the client requests `GET /api/v1/analytics/series?metrics=roomsCreated,bytesUp`
- **THEN** the response is `200` with `scope: "global"`, `granularity: "5m"`, `from: "2026-10-12T12:00:00.000Z"`,
  `to: "2026-10-13T12:00:00.000Z"` and two series `roomsCreated` and `bytesUp` of 288 points each

#### Scenario: Egress end statuses

- **GIVEN** egresses that ended as `complete` and `failed` in the range (`EGRESS_COMPLETE` and `EGRESS_FAILED` in the
  LiveKit events)
- **WHEN** the client requests `metrics=egressEnded`
- **THEN** the response has the series `egressEnded.complete` and `egressEnded.failed` and no series for statuses
  absent from the range

#### Scenario: Unknown metric

- **WHEN** the client requests `metrics=roomsCreated,roomsDeleted`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["metrics"]`

### Requirement: Metric catalogue and fill values

Edition: CE. The CE metrics SHALL be the eighteen of the "CE metrics" scenario; counters and sums fill empty buckets with
`0`, rates and averages with `null`. Participant figures count STANDARD sessions only, except the `kind` breakdown.
`ingressSessions` SHALL sum the rollups' `ingress.sessionsStarted` and `ingressDurationMs` their `ingress.durationMs`.

#### Scenario: Connection success rate

- **GIVEN** a bucket with `participants.joined: 40` and `participants.active: 38` and an empty bucket
- **WHEN** `metrics=connectionSuccessRate` is requested
- **THEN** the first point is `95.0` (percentage with one decimal) and the empty bucket holds `null`

#### Scenario: Participant minutes

- **GIVEN** a bucket with `participants.minutes: 1234`
- **WHEN** `metrics=participantMinutes` is requested
- **THEN** the point is `1234` and empty buckets hold `0`

#### Scenario: Services are not participants

- **GIVEN** an hour in which 40 STANDARD and 6 EGRESS participants joined
- **WHEN** `metrics=participantsJoined` and the breakdown `dimensions=kind` are requested
- **THEN** the series point is `40` and the breakdown has `STANDARD: 40` and `EGRESS: 6`

#### Scenario: Ingress metrics on CE

- **GIVEN** a valid token on the CE dashboard and one hour of the last 24 h whose hourly document has
  `ingress.sessionsStarted: 3` and `ingress.durationMs: 5400000`
- **WHEN** the client requests `metrics=ingressSessions,ingressDurationMs&granularity=1h`
- **THEN** the response is `200` with the series `ingressSessions` and `ingressDurationMs` of 24 points, that hour
  holds `3` and `5400000` and the other hours hold `0`

#### Scenario: CE metrics

- **WHEN** a CE client requests analytics series
- **THEN** the metrics it can request are `roomsCreated`, `roomsEnded`, `participantsJoined`, `participantsActive`,
  `participantsAborted`, `connectionSuccessRate`, `uniqueIdentities`, `participantMinutes`, `tracksPublished`,
  `egressStarted`, `egressEnded`, `egressDurationMs`, `ingressSessions`, `ingressDurationMs`, `bytesUp`, `bytesDown`,
  `apiCalls` and `apiErrors`

### Requirement: Granularity and source collection

Edition: CE. Analytics series SHALL accept `granularity` `auto`, `5m`, `15m`, `1h`, `6h` and `1d`, reject `1m`,
read `analytics_5min` for `5m` and `15m`, `analytics_hourly` for `1h` and `6h` and `analytics_daily` for `1d`, and
SHALL never read entity or stats collections. Sub-hour values SHALL require a range of at most 24 h whose `from` is
inside the 5-minute rollup retention. `auto` SHALL resolve to `5m` (≤ 24 h inside that retention), `1h` (≤ 7 d), `6h`
(≤ 90 d), otherwise `1d`.

#### Scenario: Automatic resolution by range

- **WHEN** series are requested with `granularity=auto` for ranges of 24 h, 7 d, 30 d and 100 d
- **THEN** the responses use `5m`, `1h`, `6h` and `1d` and the integration test observes reads of `analytics_5min`,
  `analytics_hourly`, `analytics_hourly` and `analytics_daily` respectively

#### Scenario: Sub-hour granularity on a long range

- **WHEN** the client requests `granularity=5m` with `from=now-48h`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `5m` and `15m` require a range
  of at most 24 hours

#### Scenario: Day-old range beyond the stats retention

- **GIVEN** the stats and 5-minute rollup retentions are 7 d
- **WHEN** the client requests `granularity=auto` for a 24 h range that ended 30 days ago
- **THEN** the response uses `granularity: "1h"` read from `analytics_hourly`, and an explicit `granularity=5m` for
  the same range is rejected with `400` stating "5m and 15m require a range inside the 5-minute rollup retention
  (7 days)"

#### Scenario: 5-minute rollups kept apart from the stats

- **GIVEN** a stats retention of 7 d and a 5-minute rollup retention of 2 d
- **WHEN** the client requests `granularity=auto` for a 24 h range that ended 3 days ago
- **THEN** the response uses `granularity: "1h"`

#### Scenario: Retention named in hours

- **GIVEN** a 5-minute rollup retention of 36 h
- **WHEN** the client requests `granularity=5m` for a 24 h range that ended 2 days ago
- **THEN** the response is `400` stating "5m and 15m require a range inside the 5-minute rollup retention (36 hours)"

#### Scenario: Minute granularity and the bucket cap

- **WHEN** the client requests `granularity=1m` for any range, or `granularity=1h` for a 60-day range
- **THEN** both responses are `400`, the first stating that the finest analytics granularity is `5m` and the second
  stating the 1 000-bucket limit

### Requirement: Hourly-only metrics

Edition: CE. `participantMinutes`, `tracksPublished`, `egressEnded`, `egressDurationMs`, `ingressSessions`,
`ingressDurationMs`, `apiCalls` and `apiErrors` SHALL be served only at `1h` or coarser; a request for any of them
with an explicit or resolved granularity below `1h` SHALL be rejected with `400` naming the metric and the
granularity.

#### Scenario: Hourly-only metric at five minutes

- **WHEN** the client requests `metrics=egressStarted,egressEnded` with `granularity=auto` over 24 h
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `egressEnded` requires a
  granularity of at least `1h`, and the same metrics with `granularity=1h` answer `200` with 24 points per series

### Requirement: Timezone-aware buckets

Edition: CE. `6h` and `1d` buckets SHALL start at local midnight boundaries of `tz`; in a zone other than `UTC`,
`1d` buckets SHALL be built by summing hourly documents per local day while the range is inside the hourly
retention and SHALL otherwise fall back to UTC-day documents. `uniqueIdentities` SHALL always be reported per UTC
day, marked `basis: "utcDay"` on the series.

#### Scenario: Daily buckets in New York

- **GIVEN** `tz=America/New_York` and `granularity=1d` over 7 days
- **WHEN** the series is requested
- **THEN** every `ts` is a local midnight serialised in UTC (`…T04:00:00.000Z` or `…T05:00:00.000Z`) and each point
  equals the sum of the 24 hourly documents of that local day (23 or 25 on a DST change day)

#### Scenario: Unique identities in Madrid

- **GIVEN** `tz=Europe/Madrid` and `granularity=1d`
- **WHEN** `metrics=uniqueIdentities,roomsCreated` is requested
- **THEN** the `uniqueIdentities` series carries `basis: "utcDay"` with `ts` at `…T00:00:00.000Z` and
  `roomsCreated` has no `basis` and `ts` at local midnight

### Requirement: Dense series and bucket aggregation

Edition: CE. Every series SHALL contain exactly one point per bucket from `from` floored to the bucket start up to
and including the bucket containing `to`; when a bucket spans several rollup documents, counters SHALL be summed and
`connectionSuccessRate` SHALL be computed from the summed numerators and denominators.

#### Scenario: Sparse documents in a day

- **GIVEN** `analytics_5min` holds documents for only three 5-minute buckets of the last 24 h
- **WHEN** `metrics=roomsCreated,connectionSuccessRate` is requested with `granularity=5m`
- **THEN** both series have 288 points, `roomsCreated` holds `0` outside the three buckets and
  `connectionSuccessRate` holds `null`

#### Scenario: Fifteen-minute rate from three documents

- **GIVEN** three consecutive 5-minute documents with `participants.active` 1, 2 and 0 and
  `participants.joined` 2, 2 and 1
- **WHEN** `granularity=15m` is requested with `metrics=connectionSuccessRate,participantsJoined`
- **THEN** the bucket holds `connectionSuccessRate: 60` (3 / 5, one decimal) and `participantsJoined: 5`

### Requirement: Unique identities only at daily granularity

Edition: CE. `uniqueIdentities` SHALL be served only with `granularity=1d`; requesting it with any other explicit
or resolved granularity SHALL be rejected with `400` naming the metric.

#### Scenario: Unique identities on a 24 h range

- **WHEN** the client requests `metrics=uniqueIdentities` with `granularity=auto` over 24 h
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `uniqueIdentities` requires
  `granularity=1d`

### Requirement: Breakdowns endpoint

Edition: CE. `GET /api/v1/analytics/breakdowns` SHALL accept `dimensions` (comma-separated, at least one), `from`,
`to`, `tz` and `scope` and answer `{ from, to, scope, breakdowns: [{ dimension, total, items: [{ key, count,
percent }] }] }` with items sorted by `count` descending, `percent` as one decimal of `total`, keys as stored
(protocol enums in `UPPER_SNAKE`, dashboard vocabularies in lower case) and an unknown dimension rejected with `400`.

#### Scenario: SDK breakdown

- **GIVEN** rollups in range with `participants.bySdk` summing to `js: 600`, `swift: 300`, `android: 100`
- **WHEN** `dimensions=sdk` is requested
- **THEN** the breakdown has `total: 1000` and items `js` 600 / 60.0, `swift` 300 / 30.0, `android` 100 / 10.0

#### Scenario: Dimension without data

- **GIVEN** no egress in the range
- **WHEN** `dimensions=egressType` is requested
- **THEN** the breakdown has `total: 0` and `items: []`

### Requirement: Breakdown and summary source and range snapping

Edition: CE. Breakdowns and the summary SHALL read `analytics_hourly` for ranges up to 90 days, snapping `from` down
and `to` up to whole hours, and `analytics_daily` beyond, snapping to whole UTC days; the response `from`/`to` SHALL
report the snapped range. Entity and stats collections SHALL never be read by these endpoints.

#### Scenario: One-hour preset

- **GIVEN** the current time is 12:40:00Z
- **WHEN** breakdowns are requested with `from=now-1h&to=now`
- **THEN** the response has `from: "…T11:00:00.000Z"`, `to: "…T13:00:00.000Z"` and the integration test observes two
  hourly documents read per scope

#### Scenario: Long range reads daily documents

- **WHEN** the summary is requested for the last 120 days
- **THEN** `analytics_daily` is read, `from` and `to` are UTC midnights and no hourly document is read

### Requirement: Summary endpoint

Edition: CE. `GET /api/v1/analytics/summary` SHALL accept `from`, `to`, `tz` and `scope` and answer the fifteen KPI
values of the "KPI keys" scenario, omitting any value the stored documents cannot derive. `ingressSessions` and
`ingressDurationMs` SHALL be the sums of `ingress.sessionsStarted` and `ingress.durationMs` over the snapped range, `0`
without ingress activity.

#### Scenario: Summary values

- **GIVEN** hourly documents in range summing to `rooms.created: 120`, `rooms.ended: 110`, `participants.joined:
  900`, `participants.active: 880`, `apiCalls.total: 5000`, `apiErrors.total: 50`
- **WHEN** the summary is requested
- **THEN** the body has `roomsCreated: 120`, `roomsEnded: 110`, `participantSessions: 900`,
  `connectionSuccessRate: 97.8`, `apiCalls: 5000` and `apiErrorRate: 1.0`

#### Scenario: Average room size and duration

- **GIVEN** hourly documents summing to `rooms.ended: 110`, `rooms.participantsSum: 440` and
  `rooms.durationMsSum: 39600000`
- **WHEN** the summary is requested
- **THEN** the body has `avgRoomSize: 4.0` and `avgRoomDurationMs: 360000`

#### Scenario: Writer without the room sums

- **GIVEN** hourly documents written by a writer that stores no `rooms.participantsSum`
- **WHEN** the summary is requested
- **THEN** `avgRoomSize` and `avgRoomDurationMs` are absent from the body and the other values are present

#### Scenario: Unique identities over several days

- **GIVEN** `analytics_daily` documents for the three UTC days overlapping the range with `uniqueIdentities` 100, 120
  and 90
- **WHEN** the summary is requested
- **THEN** the body has `uniqueIdentities: { value: 310, basis: "utcDays", days: 3 }`

#### Scenario: Ingress totals

- **GIVEN** a valid token on the CE dashboard and hourly documents in range summing to `ingress.sessionsStarted: 12`
  and `ingress.durationMs: 7200000`
- **WHEN** the summary is requested
- **THEN** the response is `200` with `ingressSessions: 12` and `ingressDurationMs: 7200000`

#### Scenario: No ingress in the range

- **GIVEN** hourly documents in range without `ingress` counters
- **WHEN** the summary is requested
- **THEN** the body has `ingressSessions: 0` and `ingressDurationMs: 0`

#### Scenario: KPI keys

- **WHEN** the client requests `GET /api/v1/analytics/summary` over a range whose stored documents derive every value
- **THEN** the response carries the KPI values `roomsCreated`, `roomsEnded`, `participantSessions`, `uniqueIdentities`,
  `connectionSuccessRate`, `avgRoomSize`, `avgRoomDurationMs`, `bytesUp`, `bytesDown`, `egressStarted`,
  `egressDurationMs`, `ingressSessions`, `ingressDurationMs`, `apiCalls` and `apiErrorRate`

### Requirement: PRO metrics, dimensions and scopes

Edition: CE. `scoreAvg`, `poorSamples` and `lostSamples` SHALL require `analytics-quality`;
`tracksSubscribeFailed`, `disconnectReason`, `roomEndReason` and `apiMethod` SHALL require `analytics-diagnostics`;
`scope=node:<id>` SHALL require `per-node-breakdown`. `ingressSessions` and `ingressDurationMs` are CE metrics and
require no feature. On CE a request containing any of the gated items SHALL be rejected whole with `403`
`PRO_FEATURE`.

#### Scenario: Mixed request on CE

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `metrics=roomsCreated,scoreAvg`
- **THEN** the response is `403` with code `PRO_FEATURE`, `details.feature: "analytics-quality"` and no series

#### Scenario: Node scope on CE

- **WHEN** the CE client requests the summary with `scope=node:n1`
- **THEN** the response is `403` with `details.feature: "per-node-breakdown"`

#### Scenario: Diagnostics dimension on CE

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/analytics/breakdowns?dimensions=sdk,disconnectReason`
- **THEN** the response is `403` with code `PRO_FEATURE`, `details.feature: "analytics-diagnostics"` and no
  breakdowns

### Requirement: CSV export

Edition: CE. `GET /api/v1/analytics/export.csv` SHALL accept `kind` (`series` or `breakdowns`) with the parameters
of the matching endpoint and answer `200` `text/csv; charset=utf-8` as an attachment named
`analytics-<kind>-<from>-<to>.csv` (colons removed), RFC 4180 with CRLF line ends and a header row, with the same
validation and PRO gating as the JSON endpoints.

#### Scenario: Breakdown CSV

- **WHEN** the client requests `export.csv?kind=breakdowns&dimensions=sdk,os`
- **THEN** the body has the header `dimension,key,count,percent` followed by the `sdk` rows and then the `os` rows,
  each sorted by count descending

#### Scenario: PRO metric in a CE export

- **WHEN** the CE client requests `export.csv?kind=series&metrics=scoreAvg`
- **THEN** the response is `403` JSON with code `PRO_FEATURE`, not a CSV body

#### Scenario: Series CSV on CE

- **WHEN** the client requests `export.csv?kind=series&metrics=bytesUp,roomsCreated&granularity=1h` over 24 h
- **THEN** the body has the header `bucket,bytesUp,roomsCreated` and 24 data rows whose first cell is the bucket
  start in ISO 8601 UTC

### Requirement: Index-backed analytics queries

Edition: CE. Every rollup read SHALL be a bounded index scan on `{ scope, bucket }` of the chosen collection;
integration tests SHALL assert the plans with `explain()`.

#### Scenario: Explain plans on the generated database

- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** the integration suite explains every analytics query
- **THEN** no plan contains `COLLSCAN` and rollup plans report the `{ scope, bucket }` index with
  `totalKeysExamined` at most the number of buckets in range plus one

### Requirement: Ingress input type breakdown

Edition: CE. The breakdowns endpoint SHALL accept the dimension `ingressInputType`, which sums `ingress.byInputType`
of the hourly and daily rollups in range under the keys `rtmp`, `whip` and `url`: the ingress sessions started in the
range by input type. It is not gated by any feature.

#### Scenario: Sessions by input type

- **GIVEN** rollups in range with `ingress.byInputType` summing to `rtmp: 8`, `whip: 3` and `url: 1`
- **WHEN** `dimensions=ingressInputType` is requested on CE
- **THEN** the breakdown has `total: 12` and items `rtmp` 8 / 66.7, `whip` 3 / 25.0 and `url` 1 / 8.3

#### Scenario: No ingress in the range

- **GIVEN** no ingress session started in the range
- **WHEN** `dimensions=ingressInputType` is requested
- **THEN** the breakdown has `total: 0` and `items: []`
