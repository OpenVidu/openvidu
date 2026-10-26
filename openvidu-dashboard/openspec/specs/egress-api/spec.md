# egress-api Specification

## Purpose
Read access to egresses: the list and its summary numbers, every query backed by an index.

## Requirements

### Requirement: Egresses list endpoint

Edition: CE. `GET /api/v1/egresses` SHALL list egresses with the common query contract (`from`, `to`, `tz`, `limit`
1-100 default 25, opaque `cursor`), the filters `status`, `type`, `room` and `q`, the sort keys `startedAt` (default,
index-backed; `_id` tie-breaker) and the ranked `endedAt` and `duration`, `order` (`desc` default, `asc`), and the list
envelope `{ items, nextCursor, prevCursor, total? }` with `total` under the `DASHBOARD_LIST_TOTAL_MAX_RANGE` rule.

#### Scenario: Default list

- **GIVEN** 40 egresses started in the last 24 hours and 5 older ones
- **WHEN** the client requests `GET /api/v1/egresses` with a valid token
- **THEN** the response is `200` with the 25 most recently started egresses of the last 24 hours ordered by
  `startedAt desc`, `nextCursor` set, `prevCursor: null` and `total: 40`

#### Scenario: Cursor walk

- **GIVEN** 60 egresses in range and `limit=25`
- **WHEN** the client follows `nextCursor` twice and then `prevCursor` once
- **THEN** the pages hold egresses 1-25, 26-50, 51-60 and 26-50 with no gaps or duplicates

#### Scenario: Unsupported sort key

- **WHEN** the client sends `?sort=durationMs`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["sort"]`

### Requirement: Egress list item

Edition: CE. Each item of the egresses list SHALL be the public projection of the egress document: identity, room
reference, type and source, lifecycle, times, an outputs summary and an error flag; it SHALL never carry the request,
the output locations or URLs, the status history, `schemaVersion` or `expiresAt`.

#### Scenario: Fields of an item

- **WHEN** an item is read
- **THEN** it has `egressId`, `roomSid?`, `roomName?`, `type` (`room_composite` | `web` | `participant` |
  `track_composite` | `track`), `sourceType` (`web` | `sdk`), `status` (`starting` | `active` | `ending` | `complete`
  | `failed` | `aborted` | `limit_reached`), `closedBy?` (`event` | `reconciler`), `startedAt`, `endedAt?`,
  `durationMs?`, `outputs { kinds, count }`, `hasError` and `errorCode?` (the protocol's error code), and no
  `request`, `statusHistory`, error message or output location

#### Scenario: Outputs summary

- **GIVEN** an egress with two file outputs and one stream output
- **WHEN** it is returned
- **THEN** `outputs` is `{ kinds: ["file", "stream"], count: 3 }` with kinds in order of first appearance

#### Scenario: Active egress

- **GIVEN** an egress whose status is `starting`, `active` or `ending`
- **WHEN** it is returned
- **THEN** `endedAt`, `durationMs` and `closedBy` are absent and `hasError` is `false`

#### Scenario: Web egress without room

- **GIVEN** a `web` egress started with an empty room id
- **WHEN** it is returned
- **THEN** `roomSid` and `roomName` are absent and `type` is `web`

### Requirement: Status and type filters

Edition: CE. The egresses list SHALL accept `status` as `all` (default) or a comma-separated subset of the seven
egress statuses, and `type` as a comma-separated subset of the five egress types (absent means all), and SHALL reject
an unknown value in either with `400` `VALIDATION_ERROR`.

#### Scenario: In-flight egresses

- **WHEN** the client sends `?status=starting,active,ending`
- **THEN** every item has one of those three statuses and the time range still applies to `startedAt`

#### Scenario: Failed recordings of one type

- **WHEN** the client sends `?status=failed&type=room_composite,participant`
- **THEN** every item has `status: "failed"` and `type` equal to `room_composite` or `participant`

#### Scenario: Unknown status

- **WHEN** the client sends `?status=running`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["status"]`

### Requirement: Room filter

Edition: CE. The egresses list SHALL accept `room` as an exact room SID matching `^RM_[A-Za-z0-9]+$`, SHALL combine it
with `status`, `type` and the range, and SHALL reject any other value with `400`.

#### Scenario: Egresses of one room

- **GIVEN** room `RM_abc` with one complete and one active egress in range and other rooms with egresses
- **WHEN** the client sends `?room=RM_abc`
- **THEN** exactly the two egresses of `RM_abc` are returned, ordered by `startedAt desc`

#### Scenario: Malformed room

- **WHEN** the client sends `?room=demo-room`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["room"]`

### Requirement: Room-name prefix search and egress id lookup

Edition: CE. The egresses list SHALL treat `q` as a case-insensitive prefix over the room name when it has at least
two characters, matched on the egress's own lower-cased room name `roomNameLower` with the range on `startedAt` and
combined with `status`, `type` and `room`, SHALL reject a one-character `q` with `400`, and SHALL treat a value matching
`^EG_[A-Za-z0-9]+$` as an exact egress id lookup that ignores `from`, `to`, `status`, `type`, `room` and `sort` and
returns at most one item.

#### Scenario: Prefix search

- **GIVEN** egresses in rooms `Demo-Room`, `demo-2` and `my-demo` started in range
- **WHEN** the client sends `?q=DE`
- **THEN** `items` holds the egresses of `Demo-Room` and `demo-2` ordered by `startedAt desc`, and none of `my-demo`

#### Scenario: One character

- **WHEN** the client sends `?q=d`
- **THEN** the response is `400` with code `VALIDATION_ERROR`, `details.issues[0].path` equal to `["q"]` and a
  message stating the two-character minimum

#### Scenario: Exact id outside the range

- **GIVEN** a complete egress `EG_ab12cd` started 40 days ago
- **WHEN** the client sends `?q=EG_ab12cd&from=now-24h&status=active`
- **THEN** the response is `200` with that single egress in `items`, `total: 1` and both cursors `null`

#### Scenario: Prefix matching many rooms

- **GIVEN** 150 rooms whose name starts with `load-`, each with one egress started in range
- **WHEN** the client sends `?q=load-` and walks the cursor
- **THEN** the pages hold the 150 egresses ordered by `startedAt desc` with no gaps or duplicates, `total` is 150, and
  no room cap applies

#### Scenario: Room of the egress no longer stored

- **GIVEN** an egress of room `demo-room` started in range whose room document has expired
- **WHEN** the client sends `?q=demo`
- **THEN** the egress is returned, since the match reads the egress document's `roomNameLower`

#### Scenario: Document without the lower-cased room name

- **GIVEN** an egress document written without `roomNameLower`
- **WHEN** the client sends a prefix of its room name
- **THEN** the egress is not returned, and `?q=<its id>` still returns it

### Requirement: Time range on start time

Edition: CE. The egresses list SHALL apply `from`/`to` to `startedAt` for every sort key, order and filter, so that an
egress that started before `from` is not listed, even while it is active, unless it is looked up by exact id.

#### Scenario: Long-running egress outside the range

- **GIVEN** an active egress started 3 days ago
- **WHEN** the client sends `?status=active&from=now-24h&to=now`
- **THEN** the egress is not in `items`, and `?q=<its id>` returns it

#### Scenario: Ranked sort keeps the start range

- **GIVEN** the same active egress
- **WHEN** the client sends `?sort=duration&from=now-24h&to=now`
- **THEN** the egress is not in `items`

### Requirement: Egresses summary endpoint

Edition: CE. `GET /api/v1/egresses/summary` SHALL accept `from`, `to` and `tz` and answer `200` with
`{ active, startedInRange, byType, byEndStatus, totalDurationMs, approximate }`, where `active` counts the current
`starting`, `active` and `ending` egresses and the range figures are exact within `DASHBOARD_LIST_TOTAL_MAX_RANGE`
and hour-aligned sums of the hourly rollups with `approximate: true` beyond it.

#### Scenario: Short range

- **GIVEN** 3 in-flight egresses now, and 120 egresses started in the last 24 hours of which 100 are
  `room_composite`, 20 `track`, 110 `complete`, 7 `failed`, 3 still active, totalling 36 000 000 ms of ended duration
- **WHEN** the client requests `GET /api/v1/egresses/summary?from=now-24h&to=now`
- **THEN** the response is `{ active: 3, startedInRange: 120, byType: { room_composite: 100, track: 20 },
  byEndStatus: { complete: 110, failed: 7 }, totalDurationMs: 36000000, approximate: false }`

#### Scenario: Long range

- **GIVEN** the default threshold of 7 days
- **WHEN** the client requests `GET /api/v1/egresses/summary?from=now-30d&to=now`
- **THEN** `startedInRange`, `byType`, `byEndStatus` and `totalDurationMs` equal the sums of `egress.started`,
  `egress.byType`, `egress.endedByStatus` and `egress.durationMs` of the global hourly rollups whose bucket starts
  inside the range, `active` is still the exact current count, and `approximate` is `true`

### Requirement: Index-backed egress queries

Edition: CE and PRO. Every query of this capability SHALL run on an index of the shared contract
(`dashboard-ce/typings/contract/indexes.ts`), or on `_id` for the hourly rollups the long-range summary reads: no
winning plan contains a `COLLSCAN`, and `totalDocsExamined` is bounded
by the page size plus the documented residual filters for the index-ordered pages and by the egresses started in the
range for the ranked sorts.

#### Scenario: Explain plans on the generated database

- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** the list (every filter combination and sort) and summary queries are explained
- **THEN** each winning plan uses an index of the shared contract and none contains `COLLSCAN`

#### Scenario: Room-name prefix

- **WHEN** the list with `q` set to a room-name prefix and no `room` is explained
- **THEN** the plan uses `roomNameLower_startedAt` with the range on `startedAt`, and no query reads `rooms`

#### Scenario: Ranked sorts over 7 days

- **GIVEN** a database generated at scenario M for 7 days
- **WHEN** the list is explained with `sort=endedAt` and `sort=duration`, with and without `status`, `room` and `q`
- **THEN** each plan scans the range index of its filters (`startedAt_id`, `status_startedAt`, `roomSid_startedAt` or
  `roomNameLower_startedAt`), `totalDocsExamined` is at most the egresses started in the range, and the p95 of a page
  is within 200 ms

### Requirement: Ranked egress sorts

Edition: CE. The egresses list SHALL accept the ranked sort keys (`api-conventions`) `endedAt`, ranking `endedAt`
(`asOf` when absent), and `duration`, ranking `durationMs` (`asOf − startedAt` when absent), over the egresses started
in the range and matching the filters, when the range is within `DASHBOARD_LIST_TOTAL_MAX_RANGE`, and SHALL answer
`400` with code `SORT_RANGE_TOO_WIDE` beyond it.

#### Scenario: Longest egresses first

- **GIVEN** egresses started in the last 24 hours: one complete after 2 hours, one complete after 10 minutes and one
  active that started 45 minutes before `asOf`
- **WHEN** the client sends `GET /api/v1/egresses?sort=duration`
- **THEN** `items` holds the 2-hour egress, the active egress and the 10-minute egress, in that order

#### Scenario: Latest to end first

- **GIVEN** egresses started in range: one ended 3 hours ago, one ended 5 minutes ago and one active
- **WHEN** the client sends `?sort=endedAt&order=desc&status=all`
- **THEN** `items` holds the active egress (ranked at `asOf`), the egress ended 5 minutes ago and the egress ended 3
  hours ago, in that order

#### Scenario: Ranked sort beyond the limit

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client sends `?sort=duration&from=now-30d&to=now`
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`

#### Scenario: Ranked cursor walk

- **GIVEN** 60 egresses started in range, two of them active, and `sort=endedAt&limit=25`
- **WHEN** the client follows `nextCursor` twice
- **THEN** the pages hold egresses 1-25, 26-50 and 51-60 of the ranking at the first page's `asOf`, with no gaps or
  duplicates
