# overview-api Specification

## Purpose
The overview endpoint: one cheap, index-backed response with the live counters, today's totals, recent rooms,
stale hints and writer health that the Overview page and the live counter tiles poll.

## Requirements

### Requirement: Overview endpoint
Edition: CE. `GET /api/v1/overview` SHALL require a bearer token, accept only `tz` (IANA zone or `UTC`, default
`UTC`) and answer `200` with `generatedAt`, `live`, `today` and `recentRooms`; an unknown `tz` SHALL be rejected with
`400`. The writer health, schema and migration are served by `GET /api/v1/status`.

#### Scenario: Default response
- **GIVEN** a deployment with a running writer
- **WHEN** the client requests `GET /api/v1/overview` with a valid token
- **THEN** the response is `200` with `generatedAt` within one second of the server clock and the keys `live`, `today` and `recentRooms`, no `health` key, and no `nodes` key on CE

#### Scenario: Unknown timezone
- **WHEN** the client requests `GET /api/v1/overview?tz=Mars/Olympus`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["tz"]`

### Requirement: Live counters
Edition: CE. `live` SHALL carry `rooms` (status `active`), `participants` (status `active`, kind `STANDARD`),
`services` (status `active`, every kind but `STANDARD`), `participantsByKind` (every kind, `0` when absent),
`publishers` (active STANDARD with `isPublisher`), `egresses` (status `starting`, `active` or `ending`) and
`ingressSessions` (status `publishing`).

#### Scenario: Mixed kinds
- **GIVEN** 12 active rooms holding 85 active STANDARD, 2 SIP, 3 EGRESS and 2 AGENT participants, 54 STANDARD publishers and 1 INGRESS publisher, 3 egresses in status `active`, 1 in `ending` and 1 `complete`, and 1 `publishing` ingress session
- **WHEN** the client requests the overview
- **THEN** `live` is `{ rooms: 12, participants: 85, services: 7, participantsByKind: { STANDARD: 85, SIP: 2, INGRESS: 0, EGRESS: 3, AGENT: 2, CONNECTOR: 0, BRIDGE: 0 }, publishers: 54, egresses: 4, ingressSessions: 1, stale: … }`

#### Scenario: Joining participants are not active
- **GIVEN** a room with one `active` and one `joining` STANDARD participant
- **WHEN** the client requests the overview
- **THEN** `live.participants` is `1`

### Requirement: Stale hints

Edition: CE. `live.stale` SHALL carry `rooms` and `participants`, the number of `active` documents whose `lastStatsAt`
is older than `olderThanMs` at `generatedAt`, and `olderThanMs` itself: the stale window `max(90 s, 60 s + I + 15 s)` of
the batch interval I that `GET /api/v1/status` reports as `writer.batchIntervalMs` (the largest among the nodes seen in
the last hour, 10 s when none reports one); documents without `lastStatsAt` SHALL NOT be counted.

#### Scenario: Stale room and participants
- **GIVEN** nodes reporting `batchIntervalMs: 10000`, an active room whose `lastStatsAt` is 100 s old with two active participants with `lastStatsAt` 100 s old, and another active room with fresh stats
- **WHEN** the client requests the overview
- **THEN** `live.stale` is `{ rooms: 1, participants: 2, olderThanMs: 90000 }`

#### Scenario: Signal-only participant
- **GIVEN** an active participant that never published nor subscribed and has no `lastStatsAt`
- **WHEN** the client requests the overview
- **THEN** it is not counted in `live.stale.participants`

#### Scenario: Slow writer
- **GIVEN** a node seen in the last hour with `batchIntervalMs: 60000` and an active room with one active participant, both with `lastStatsAt` 100 s old
- **WHEN** the client requests the overview
- **THEN** `live.stale` is `{ rooms: 0, participants: 0, olderThanMs: 135000 }`

#### Scenario: Nodes without a reported interval
- **GIVEN** node documents without `batchIntervalMs`
- **WHEN** the client requests the overview
- **THEN** `live.stale.olderThanMs` is `90000`

#### Scenario: Window at the default interval
- **GIVEN** the default batch interval of 10 s
- **WHEN** the overview is requested
- **THEN** `live.stale.olderThanMs` is 90 000

### Requirement: Today's figures
Edition: CE. `today` SHALL carry `tz`, `since` (local midnight of `tz` in UTC), `rooms`, `participantSessions`,
`participantMinutes`, `egresses`, `ingressSessions` and `approximate`, summed from the `global` hourly rollups
whose bucket starts at or after the hour containing `since`; `approximate` is `true` when `since` is not on an
hour boundary.

#### Scenario: Whole-hour zone
- **GIVEN** `tz=Europe/Madrid` at 12:40 local time on 2026-10-13 and hourly `global` rollups since 22:00 UTC of the previous day summing `rooms.created` 143, `participants.joined` 1204, `participants.minutes` 18340, `egress.started` 21 and `ingress.sessionsStarted` 4
- **WHEN** the client requests the overview
- **THEN** `today` is `{ tz: "Europe/Madrid", since: "2026-10-12T22:00:00.000Z", rooms: 143, participantSessions: 1204, participantMinutes: 18340, egresses: 21, ingressSessions: 4, approximate: false }`

#### Scenario: Half-hour zone
- **GIVEN** `tz=Asia/Kolkata`
- **WHEN** the client requests the overview
- **THEN** `today.since` is 18:30 UTC of the previous day, the sum starts at the 18:00 UTC bucket and `approximate` is `true`

#### Scenario: No rollups yet
- **GIVEN** an empty `analytics_hourly` collection
- **WHEN** the client requests the overview
- **THEN** every counter of `today` is `0` and `approximate` is `false`

### Requirement: Recent rooms
Edition: CE. `recentRooms` SHALL list at most 10 rooms of any status ordered by `createdAt` descending, each with
`sid`, `name`, `status`, `createdAt`, `endedAt?`, `durationMs?`, `closedBy?`, `participants { active, sessions,
unique }` (`unique`: distinct STANDARD identities), `nodeId?`, `lastStatsAt?` and `stale?` (`true` for an active room
whose `lastStatsAt` is older than the stale window at `generatedAt`), never internal id arrays, `schemaVersion` or
`expiresAt`.

#### Scenario: Twelve rooms
- **GIVEN** 12 rooms, the newest two active
- **WHEN** the client requests the overview
- **THEN** `recentRooms` has 10 items starting with the two active rooms, each with the listed fields and no `participantSids`

#### Scenario: Unique identities of a recent room
- **GIVEN** a closed room with 7 STANDARD sessions of 4 identities and one EGRESS session
- **WHEN** the client requests the overview
- **THEN** its `recentRooms` item has `participants: { active: 0, sessions: 7, unique: 4 }`

#### Scenario: Stale recent room
- **GIVEN** an active room whose `lastStatsAt` is 2 minutes before `generatedAt` and a writer batch interval of 10 s
- **WHEN** the client requests the overview
- **THEN** its `recentRooms` item has `stale: true` and an active room with stats 20 s old has no `stale` field

#### Scenario: Empty database
- **WHEN** no room exists
- **THEN** `recentRooms` is `[]`

### Requirement: Conditional overview

Edition: CE. The response SHALL carry a weak `ETag` derived from the body without `generatedAt` and
`Cache-Control: private, no-cache`; a request whose `If-None-Match` matches SHALL answer `304` without a body.

#### Scenario: Quiet deployment
- **GIVEN** a client holding the `ETag` of the last overview
- **WHEN** it polls again 10 s later and no counter, room, rollup or node fact changed
- **THEN** the response is `304` with the same `ETag` and an empty body

#### Scenario: Writer batch without changes on CE
- **GIVEN** the same client on CE
- **WHEN** a batch updated only `nodes.lastSeenAt`
- **THEN** the response is `304`

### Requirement: Index-backed overview

Edition: CE. Every overview query SHALL use an existing index (`rooms { status, createdAt }`,
`participants { status, kind }`, `egresses { status, startedAt }`, `ingress_sessions { status }`,
`analytics_hourly { scope, bucket }`), examining at most each collection's active documents plus 20 rooms; `nodes`,
bounded by the node count, is read whole for the stale window's batch interval; `schema_meta` is not read.

#### Scenario: Explain plans
- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** each overview query is explained
- **THEN** no plan on `rooms`, `participants`, `egresses`, `ingress_sessions` or `analytics_hourly` contains `COLLSCAN`, and `totalDocsExamined` of the room and participant aggregations equals the number of active documents
