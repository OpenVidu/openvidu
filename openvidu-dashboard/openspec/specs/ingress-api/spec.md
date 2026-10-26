# ingress-api Specification

## Purpose
Read access to ingress definitions: the ingresses list and its summary numbers, every query backed by an index.

## Requirements

### Requirement: Ingresses list endpoint

Edition: CE. `GET /api/v1/ingresses` SHALL list the ingress definitions of the activity range with the common query
contract (`from`, `to`, `tz`, `limit` 1-100 default 25, opaque `cursor`), the filters `status`, `inputType` and `q`, the
ranked sort keys `createdAt` (default), `totalDuration`, `sessions` and `lastSession` (`order` default `desc`), and the
list envelope `{ items, nextCursor, prevCursor, total? }` with `total` under the `DASHBOARD_LIST_TOTAL_MAX_RANGE` rule.

#### Scenario: Default list

- **GIVEN** 30 ingresses created in the last 24 hours and 4 older ones that neither started a session in that range nor
  are publishing
- **WHEN** the client requests `GET /api/v1/ingresses` with a valid token
- **THEN** the response is `200` with the 25 most recently created ingresses of the last 24 hours, `nextCursor` set,
  `prevCursor: null` and `total: 30`

#### Scenario: Cursor walk

- **GIVEN** 60 ingresses in range and `limit=25`
- **WHEN** the client follows `nextCursor` twice and then `prevCursor` once
- **THEN** the pages hold ingresses 1-25, 26-50, 51-60 and 26-50 with no gaps or duplicates, each page ordered by
  `createdAt desc` with `_id desc` as tie-breaker

#### Scenario: Ranked cursor walk

- **GIVEN** 60 ingresses in the activity range, two of them publishing, and `sort=totalDuration&limit=25`
- **WHEN** the client follows `nextCursor` twice
- **THEN** the pages hold ingresses 1-25, 26-50 and 51-60 of the ranking at the first page's `asOf`, with no gaps or
  duplicates

### Requirement: Ingress list item

Edition: CE. Each item of the ingresses list SHALL be the public projection of the ingress document: identity,
definition facts, lifecycle and the aggregate session counters. `schemaVersion`, `expiresAt`, `participantName`,
`url` and any stream key SHALL never be part of a list item.

#### Scenario: Fields of an item

- **WHEN** an item is read
- **THEN** it has `ingressId`, `name?`, `inputType` (`rtmp` | `whip` | `url`), `roomName`, `participantIdentity`,
  `status` (`inactive` | `buffering` | `publishing` | `error` | `complete` | `deleted`), `enabled`, `reusable`,
  `createdAt`, `deletedAt?`, `sessions`, `totalDurationMs`, `lastSessionAt?` and `hasError`, and no `url`,
  `streamKey`, `participantName`, `schemaVersion` or `expiresAt`

#### Scenario: Deleted ingress within retention

- **GIVEN** an ingress deleted yesterday whose document has not expired
- **WHEN** it is returned
- **THEN** `status` is `deleted` and `deletedAt` is set

#### Scenario: Error flag

- **GIVEN** a reusable ingress whose last session ended in error and which is now `inactive`
- **WHEN** it is returned
- **THEN** `status` is `inactive` and `hasError` is `true`

### Requirement: Ingress status filter

Edition: CE. The ingresses list SHALL accept `status` as one of `inactive`, `buffering`, `publishing`, `error`,
`complete`, `deleted` or `all` (default `all`) and reject any other value with `400` `VALIDATION_ERROR`.

#### Scenario: Publishing only

- **WHEN** the client sends `?status=publishing`
- **THEN** every item has `status: "publishing"` and the activity range still applies

#### Scenario: Unknown status

- **WHEN** the client sends `?status=active`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["status"]`

#### Scenario: Old ingress publishing now

- **GIVEN** an ingress created 30 days ago that is publishing now
- **WHEN** the client sends `?status=publishing&from=now-1h&to=now`
- **THEN** the ingress is in `items`

### Requirement: Input type filter

Edition: CE. The ingresses list SHALL accept `inputType` as exactly one of `rtmp`, `whip` or `url`, SHALL return every
input type when the parameter is absent, and SHALL reject any other value with `400` `VALIDATION_ERROR`.

#### Scenario: WHIP only

- **GIVEN** an RTMP, a WHIP and a URL ingress created in range
- **WHEN** the client sends `?inputType=whip`
- **THEN** `items` holds only the WHIP ingress

#### Scenario: Unknown input type

- **WHEN** the client sends `?inputType=srt`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["inputType"]`

### Requirement: Time range and sort key

Edition: CE. The ingresses list SHALL apply `from`/`to` as an activity range, the union of the ingresses created in it
(`createdAt_id`), those with `lastSessionAt` in it (`lastSessionAt_id`) and those publishing now (`status: publishing`)
with `createdAt ≤ to` (`status_createdAt`). It SHALL accept `sort` only as `createdAt`, `totalDuration`, `sessions` or
`lastSession` (else `400` `VALIDATION_ERROR`) and `order` as `asc` or `desc` (default `desc`).

#### Scenario: Oldest first

- **WHEN** the client sends `?order=asc`
- **THEN** items are ordered by `createdAt asc` with `_id asc` as tie-breaker

#### Scenario: Unsupported sort key

- **WHEN** the client sends `?sort=lastSessionAt`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["sort"]`

#### Scenario: Used in the range

- **GIVEN** an inactive ingress created 20 days ago whose last session started 2 hours ago
- **WHEN** the client sends `?from=now-24h&to=now`
- **THEN** the ingress is in `items`

#### Scenario: Publishing for days

- **GIVEN** an ingress created 30 days ago whose session started 3 days ago and is publishing now
- **WHEN** the client sends `?from=now-1h&to=now`
- **THEN** the ingress is in `items`

#### Scenario: Idle in the range

- **GIVEN** an inactive ingress created 30 days ago whose last session started 10 days ago
- **WHEN** the client sends `?from=now-24h&to=now`
- **THEN** the ingress is not in `items`

#### Scenario: Created after the range

- **GIVEN** an ingress created today that is publishing now
- **WHEN** the client sends a range that ended yesterday
- **THEN** the ingress is not in `items`

#### Scenario: Listed once

- **GIVEN** an ingress created 1 hour ago whose only session started 50 minutes ago and is publishing now
- **WHEN** the client sends `?from=now-24h&to=now`
- **THEN** the ingress appears once in `items` and counts once in `total`

### Requirement: Name prefix search and id lookup

Edition: CE. The ingresses list SHALL treat `q` as a case-insensitive prefix over the ingress name when it has at least
two characters, combined with the activity range, `status` and `inputType`, SHALL reject a one-character `q` with
`400`, and SHALL treat a value matching `^IN_[A-Za-z0-9]+$` as an exact id lookup that ignores `from`, `to`, `status`,
`inputType` and `sort` and returns at most one item.

#### Scenario: Prefix search

- **GIVEN** ingresses named `Cam-1`, `cam-2` and `my-cam` created in range
- **WHEN** the client sends `?q=CA`
- **THEN** `items` holds `Cam-1` and `cam-2` ordered by `createdAt desc`, and not `my-cam`

#### Scenario: One character

- **WHEN** the client sends `?q=c`
- **THEN** the response is `400` with code `VALIDATION_ERROR`, `details.issues[0].path` equal to `["q"]` and a message
  stating the two-character minimum

#### Scenario: Exact id outside the range

- **GIVEN** a deleted ingress `IN_ab12cd` created 40 days ago
- **WHEN** the client sends `?q=IN_ab12cd&from=now-24h&status=publishing`
- **THEN** the response is `200` with that single ingress in `items`, `total: 1` and both cursors `null`

#### Scenario: Prefix of an ingress used in the range

- **GIVEN** an ingress named `Studio` created 20 days ago whose last session started 1 hour ago
- **WHEN** the client sends `?q=stu&from=now-24h&to=now`
- **THEN** the ingress is in `items`

### Requirement: Ingresses summary endpoint

Edition: CE. `GET /api/v1/ingresses/summary` SHALL accept `from`, `to` and `tz` and answer `200` with
`{ publishingNow, ingressesInRange, byInputType, sessionsInRange, totalDurationMs, approximate }`, where
`ingressesInRange` and `byInputType` count the ingresses the list selects for the range, the two session numbers are
hour-aligned sums of the global hourly rollups and `approximate` is `true` when the range bounds are not on hour
boundaries.

#### Scenario: Numbers of a range

- **GIVEN** 2 ingresses publishing now and created in the last 24 hours, 3 more created in the last 24 hours (5 in
  all: 3 RTMP, 2 WHIP), 12 sessions started and 6 hours of sessions ended in the hourly buckets of that range
- **WHEN** the client requests `GET /api/v1/ingresses/summary?from=now-24h&to=now`
- **THEN** the response is `{ publishingNow: 2, ingressesInRange: 5, byInputType: { rtmp: 3, whip: 2, url: 0 },
  sessionsInRange: 12, totalDurationMs: 21600000, approximate: true }`

#### Scenario: Hour-aligned range

- **WHEN** the client requests `?from=2026-10-13T00:00:00Z&to=2026-10-13T12:00:00Z`
- **THEN** `sessionsInRange` and `totalDurationMs` are the sums of `ingress.sessionsStarted` and `ingress.durationMs`
  of the twelve global hourly buckets and `approximate` is `false`

#### Scenario: Publishing count ignores the range

- **GIVEN** an ingress created 30 days ago that is publishing now
- **WHEN** the client requests the summary with `from=now-1h`
- **THEN** `publishingNow` counts it and `ingressesInRange` counts it too, as the list shows it

#### Scenario: Reused ingress counted by activity

- **GIVEN** an idle ingress created 30 days ago whose last session started 2 hours ago
- **WHEN** the client requests the summary with `from=now-24h`
- **THEN** `ingressesInRange` counts it and `publishingNow` does not

#### Scenario: Ingresses selected for the range

- **WHEN** the client requests the summary of a range
- **THEN** `ingressesInRange` and `byInputType` count the ingresses created in the range, those with a session started
  in it and those publishing now and created before `to`

### Requirement: Index-backed ingress queries

Edition: CE and PRO. Every query of this capability SHALL run on an index of the shared contract
(`dashboard-ce/typings/contract/indexes.ts`), or on `_id` for the hourly rollups the long-range summary reads: no
winning plan contains a `COLLSCAN`, and `totalDocsExamined` is bounded
by the page size plus the documented residual filters, and for the list by the ingresses of the three branches of the
activity range.

#### Scenario: Explain plans on the generated database

- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** the list (every filter combination and sort) and summary queries are explained
- **THEN** each winning plan uses an index of the shared contract and none contains `COLLSCAN`

#### Scenario: Activity range over 30 days

- **GIVEN** a database generated at scenario M for 30 days
- **WHEN** the list is explained with each sort key over 30 days for `createdAt` and over 7 days for the others
- **THEN** the three branches use `createdAt_id`, `lastSessionAt_id` and `status_createdAt`, `totalDocsExamined` is at
  most the ingresses the branches select, and the p95 of a page is within 200 ms

### Requirement: Ranked ingress sorts

Edition: CE. Every ingress sort SHALL rank in memory as `api-conventions` defines: `createdAt` ranks `createdAt` over
any range; `totalDuration` ranks `totalDurationMs` plus `asOf − lastSessionAt` while publishing, `sessions` ranks
`sessions` and `lastSession` ranks `lastSessionAt`, these three accepted when the range is within
`DASHBOARD_LIST_TOTAL_MAX_RANGE` and answered `400` with code `SORT_RANGE_TOO_WIDE` beyond it.

#### Scenario: Total duration with a running session

- **GIVEN** in the activity range: an inactive ingress with `totalDurationMs` of 3 hours, an inactive ingress with
  20 minutes, and an ingress publishing with `totalDurationMs` of 1 hour whose last session started 90 minutes before
  `asOf`
- **WHEN** the client sends `GET /api/v1/ingresses?sort=totalDuration`
- **THEN** `items` holds the 3-hour ingress, the publishing ingress (2 h 30 min at `asOf`) and the 20-minute ingress,
  in that order

#### Scenario: Most used first

- **GIVEN** ingresses in the activity range with `sessions` 12, 1 and 5
- **WHEN** the client sends `?sort=sessions&order=desc`
- **THEN** `items` holds the ingresses with 12, 5 and 1 sessions, in that order

#### Scenario: Latest session first

- **GIVEN** ingresses in the activity range whose last sessions started 2 hours, 10 minutes and 6 hours ago
- **WHEN** the client sends `?sort=lastSession`
- **THEN** `items` holds them in the order 10 minutes, 2 hours and 6 hours ago

#### Scenario: Creation order over any range

- **WHEN** the client sends `?sort=createdAt&from=now-90d&to=now`
- **THEN** the response is `200` with the ingresses of the activity range newest first

#### Scenario: Metric sort beyond the limit

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client sends `?sort=sessions&from=now-30d&to=now`
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`
