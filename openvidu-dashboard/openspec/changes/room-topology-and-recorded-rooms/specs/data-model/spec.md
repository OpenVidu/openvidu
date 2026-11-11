# Spec Delta

## MODIFIED Requirements

### Requirement: Room document
Edition: CE and PRO. A `rooms` document SHALL describe one room session: identity and lifecycle, node and media node,
configuration, participant/track/egress/ingress counters, traffic, quality, feature flags and retention
fields, with the field list of the shared contract (`dashboard-ce/typings/src/data-model`).
`participants.sessions`, `unique`, `active`, `peakActive` and `aborted` SHALL count STANDARD sessions only;
`participants.byKind` SHALL count the sessions of every kind.

#### Scenario: Fields of a room document
- **WHEN** a room document is read
- **THEN** it has `name`, `nameLower`, `status` (`active` | `closed`), `createdAt`, `endedAt`, `durationMs`, `endReason`, `closedBy`, `nodeId`, `mediaNode` (only when the server that hosts it has a media node label), `config` (max participants, empty and departure timeouts, metadata when allowed), `participants { sessions, unique, active, peakActive, peakPublishers, aborted, byKind }`, `topology`, `tracks`, `egress` (by type), `ingress`, `bytes { up, down }`, `quality { scoreSum, scoreCount, minScore, poor, lost }`, `features { egress, ingress, agent, sip, recording }`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

#### Scenario: Room lifecycle
- **GIVEN** `ROOM_CREATED`, three `PARTICIPANT_JOINED`/`ACTIVE`, one `PARTICIPANT_LEFT`, `ROOM_ENDED (API_DELETE)`
- **WHEN** all are processed
- **THEN** the room has `status: "closed"`, `endReason: "API_DELETE"`, `participants.sessions: 3`, `participants.active: 0`, `participants.peakActive: 3`, `durationMs = endedAt - createdAt`, `closedBy: "event"`

#### Scenario: Dependent participants do not count as room size
- **GIVEN** a room with two STANDARD participants and one EGRESS participant
- **WHEN** counters are read
- **THEN** `participants.byKind.EGRESS` is 1 and `participants.active`/`peakActive` count only the two STANDARD participants

#### Scenario: Only standard participants count as participants
- **GIVEN** an active room with two active STANDARD participants of different identities, one EGRESS, one INGRESS and one AGENT participant, and one aborted SIP session
- **WHEN** counters are read
- **THEN** `participants.sessions` is 2, `unique` is 2, `active` is 2, `peakActive` is 2, `aborted` is 0 and `participants.byKind` is `{ STANDARD: 2, EGRESS: 1, INGRESS: 1, AGENT: 1, SIP: 1 }`

#### Scenario: Room written by an earlier writer
- **GIVEN** a room document written by a writer that does not classify rooms
- **WHEN** it is read
- **THEN** it has no `participants.peakPublishers`, no `topology` and no `features.recording`, and the dashboard reads it as before

### Requirement: Rollups
Edition: CE and PRO. `analytics_5min`, `analytics_hourly` and `analytics_daily` SHALL hold one document per
scope (`global`, and `node:<label>` for a labelled server's media node) and bucket with pre-aggregated counters. Map
keys SHALL be enum names or a fixed vocabulary, never user input. Participant counters SHALL count STANDARD sessions
only, except `participants.byKind` and the 5-minute `participants.connected` (participants with stats), which count
every kind.

#### Scenario: Fields of the rollup documents
- **WHEN** hourly or daily rollup documents are read
- **THEN** they have counters for rooms (created, ended, by end reason, `durationMsSum`, `participantsSum`, `byTopology`, `recorded`, `sizeByTopology`), participants (joined, active, aborted, left, by kind, SDK, OS, browser, connection type, disconnect reason, connect time, minutes), tracks, egress (started, by type, by end status, duration), ingress sessions (started, ended, started by input type, duration), bytes, quality (score sum/count, poor, lost), API calls and API errors (total and by method), and daily documents also `uniqueIdentities` (set by the server's aggregator once the UTC day has closed); 5-minute documents have bytes, quality, `participants.connected` (distinct participants with stats), the `PARTICIPANT_ACTIVE` count and the lifecycle counters (rooms created/ended, participants joined/left/aborted, egress started/ended); documents of the three collections may also have `rooms.peakActive`, `participants.peakActive` and `egress.peakActive`, and hourly and daily documents `ingress.peakActive` (int32, written by the server's aggregator)

#### Scenario: Peaks of active rooms and participants
- **GIVEN** the server's aggregator counted 4 active rooms and 11 active STANDARD sessions at 10:01 UTC and 6 and 9 at 10:40 UTC, no more at any other minute of that hour, and no server wrote any other counter in it
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute document of `…T10:00:00Z` has `rooms.peakActive: 4` and `participants.peakActive: 11`, the one of `…T10:40:00Z` has 6 and 9, and the hourly document of `…T10:00:00Z` has `rooms.peakActive: 6` and `participants.peakActive: 11` and no other counter

#### Scenario: Peaks of active egress and ingress
- **GIVEN** the server's aggregator counted 2 open egresses and 1 publishing ingress session at 10:01 UTC and 3 and 0 at 10:40 UTC, no more at any other minute of that hour
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:00:00Z` and `…T10:40:00Z` have `egress.peakActive` 2 and 3 and no `ingress` field, and the hourly document of `…T10:00:00Z` has `egress.peakActive: 3` and `ingress.peakActive: 1`

#### Scenario: Five-minute bandwidth
- **GIVEN** stats flushed between 10:00 and 10:05 UTC
- **WHEN** `analytics_5min` is read for `global:…T10:00:00Z`
- **THEN** `bytes.up` and `bytes.down` equal the sum of the flushed upstream and downstream bytes and `quality.scoreCount` equals the number of samples

#### Scenario: Hourly counters
- **GIVEN** five rooms created and two ended between 10:00 and 11:00 UTC on a server with the media node label `mn-a`
- **WHEN** the events are processed
- **THEN** `analytics_hourly` has `global:2026-…T10:00:00Z` and `node:mn-a:2026-…T10:00:00Z` with `rooms.created: 5` and `rooms.ended: 2`

#### Scenario: Replayed batch does not double count
- **GIVEN** a batch whose raw events were already inserted
- **WHEN** the batch is processed again
- **THEN** rollup counters are unchanged

#### Scenario: Services in rollups
- **GIVEN** between 10:00 and 11:00 UTC three STANDARD, one EGRESS and one AGENT participant joined, and the AGENT left after 10 minutes
- **WHEN** the hourly rollup is read
- **THEN** `participants.joined` is 3, `participants.left` is 0, `participants.minutes` counts only the STANDARD sessions and `participants.byKind` is `{ STANDARD: 3, EGRESS: 1, AGENT: 1 }`

#### Scenario: Ingress sessions by input type
- **GIVEN** two RTMP and one WHIP ingress sessions started between 10:00 and 11:00 UTC
- **WHEN** the hourly rollup is read
- **THEN** it has `ingress.sessionsStarted: 3` and `ingress.byInputType: { rtmp: 2, whip: 1 }`

#### Scenario: Room topology and recording counters
- **GIVEN** a server with the media node label `mn-a` on which, between 10:00 and 11:00 UTC, a recorded 1:1 room ends,
  a 1:N room with N = 30 ends and an N:M room with N = 4 ends
- **WHEN** `analytics_hourly` is read for `global:…T10:00:00Z` and `node:mn-a:…T10:00:00Z`
- **THEN** both have `rooms.byTopology: { one_to_one: 1, one_to_many: 1, many_to_many: 1 }`, `rooms.recorded: 1` and
  `rooms.sizeByTopology: { one_to_many: { "26-50": 1 }, many_to_many: { "2-5": 1 } }`, and no `analytics_5min`
  document has any of the three

## ADDED Requirements

### Requirement: Room topology class
Edition: CE and PRO. A room's `topology` SHALL be one of six classes, from N (`participants.peakActive`) and P
(`participants.peakPublishers`): `empty` (N = 0), `single_participant` (N = 1), `no_publishers` (N ≥ 2, P = 0),
`one_to_one` (N = 2, P ≥ 1), `one_to_many` (N ≥ 3, P = 1) and `many_to_many` (N ≥ 3, P ≥ 2). It SHALL follow the
room's counters while the room is active and keep the value it has when the room closes.

#### Scenario: Classes from the peaks
- **GIVEN** closed rooms whose (N, P) are (0, 0), (1, 1), (5, 0), (2, 1), (2, 2), (40, 1) and (6, 3)
- **WHEN** their documents are read
- **THEN** their `topology` values are `empty`, `single_participant`, `no_publishers`, `one_to_one`, `one_to_one`,
  `one_to_many` and `many_to_many`

#### Scenario: Active room
- **GIVEN** an active room with two STANDARD participants, only one of which has sent media
- **WHEN** a third STANDARD participant joins and stays muted, and later unmutes its microphone
- **THEN** `topology` reads `one_to_one`, then `one_to_many` after the join, then `many_to_many` after the unmute

### Requirement: Room size ranges
Edition: CE and PRO. The size range of a room SHALL be the range of its N among `2-5`, `6-10`, `11-25`, `26-50`,
`51-100` and `101+`; only the classes `no_publishers`, `one_to_many` and `many_to_many` have one.

#### Scenario: Range bounds
- **GIVEN** `one_to_many` rooms with N of 3, 5, 6, 100 and 101
- **WHEN** their size ranges are taken
- **THEN** they are `2-5`, `2-5`, `6-10`, `51-100` and `101+`

#### Scenario: Classes without a range
- **GIVEN** an `empty`, a `single_participant` and a `one_to_one` room
- **WHEN** they close
- **THEN** none of them is counted in `rooms.sizeByTopology`

### Requirement: Generated topologies and recordings
Edition: CE and PRO. The data generator SHALL give its rooms every topology class in a mix that resembles real use,
derive `participants.peakPublishers`, `topology` and `features.recording` from its sessions, tracks and egresses as the
writer does, and, with `--room-sums`, write `rooms.byTopology`, `rooms.recorded` and `rooms.sizeByTopology` in the
hourly and daily rollups of each room's end bucket, in its scopes.

#### Scenario: Generated classes
- **GIVEN** a database generated with the scenario `S` over 7 days
- **WHEN** the closed rooms are grouped by `topology`
- **THEN** every class has rooms, `one_to_one` and `many_to_many` are the most frequent, and each room's class matches
  its `participants.peakActive` and `participants.peakPublishers`

#### Scenario: Generated rollups match the rooms
- **GIVEN** a database generated with `--room-sums` and `--node-rollups`
- **WHEN** the hourly `global` documents of a day are summed, and the `node:` documents of each node apart
- **THEN** their `rooms.byTopology`, `rooms.recorded` and `rooms.sizeByTopology` equal the counts, by class, recording
  and size range, of the rooms that ended that day, and of those of each node
