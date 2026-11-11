# Spec Delta

## MODIFIED Requirements

### Requirement: Metric catalogue and fill values

Edition: CE. The CE metrics SHALL be the twenty-four of the "CE metrics" scenario; counters and sums fill empty buckets
with `0`, rates and averages with `null`, and peaks with `null` in a bucket without a sample. Participant figures
count STANDARD sessions only, except the `kind` breakdown. `ingressSessions` SHALL sum the rollups'
`ingress.sessionsStarted` and `ingressDurationMs` their `ingress.durationMs`.

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
- **THEN** the metrics it can request are `roomsCreated`, `roomsEnded`, `roomsPeakActive`, `participantsJoined`,
  `participantsActive`, `participantsAborted`, `participantsPeakActive`, `connectionSuccessRate`, `uniqueIdentities`,
  `participantMinutes`, `tracksPublished`, `egressStarted`, `egressEnded`, `egressDurationMs`, `egressPeakActive`,
  `ingressSessions`, `ingressDurationMs`, `ingressPeakActive`, `roomsByTopology`, `recordedRoomsRate`, `bytesUp`,
  `bytesDown`, `apiCalls` and `apiErrors`

#### Scenario: Peaks at five minutes

- **GIVEN** the last 24 h, whose 5-minute documents carry `rooms.peakActive` and `participants.peakActive` from 09:00
  UTC on, and a 5-minute document of 08:00 UTC with `rooms.created: 2` and no peak
- **WHEN** `metrics=roomsPeakActive,participantsPeakActive` is requested with `granularity=auto`
- **THEN** the response is `200` at `5m` with 288 points per series, the buckets from 09:00 hold the stored
  `rooms.peakActive` and `participants.peakActive` (`0` included) and the earlier ones, 08:00 among them, hold `null`

#### Scenario: Egress and ingress peaks

- **GIVEN** the last 24 h, whose 5-minute documents carry `egress.peakActive` and whose hourly documents carry
  `egress.peakActive` and `ingress.peakActive` from 09:00 UTC on
- **WHEN** `metrics=egressPeakActive` is requested with `granularity=auto`, and
  `metrics=egressPeakActive,ingressPeakActive` with `granularity=1h`
- **THEN** the first response is `200` at `5m` with 288 points, the second `200` at `1h` with 24 points per series, the
  buckets from 09:00 hold the stored peaks (`0` included) and the earlier ones hold `null`

### Requirement: Hourly-only metrics

Edition: CE. `participantMinutes`, `tracksPublished`, `egressEnded`, `egressDurationMs`, `ingressSessions`,
`ingressDurationMs`, `ingressPeakActive`, `roomsByTopology`, `recordedRoomsRate`, `apiCalls` and `apiErrors` SHALL
be served only at `1h` or coarser; a request
for any of them with an explicit or resolved granularity below `1h` SHALL be rejected with `400` naming the metric and
the granularity.

#### Scenario: Hourly-only metric at five minutes

- **WHEN** the client requests `metrics=egressStarted,egressEnded` with `granularity=auto` over 24 h
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `egressEnded` requires a
  granularity of at least `1h`, and the same metrics with `granularity=1h` answer `200` with 24 points per series

#### Scenario: Ingress peak at five minutes

- **WHEN** the client requests `metrics=ingressPeakActive` with `granularity=5m`
- **THEN** the response is `400` with code `VALIDATION_ERROR` naming `ingressPeakActive` and `5m`

#### Scenario: Room topology at five minutes

- **WHEN** the client requests `metrics=roomsPeakActive,roomsByTopology` with `granularity=auto` over 24 h
- **THEN** the response is `400` with code `VALIDATION_ERROR` naming `roomsByTopology` and `5m`

### Requirement: Summary endpoint

Edition: CE. `GET /api/v1/analytics/summary` SHALL accept `from`, `to`, `tz` and `scope` and answer the seventeen KPI
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

#### Scenario: Recorded rooms

- **GIVEN** hourly documents in range summing to `rooms.ended: 200`, `rooms.byTopology` 196 rooms over its classes and
  `rooms.recorded: 49`
- **WHEN** the summary is requested
- **THEN** the body has `roomsRecorded: 49` and `recordedRoomsRate: 25.0`

#### Scenario: No classified room in the range

- **GIVEN** hourly documents in range with `rooms.ended: 30` and no `rooms.byTopology`, written by an earlier writer
- **WHEN** the summary is requested
- **THEN** `roomsRecorded` and `recordedRoomsRate` are absent from the body and `roomsEnded` is `30`

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
  `connectionSuccessRate`, `avgRoomSize`, `avgRoomDurationMs`, `roomsRecorded`, `recordedRoomsRate`, `bytesUp`,
  `bytesDown`, `egressStarted`, `egressDurationMs`, `ingressSessions`, `ingressDurationMs`, `apiCalls` and
  `apiErrorRate`

## ADDED Requirements

### Requirement: Room topology series

Edition: CE. The series endpoint SHALL expand `roomsByTopology` into one series per topology class stored in the range,
named `roomsByTopology.<class>` (`roomsByTopology.one_to_one`), whose points are the rooms of that class ended in each
bucket, `0` without one.

#### Scenario: Room topology classes

- **GIVEN** rooms that ended in the range as `one_to_one` and `many_to_many`, and none of another class
- **WHEN** the client requests `metrics=roomsByTopology&granularity=1h`
- **THEN** the response has the series `roomsByTopology.one_to_one` and `roomsByTopology.many_to_many`, each bucket
  holding the rooms of that class that ended in it and `0` without one, and no series for the other classes

### Requirement: Recorded rooms rate

Edition: CE. `recordedRoomsRate` SHALL be `rooms.recorded` over the sum of `rooms.byTopology` of the bucket, or of the
summary's range, as a percentage with one decimal, and `null`, or absent from the summary, when that sum is `0`:
rooms ended without a class, by an earlier writer, count in neither part.

#### Scenario: Rate per bucket

- **GIVEN** an hour whose documents hold `rooms.byTopology` summing to 8 and `rooms.recorded: 2`, an hour with
  `rooms.byTopology` summing to 5 and no `rooms.recorded`, and an hour without ended rooms
- **WHEN** `metrics=recordedRoomsRate&granularity=1h` is requested
- **THEN** the points are `25.0`, `0.0` and `null`

#### Scenario: Hour of the upgrade

- **GIVEN** an hour with `rooms.ended: 10`, of which 4 rooms were ended by the new writer, with `rooms.byTopology`
  summing to 4 and `rooms.recorded: 1`
- **WHEN** `metrics=recordedRoomsRate&granularity=1h` is requested
- **THEN** the point is `25.0`

### Requirement: Room size dimensions

Edition: CE. The breakdowns endpoint SHALL accept the dimensions `roomSizeNoPublishers`, `roomSizeOneToMany` and
`roomSizeManyToMany`, which sum `rooms.sizeByTopology.no_publishers`, `one_to_many` and `many_to_many` of the hourly
and daily rollups in range under the size range keys `2-5`, `6-10`, `11-25`, `26-50`, `51-100` and `101+`. They are
not gated by any feature and are served in every scope.

#### Scenario: Sizes of the 1:N rooms

- **GIVEN** rollups in range with `rooms.sizeByTopology.one_to_many` summing to `11-25: 6`, `26-50: 3` and `101+: 1`
- **WHEN** `dimensions=roomSizeOneToMany` is requested on CE
- **THEN** the breakdown has `total: 10` and items `11-25` 6 / 60.0, `26-50` 3 / 30.0 and `101+` 1 / 10.0

#### Scenario: Node scope

- **GIVEN** the `per-node-breakdown` feature and rollups of `node:mn-a` with `rooms.sizeByTopology.many_to_many`
- **WHEN** `dimensions=roomSizeManyToMany&scope=node:mn-a` is requested
- **THEN** the response is `200` with the breakdown of `node:mn-a`
