# participants-api Specification

## Purpose
The REST endpoints that expose participant sessions: the search list, its summary and the agents list,
following the `api-conventions` contract and reading only the collections and indexes of `data-model`.

## Requirements

### Requirement: Participants list endpoint

Edition: CE. `GET /api/v1/participants` SHALL list participant sessions whose `joinedAt` falls in the `from`/`to` range,
filtered by `kind`, `status`, `room`, `publisher` and `q`, sorted by `joinedAt` (default, index-backed, `_id`
tie-breaker) or by the ranked `leftAt` and `duration`, with `order` `desc` (default) or `asc`, cursor-paginated with
`limit` 1-100 (default 25) and the `{ items, nextCursor, prevCursor, total? }` envelope.

#### Scenario: Default list
- **GIVEN** 40 sessions joined in the last 24 h and 5 joined 3 days ago
- **WHEN** the client requests `GET /api/v1/participants`
- **THEN** the response has 25 items ordered by `joinedAt` descending, `nextCursor` set, `prevCursor: null` and `total: 40`

#### Scenario: Room and status filters
- **GIVEN** room `RM_abc` with two `active` and three `left` sessions in range
- **WHEN** the client sends `?room=RM_abc&status=active`
- **THEN** exactly the two active sessions of `RM_abc` are returned

#### Scenario: Multi-valued kind
- **WHEN** the client sends `?kind=AGENT,EGRESS`
- **THEN** only sessions whose `kind` is `AGENT` or `EGRESS` are returned, and `?kind=ROBOT` answers `400` `VALIDATION_ERROR` with path `["kind"]`

#### Scenario: Unsupported sort key
- **WHEN** the client sends `?sort=identity`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["sort"]`

#### Scenario: Ranked cursor walk
- **GIVEN** 40 sessions joined in the last 24 h, three of them active, and `sort=duration&limit=25`
- **WHEN** the client follows `nextCursor` and then `prevCursor`
- **THEN** the pages hold sessions 1-25, 26-40 and 1-25 of the duration ranking at the first page's `asOf`, with no gaps or duplicates

#### Scenario: Filter values
- **WHEN** the client filters the participants list
- **THEN** `kind` takes comma-separated protocol kinds, `status` takes `joining`, `active`, `left` or `aborted` (absent
  means all) and `room` an exact room SID

### Requirement: Identity prefix search
Edition: CE. The `q` parameter of the participants and agents lists SHALL match the case-insensitive prefix of the
participant identity when it holds at least two characters after trimming and does not match `^PA_[A-Za-z0-9]+$`;
a one-character `q` SHALL be rejected with `400`; `q` combines with every other filter of the list.

#### Scenario: Prefix match
- **GIVEN** sessions with identities `Alice`, `alice-2`, `malice` and `bob`
- **WHEN** the client sends `?q=al`
- **THEN** `Alice` and `alice-2` are returned and `malice` and `bob` are not

#### Scenario: One character rejected
- **WHEN** the client sends `?q=a`
- **THEN** the response is `400` with code `VALIDATION_ERROR`, `details.issues[0].path` equal to `["q"]` and a message naming the two-character minimum

#### Scenario: Prefix inside a room
- **GIVEN** identity `alice` with sessions in rooms `RM_a` and `RM_b`
- **WHEN** the client sends `?q=ali&room=RM_a`
- **THEN** only the sessions of `RM_a` are returned

#### Scenario: Agents by identity
- **GIVEN** agent sessions with identities `assistant-1` and `transcriber`, and a STANDARD session `assistant-fan`
- **WHEN** the client sends `GET /api/v1/agents?q=assist`
- **THEN** only the `assistant-1` agent session is returned

### Requirement: Exact SID lookup through the list
Edition: CE. When `q` matches `^PA_[A-Za-z0-9]+$` the participants and agents lists SHALL return the session with that
exact SID as its only item, ignoring the time range, the other filters and the sort, and an empty list when no session
has that SID.

#### Scenario: SID outside the range
- **GIVEN** session `PA_x1y2` joined 10 days ago
- **WHEN** the client sends `?q=PA_x1y2&from=now-24h&to=now`
- **THEN** the response has exactly one item with `sid: "PA_x1y2"` and `total: 1`

#### Scenario: Unknown SID
- **WHEN** the client sends `?q=PA_missing`
- **THEN** the response is `200` with `items: []`

#### Scenario: Agent SID
- **GIVEN** agent session `PA_ag1` joined 3 days ago
- **WHEN** the client sends `GET /api/v1/agents?q=PA_ag1&status=active`
- **THEN** the response has exactly one item with `sid: "PA_ag1"`, `total: 1` and both cursors `null`

### Requirement: Participant list item shape

Edition: CE. Each item of the participants and agents lists SHALL carry `sid`, `identity`, `kind`, `status`, `roomSid`,
`roomName`, `joinedAt`, `isPublisher`, `publishedSources`, the optional `name`, `leftAt`, `durationMs`,
`connectionType`, `nodeId`, the `stale` flag that `api-conventions` defines and a `client` summary, with unknown values
omitted as `api-conventions` requires.

#### Scenario: Complete row
- **GIVEN** a left session of `alice` from the JS SDK 2.6.1 on Chrome 130 / macOS 14 over UDP
- **WHEN** it is listed
- **THEN** the item has `status: "left"`, `leftAt`, `durationMs`, `connectionType: "UDP"` and `client: { sdk: "JS", version: "2.6.1", browser: "Chrome", browserVersion: "130", os: "macOS", osVersion: "14" }`

#### Scenario: No client information
- **GIVEN** a session whose `PARTICIPANT_JOINED` carried no `client_info`
- **WHEN** it is listed
- **THEN** the item has no `client` and no `connectionType` property

#### Scenario: Published sources
- **GIVEN** a session whose `tracks.bySource` is `{ CAMERA: 2, MICROPHONE: 1 }`, and a session that never published
- **WHEN** both are listed
- **THEN** the first item has `publishedSources` with `CAMERA` and `MICROPHONE` and no other source, and the second has `publishedSources: []`

#### Scenario: Stale active session
- **GIVEN** the default writer batch interval of 10 s and an active session whose `lastStatsAt` is 100 s old at the server's clock
- **WHEN** it is listed
- **THEN** the item has `stale: true`, and a left session with the same `lastStatsAt` has no `stale` property

#### Scenario: Sources and client summary
- **WHEN** an item of the participants or agents list is returned
- **THEN** `publishedSources` holds the track sources with at least one publication in `tracks.bySource` (empty when
  none) and `client` carries `sdk`, `version`, `os`, `browser`, `browserVersion` and `osVersion` when known

### Requirement: Agents list endpoint
Edition: CE. `GET /api/v1/agents` SHALL list participant sessions of kind `AGENT` with the item shape, the
`status`, `room`, `q`, `from`/`to`, `sort` (with the ranked sorts), `order`, `cursor` and `limit` parameters and the
envelope of the participants list, without `kind` or `publisher`, in every edition.

#### Scenario: Active agents
- **GIVEN** two active agent sessions and one left agent session in range, and ten STANDARD sessions
- **WHEN** the client sends `GET /api/v1/agents?status=active`
- **THEN** exactly the two active agent sessions are returned with `kind: "AGENT"` and `nodeId`

#### Scenario: Agents on CE
- **GIVEN** the CE dashboard and a valid token
- **WHEN** the client requests `GET /api/v1/agents`
- **THEN** the response is `200` with the agent sessions of the default range, never `403` `PRO_FEATURE`

#### Scenario: Agent search
- **GIVEN** active agent sessions `assistant-1` and `transcriber` in range
- **WHEN** the client sends `GET /api/v1/agents?q=tra`
- **THEN** only the `transcriber` session is returned

### Requirement: Index-backed participant queries

Edition: CE. Every query of this capability SHALL be served by an index of `data-model` with no
collection scan and with `totalDocsExamined` bounded by the page size plus the documents of the filtered
range, verified with `explain()` on a generated dataset; only the ranked sorts rank in memory, over the range scan
that the list's filters select.

#### Scenario: Explain plans

- **GIVEN** a database generated at scenario M
- **WHEN** the list with and without `q`, `room`, `kind`, `status` and `publisher`, the summary and the agents
  list queries are explained
- **THEN** no winning plan contains a `COLLSCAN` stage and none sorts in memory, the ranked sorts aside

#### Scenario: Ranked sorts over 24 hours
- **GIVEN** a database generated at scenario M
- **WHEN** the participants and agents lists are explained with `sort=leftAt` and `sort=duration` over 24 hours, with and without `q`, `room`, `kind` and `status`
- **THEN** each plan scans the range index of its filters (`joinedAt_id`, `kind_status_joinedAt_id`, `roomSid_joinedAt_id`, `identityLower_joinedAt` or `roomSid_identityLower_joinedAt`), `totalDocsExamined` is at most the sessions joined in the range, and the p95 of a page is within 300 ms

#### Scenario: Publisher filter
- **WHEN** the list with `status=active&publisher=true` is explained
- **THEN** the plan uses `kind_status_joinedAt_id` with `isPublisher` as a residual filter

### Requirement: Participants summary endpoint
Edition: CE. `GET /api/v1/participants/summary` SHALL accept `from`, `to` and `tz` and answer `200` with
`{ active: { participants, services, byKind }, sessions: { participants, byKind }, approximate }`: active STANDARD
sessions, active sessions of the other kinds and active sessions per kind, then STANDARD sessions joined in the range
and sessions per kind joined in the range. Range counts follow the exact-or-approximate rule of the rooms summary.

#### Scenario: Short range
- **GIVEN** 31 active STANDARD, 3 active EGRESS and 2 active AGENT sessions, and 900 STANDARD, 40 EGRESS and 12 AGENT sessions joined in the last 24 hours
- **WHEN** the client requests `GET /api/v1/participants/summary?from=now-24h&to=now`
- **THEN** the response is `{ active: { participants: 31, services: 5, byKind: { STANDARD: 31, EGRESS: 3, AGENT: 2, INGRESS: 0, SIP: 0, CONNECTOR: 0, BRIDGE: 0 } }, sessions: { participants: 900, byKind: { STANDARD: 900, EGRESS: 40, AGENT: 12, INGRESS: 0, SIP: 0, CONNECTOR: 0, BRIDGE: 0 } }, approximate: false }`

#### Scenario: Long range
- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client requests the summary with `from=now-30d&to=now`
- **THEN** `sessions.byKind` holds the sums of `participants.byKind` of the global hourly rollups whose bucket starts inside the range, `sessions.participants` its `STANDARD` value, and `approximate` is `true`

#### Scenario: Index-backed
- **GIVEN** a database generated at scenario M
- **WHEN** the summary queries of a 24-hour range are explained
- **THEN** no winning plan contains a `COLLSCAN` stage

### Requirement: Ranked participant sorts

Edition: CE. The participants and agents lists SHALL accept the ranked sort keys (`api-conventions`) `leftAt`, ranking
`leftAt` (`asOf` when absent), and `duration`, ranking `durationMs` (when absent, `leftAt` or `asOf` minus `joinedAt`),
when the range is no longer than the smaller of 24 h and `DASHBOARD_LIST_TOTAL_MAX_RANGE` or `room` is set, and SHALL
answer `400` with code `SORT_RANGE_TOO_WIDE` otherwise.

#### Scenario: Longest sessions first

- **GIVEN** sessions joined in the last 24 hours: one left after 50 minutes, one left after 5 minutes and one active
  that joined 20 minutes before `asOf`
- **WHEN** the client sends `GET /api/v1/participants?sort=duration`
- **THEN** `items` holds the 50-minute session, the active session and the 5-minute session, in that order

#### Scenario: Latest to leave first

- **GIVEN** sessions joined in range: one left 2 hours ago, one left 10 minutes ago and one active
- **WHEN** the client sends `?sort=leftAt&order=desc`
- **THEN** `items` holds the active session (ranked at `asOf`), the session left 10 minutes ago and the session left 2
  hours ago, in that order

#### Scenario: Range above 24 hours

- **WHEN** the client sends `?sort=leftAt&from=now-48h&to=now`
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`

#### Scenario: Any range within one room

- **WHEN** the client sends `?sort=duration&room=RM_abc&from=now-30d&to=now`
- **THEN** the response is `200` with the sessions of `RM_abc` joined in the range, longest first

#### Scenario: Agents by duration

- **WHEN** the client sends `GET /api/v1/agents?sort=duration&from=now-6h&to=now`
- **THEN** the response is `200` with the agent sessions joined in the range, longest first

### Requirement: Publisher filter

Edition: CE. The participants list SHALL accept `publisher=true`, which keeps only the sessions with
`isPublisher: true`, combined with every other filter and applied as a residual filter on the range scan that the
other filters select; any other value of `publisher` SHALL be rejected with `400` `VALIDATION_ERROR`.

#### Scenario: Active publishers

- **GIVEN** in range: three active sessions that published a track, two active sessions that only subscribed and one
  left publisher
- **WHEN** the client sends `?status=active&publisher=true`
- **THEN** exactly the three active publishers are returned and `total` is 3

#### Scenario: Unknown value

- **WHEN** the client sends `?publisher=yes`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["publisher"]`
