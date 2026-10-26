# rooms-api Specification

## Purpose
Read access to room sessions: the rooms list and its summary numbers, every query backed by an index.

## Requirements

### Requirement: Rooms list endpoint

Edition: CE. `GET /api/v1/rooms` SHALL list the room sessions created in the range with the common query contract, the
filters `status`, `q`, `features` and `nodeId`, the sort keys `createdAt` (default, index-backed) and the ranked
`endedAt`, `duration`, `uniqueIdentities` and `active`, `order` (`desc` default, `asc`), and the list envelope
`{ items, nextCursor, prevCursor, total? }` with `total` under the `DASHBOARD_LIST_TOTAL_MAX_RANGE` rule.

#### Scenario: Default list

- **GIVEN** 40 rooms created in the last 24 hours and 5 older ones
- **WHEN** the client requests `GET /api/v1/rooms` with a valid token
- **THEN** the response is `200` with the 25 most recently created rooms of the last 24 hours, `nextCursor` set,
  `prevCursor: null` and `total: 40`

#### Scenario: Cursor walk

- **GIVEN** 60 rooms in range and `limit=25`
- **WHEN** the client follows `nextCursor` twice and then `prevCursor` once
- **THEN** the pages hold rooms 1-25, 26-50, 51-60 and 26-50 with no gaps or duplicates, each page ordered by
  `createdAt desc` with `_id desc` as tie-breaker

#### Scenario: Ranked cursor walk

- **GIVEN** 60 rooms created in range, two of them active, and `sort=duration&limit=25`
- **WHEN** the client follows `nextCursor` twice
- **THEN** the pages hold rooms 1-25, 26-50 and 51-60 of the duration ranking at the first page's `asOf`, with `total:
  60` on each page and no gaps or duplicates

#### Scenario: Common query contract

- **WHEN** the client requests `GET /api/v1/rooms`
- **THEN** the common query contract it accepts is `from`, `to`, `tz`, `limit` (1-100, default 25) and an opaque
  `cursor`

### Requirement: Room list item

Edition: CE. Each rooms list item SHALL be the room document's public projection: identity, lifecycle, node,
participant, egress and ingress counters, bandwidth, feature flags, the end cause behind the "estimated" cue, the last
stats flush and the `stale` flag of `api-conventions`, never internal id arrays, `schemaVersion` or `expiresAt`.
Participant counters count STANDARD sessions only; `participants.unique` counts distinct STANDARD identities.

#### Scenario: Fields of an item

- **WHEN** an item is read
- **THEN** it has `sid`, `name`, `status` (`active` | `closed`), `createdAt`, `endedAt?`, `durationMs?`, `closedBy?`
  (`event` | `reconciler`), `nodeId?`, `participants { sessions, unique, active, peakActive }`,
  `egress { total, active }`, `ingress { sessions, active }`, `bytes { up, down }`,
  `features { egress, ingress, agent, sip }`, `lastStatsAt?`, `stale?` and no `participantSids`, `identities` or
  similar array

#### Scenario: Active room

- **GIVEN** a room still open with three active STANDARD participants and one active EGRESS participant
- **WHEN** it is returned
- **THEN** `status` is `active`, `endedAt`, `durationMs` and `closedBy` are absent and `participants.active` is 3

#### Scenario: Unique identities

- **GIVEN** a closed room where STANDARD identity `alice` had three sessions, `bob` one, and an AGENT session joined
- **WHEN** it is returned
- **THEN** `participants.sessions` is 4 and `participants.unique` is 2

#### Scenario: Stale active room

- **GIVEN** the default writer batch interval of 10 s and an active room whose `lastStatsAt` is 3 minutes old at the
  server's clock
- **WHEN** it is returned
- **THEN** it has `stale: true`, and an active room whose `lastStatsAt` is 20 s old has no `stale` property

### Requirement: Status filter

Edition: CE. The rooms list SHALL accept `status` as `active`, `closed` or `all` (default `all`) and reject any other
value with `400` `VALIDATION_ERROR`.

#### Scenario: Active rooms only

- **WHEN** the client sends `?status=active`
- **THEN** every item has `status: "active"` and the time range still applies to `createdAt`

#### Scenario: Unknown status

- **WHEN** the client sends `?status=open`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["status"]`

### Requirement: Time range and sort keys

Edition: CE. The rooms list SHALL apply `from`/`to` to `createdAt` for every sort key. `createdAt` SHALL be served in
index order; `endedAt`, `duration`, `uniqueIdentities` and `active` SHALL be ranked sorts as `api-conventions` defines,
accepted with any `status` when the range is within `DASHBOARD_LIST_TOTAL_MAX_RANGE` and answered `400`
`SORT_RANGE_TOO_WIDE` beyond it. Any other sort key SHALL be rejected with `400` `VALIDATION_ERROR`.

#### Scenario: Closed rooms by end time

- **GIVEN** a room created 3 days ago that ended 2 hours ago, and rooms created 5 and 8 hours ago that ended 3 hours
  and 1 hour ago
- **WHEN** the client sends `?status=closed&sort=endedAt&from=now-24h&to=now`
- **THEN** `items` holds the room ended 1 hour ago and the room ended 3 hours ago, in that order, and not the room
  created 3 days ago, whose `createdAt` is outside the range

#### Scenario: End-time sort without the closed filter

- **GIVEN** created in the last 24 hours: a room ended 1 hour ago, a room ended 10 minutes ago and an active room
- **WHEN** the client sends `?sort=endedAt&status=all`
- **THEN** the response is `200` with the active room (ranked at `asOf`), the room ended 10 minutes ago and the room
  ended 1 hour ago, in that order

#### Scenario: Rooms by unique identities

- **GIVEN** three rooms created in range with `participants.unique` 12, 3 and 7
- **WHEN** the client sends `?sort=uniqueIdentities`
- **THEN** `items` holds the rooms with 12, 7 and 3 unique identities, in that order

#### Scenario: Rooms by active participants

- **GIVEN** an active room with 5 active participants, an active room with 2 and a closed room, all created in range
- **WHEN** the client sends `?sort=active&order=desc`
- **THEN** `items` holds the room with 5, the room with 2 and the closed room (0), in that order

#### Scenario: Ranked sort beyond the limit

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client sends `?sort=uniqueIdentities&from=now-30d&to=now`
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`

#### Scenario: Unsupported sort key

- **WHEN** the client sends `?sort=name`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["sort"]`

#### Scenario: Ranked values

- **WHEN** the client requests a ranked sort
- **THEN** `endedAt` ranks `endedAt` (`asOf` while active), `duration` ranks `durationMs` (`asOf − createdAt` while
  active), `uniqueIdentities` ranks `participants.unique` and `active` ranks `participants.active`

### Requirement: Name prefix search and SID lookup

Edition: CE. The rooms list SHALL treat `q` as a case-insensitive prefix over the room name when it has at least two
characters, combined with `status`, `features` and `nodeId`, SHALL reject a one-character `q` with `400`, and SHALL
treat a value matching `^RM_[A-Za-z0-9]+$` as an exact SID lookup that ignores `from`, `to`, `status`, `features`,
`nodeId` and `sort` and returns at most one item.

#### Scenario: Prefix search

- **GIVEN** rooms named `Demo-Room`, `demo-2` and `my-demo` created in range
- **WHEN** the client sends `?q=DE`
- **THEN** `items` holds `Demo-Room` and `demo-2` ordered by `createdAt desc`, and not `my-demo`

#### Scenario: One character

- **WHEN** the client sends `?q=d`
- **THEN** the response is `400` with code `VALIDATION_ERROR`, `details.issues[0].path` equal to `["q"]` and a message
  stating the two-character minimum

#### Scenario: Exact SID outside the range

- **GIVEN** a closed room `RM_ab12cd` created 40 days ago
- **WHEN** the client sends `?q=RM_ab12cd&from=now-24h&status=active`
- **THEN** the response is `200` with that single room in `items`, `total: 1` and both cursors `null`

#### Scenario: Prefix within one node

- **GIVEN** rooms named `demo-a` on `node-a` and `demo-b` on `node-b`, both created in range
- **WHEN** the client sends `?q=demo&nodeId=node-a`
- **THEN** `items` holds `demo-a` only

### Requirement: Feature and node filters

Edition: CE. The rooms list SHALL accept `features` as a comma-separated subset of `egress`, `ingress`, `agent`, `sip`
and return rooms whose flag is set for any of the listed values, SHALL accept `nodeId` as an exact match on the room's
node, and SHALL reject an unknown feature value with `400`.

#### Scenario: Rooms with egress or ingress

- **GIVEN** a room with an egress, a room with an ingress session and a plain room
- **WHEN** the client sends `?features=egress,ingress`
- **THEN** the first two rooms are returned and the plain room is not

#### Scenario: Rooms of one node

- **WHEN** the client sends `?nodeId=node-a&status=active`
- **THEN** every item has `nodeId: "node-a"` and `status: "active"`

#### Scenario: Unknown feature

- **WHEN** the client sends `?features=egress,webhook`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["features"]`

### Requirement: Rooms summary endpoint

Edition: CE. `GET /api/v1/rooms/summary` SHALL accept `from`, `to` and `tz` and answer `200` with
`{ activeRooms, roomsInRange, participantSessions, activeParticipants, approximate }`, where the participant counts
are STANDARD sessions and the two range counts are exact when the range is within `DASHBOARD_LIST_TOTAL_MAX_RANGE`
and are hour-aligned sums of the hourly rollups with `approximate: true` beyond it.

#### Scenario: Short range

- **GIVEN** 7 active rooms, 120 rooms created, 900 STANDARD and 40 EGRESS participant sessions joined in the last 24
  hours, and 31 active STANDARD participants
- **WHEN** the client requests `GET /api/v1/rooms/summary?from=now-24h&to=now`
- **THEN** the response is `{ activeRooms: 7, roomsInRange: 120, participantSessions: 900, activeParticipants: 31,
  approximate: false }`

#### Scenario: Long range

- **GIVEN** the default threshold of 7 days
- **WHEN** the client requests `GET /api/v1/rooms/summary?from=now-30d&to=now`
- **THEN** `roomsInRange` and `participantSessions` equal the sums of `rooms.created` and `participants.joined` of the
  global hourly rollups whose bucket starts inside the range, and `approximate` is `true`

### Requirement: Index-backed room queries

Edition: CE. Every query of this capability SHALL run on an index of the shared contract
(`dashboard-ce/typings/contract/indexes.ts`), or on `_id` for the hourly rollups the long-range summary reads: no
winning plan contains a `COLLSCAN`, and `totalDocsExamined` is bounded
by the page size plus the documented residual filters for the index-ordered pages and by the rooms created in the range
for the ranked sorts.

#### Scenario: Explain plans on the generated database

- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** the list (every filter combination and sort) and summary queries are explained
- **THEN** each winning plan uses an index of the shared contract and none contains `COLLSCAN`

#### Scenario: Ranked sorts over 7 days

- **GIVEN** a database generated at scenario M for 7 days
- **WHEN** the list is explained with each ranked sort key, with and without `status`, `q`, `nodeId` and `features`
- **THEN** each plan scans the range index of its filters (`createdAt_id`, `status_createdAt_id`,
  `nameLower_createdAt`, `nodeId_status_createdAt_id` or the feature indexes), `totalDocsExamined` is at most the rooms
  created in the range, and the p95 of a page is within 300 ms

#### Scenario: Name prefix within one node

- **WHEN** the list with `q` and `nodeId` is explained
- **THEN** the plan uses `nameLower_createdAt` with `nodeId` as a residual filter
