## MODIFIED Requirements

### Requirement: Metric catalogue and fill values

Edition: CE. The CE metrics SHALL be the twenty-two of the "CE metrics" scenario; counters and sums fill empty buckets
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
  `ingressSessions`, `ingressDurationMs`, `ingressPeakActive`, `bytesUp`, `bytesDown`, `apiCalls` and `apiErrors`

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
`ingressDurationMs`, `ingressPeakActive`, `apiCalls` and `apiErrors` SHALL be served only at `1h` or coarser; a request
for any of them with an explicit or resolved granularity below `1h` SHALL be rejected with `400` naming the metric and
the granularity.

#### Scenario: Hourly-only metric at five minutes

- **WHEN** the client requests `metrics=egressStarted,egressEnded` with `granularity=auto` over 24 h
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `egressEnded` requires a
  granularity of at least `1h`, and the same metrics with `granularity=1h` answer `200` with 24 points per series

#### Scenario: Ingress peak at five minutes

- **WHEN** the client requests `metrics=ingressPeakActive` with `granularity=5m`
- **THEN** the response is `400` with code `VALIDATION_ERROR` naming `ingressPeakActive` and `5m`

## ADDED Requirements

### Requirement: Egress and ingress only in the global scope

Edition: CE. With a `node:<label>` scope, the series, breakdowns and CSV export endpoints SHALL reject the metrics
`egressStarted`, `egressEnded`, `egressDurationMs`, `egressPeakActive`, `ingressSessions`, `ingressDurationMs` and
`ingressPeakActive` and the dimensions `egressType`, `egressStatus` and `ingressInputType` with `400`
`VALIDATION_ERROR`, and the summary SHALL omit `egressStarted`, `egressDurationMs`, `ingressSessions` and
`ingressDurationMs`.

#### Scenario: Egress series of a node

- **GIVEN** the `per-node-breakdown` feature
- **WHEN** the client requests `metrics=roomsCreated,egressStarted&scope=node:mn-a`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and a message stating that `egressStarted` is only
  available for the global scope, and no series

#### Scenario: Ingress breakdown of a node

- **GIVEN** the `per-node-breakdown` feature
- **WHEN** the client requests `GET /api/v1/analytics/breakdowns?dimensions=sdk,ingressInputType&scope=node:mn-a`
- **THEN** the response is `400` with code `VALIDATION_ERROR` naming `ingressInputType`

#### Scenario: Summary of a node

- **GIVEN** the `per-node-breakdown` feature and hourly documents of `node:mn-a` in range
- **WHEN** the summary is requested with `scope=node:mn-a`
- **THEN** the body has the room and participant values and none of `egressStarted`, `egressDurationMs`,
  `ingressSessions` and `ingressDurationMs`

#### Scenario: Global scope

- **WHEN** the client requests `metrics=egressStarted,ingressSessions&granularity=1h` without a scope
- **THEN** the response is `200` with both series, read from the `global` documents
