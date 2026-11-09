## MODIFIED Requirements

### Requirement: Metric catalogue and fill values

Edition: CE. The CE metrics SHALL be the twenty of the "CE metrics" scenario; counters and sums fill empty buckets with
`0`, rates and averages with `null`, and peaks with `null` in a bucket without a sample. Participant figures count
STANDARD sessions only, except the `kind` breakdown. `ingressSessions` SHALL sum the rollups' `ingress.sessionsStarted`
and `ingressDurationMs` their `ingress.durationMs`.

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
  `participantMinutes`, `tracksPublished`, `egressStarted`, `egressEnded`, `egressDurationMs`, `ingressSessions`,
  `ingressDurationMs`, `bytesUp`, `bytesDown`, `apiCalls` and `apiErrors`

#### Scenario: Peaks at five minutes

- **GIVEN** the last 24 h, whose 5-minute documents carry `rooms.peakActive` and `participants.peakActive` from 09:00
  UTC on, and a 5-minute document of 08:00 UTC with `rooms.created: 2` and no peak
- **WHEN** `metrics=roomsPeakActive,participantsPeakActive` is requested with `granularity=auto`
- **THEN** the response is `200` at `5m` with 288 points per series, the buckets from 09:00 hold the stored
  `rooms.peakActive` and `participants.peakActive` (`0` included) and the earlier ones, 08:00 among them, hold `null`

### Requirement: Dense series and bucket aggregation

Edition: CE. Every series SHALL contain exactly one point per bucket from `from` floored to the bucket start up to
and including the bucket containing `to`; when a bucket spans several rollup documents, counters SHALL be summed,
peaks SHALL take the maximum of the documents that have one and `connectionSuccessRate` SHALL be computed from the
summed numerators and denominators.

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

#### Scenario: Fifteen-minute peak

- **GIVEN** three consecutive 5-minute documents with `rooms.peakActive` 3, 5 and 2, and a fourth 15-minute bucket
  whose documents have no `rooms.peakActive`
- **WHEN** `granularity=15m` is requested with `metrics=roomsPeakActive`
- **THEN** the first bucket holds `5` and the fourth holds `null`

#### Scenario: Daily peak in a time zone

- **GIVEN** `tz=Europe/Madrid`, `granularity=1d` over 7 days inside the hourly retention, and the hourly documents of
  one local day whose highest `participants.peakActive` is 40
- **WHEN** `metrics=participantsPeakActive` is requested
- **THEN** that local day holds `40`, not the sum of its hourly peaks
