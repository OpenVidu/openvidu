# api-conventions Specification

## Purpose
Defines the contract shared by every `/api/v1` endpoint of the dashboard: naming, time range, pagination,
sorting, search, response envelopes, errors, validation, request correlation, documentation, versioning and
health probes, so that each resource endpoint only specifies what is particular to it.

## Requirements

### Requirement: Base path and resource naming

Edition: CE. Every dashboard API route SHALL live under `/api/v1`, use lower-case plural nouns for resources
(`rooms`, `participants`, `agents`, `tracks`, `egresses`, `ingresses`, `analytics`, `overview`, `status`, `auth`,
`info`), nest
sub-resources at most one level under the parent identifier, and answer every unknown `/api` path with a JSON
`404` instead of the SPA fallback.

#### Scenario: Sub-resource path

- **GIVEN** a room with SID `RM_abc`
- **WHEN** the client requests its participants
- **THEN** the path is `GET /api/v1/rooms/RM_abc/participants`

#### Scenario: Unknown API path

- **WHEN** the client requests `GET /api/v1/does-not-exist` or `GET /api/anything`
- **THEN** the response is `404` with body `{ error: { code: 'NOT_FOUND', message } }` and
  `Content-Type: application/json`, never the SPA `index.html`, and the message names the full path, such as
  `No API route for GET /api/v1/does-not-exist`

### Requirement: JSON field conventions

Edition: CE. Every JSON body SHALL use camelCase field names, SHALL omit a field whose value is unknown or not
applicable unless the resource spec declares it nullable, and SHALL spell enum values replicated from the LiveKit
protocol as the protocol does (`UPPER_SNAKE`) and dashboard-defined enums in lower-case.

#### Scenario: Mixed enum origins

- **WHEN** a participant of kind agent in an active room is returned
- **THEN** the body contains `"kind": "AGENT"` (protocol enum) and `"status": "active"` (dashboard enum)

#### Scenario: Unknown value omitted

- **GIVEN** a participant whose SDK reported no client information
- **WHEN** it is returned by any endpoint
- **THEN** the body has no `client` property rather than `"client": null`

### Requirement: Time and quantity encoding

Edition: CE. Timestamps SHALL be ISO 8601 strings in UTC with millisecond precision and a `Z` suffix, durations
SHALL be integers in milliseconds in fields whose name ends in `Ms`, and byte counts SHALL be plain integers
without units.

#### Scenario: Entity timestamp and duration

- **GIVEN** a room created at 2026-10-13 10:00:00.250 UTC that lasted 90 seconds
- **WHEN** it is returned by any endpoint
- **THEN** the body contains `"createdAt": "2026-10-13T10:00:00.250Z"` and `"durationMs": 90000`

#### Scenario: Byte counts

- **GIVEN** a room that moved 1.5 MB upstream
- **WHEN** it is returned by any endpoint
- **THEN** the body contains `"bytesUp": 1500000`

### Requirement: Time range parameters

Edition: CE. Endpoints that take a time range SHALL accept `from` and `to` as ISO 8601 timestamps (with offset
or `Z`) or as relative expressions `now`, `now-<n><unit>` (`unit` in `m`, `h`, `d`) and `now/<unit>` (start of
the current `d` or `M`, computed in `tz`), SHALL default to `from=now-24h` and `to=now`, SHALL resolve
relative expressions at request time, and SHALL reject `from` not strictly before `to` with `400`.

#### Scenario: Relative range resolved at request time

- **GIVEN** the current time is 2026-10-13T12:00:00Z
- **WHEN** the client sends `?from=now-24h&to=now`
- **THEN** the query covers 2026-10-12T12:00:00Z to 2026-10-13T12:00:00Z

#### Scenario: Start of month in the caller's zone

- **GIVEN** `tz=Europe/Madrid` on 2026-10-13
- **WHEN** the client sends `?from=now/M`
- **THEN** `from` resolves to 2026-09-30T22:00:00Z (local midnight of 1 October)

#### Scenario: Inverted range

- **WHEN** the client sends `?from=2026-10-13T00:00:00Z&to=2026-10-12T00:00:00Z`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["from"]`

### Requirement: Timezone parameter

Edition: CE. Endpoints that bucket or snap by calendar units SHALL accept `tz` as an IANA zone name or `UTC`,
SHALL default to `UTC`, SHALL use it only for bucketing and relative-range snapping (stored and returned
timestamps stay UTC), and SHALL reject an unknown zone with `400`.

#### Scenario: Unknown timezone

- **WHEN** the client sends `?tz=Mars/Olympus`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["tz"]`

#### Scenario: Daily buckets follow the zone

- **GIVEN** `tz=America/New_York` and `granularity=1d`
- **WHEN** a time series is requested
- **THEN** every bucket starts at local midnight, serialised in UTC (for example `2026-10-13T04:00:00.000Z`)

### Requirement: Page size

Edition: CE. List endpoints SHALL accept `limit` as an integer between 1 and 100, SHALL default to 25 and SHALL
reject any other value with `400`. The cap of 100 is the page-size limit the UI offers (10, 25, 50, 100).

#### Scenario: Default page size

- **WHEN** a list is requested without `limit`
- **THEN** at most 25 items are returned

#### Scenario: Page size above the cap

- **WHEN** the client sends `?limit=101` or `?limit=0` or `?limit=abc`
- **THEN** the response is `400` with code `VALIDATION_ERROR`

### Requirement: Cursor pagination

Edition: CE. List endpoints SHALL paginate with an opaque `cursor`, return `nextCursor` and `prevCursor` as a string
when a page exists in that direction and `null` otherwise, order every page deterministically by the sort key (the rank,
for a ranked sort) with `_id` as tie-breaker, and reject with `400` a malformed cursor or one issued for a different
`sort`/`order`.

#### Scenario: Walking forward and back

- **GIVEN** 60 rooms sorted by `createdAt` descending and `limit=25`
- **WHEN** the client requests the first page, then the page at `nextCursor`, then the page at its `prevCursor`
- **THEN** the pages contain rooms 1-25, 26-50 and 1-25 respectively, with no gaps or duplicates, and the
  first page has `prevCursor: null` while the third page (rooms 51-60) would have `nextCursor: null`

#### Scenario: Cursor reused with another sort

- **GIVEN** a cursor issued for `sort=createdAt&order=desc`
- **WHEN** the client sends it with `sort=name`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["cursor"]`

#### Scenario: Items inserted while paging

- **GIVEN** the client holds a `nextCursor`
- **WHEN** new rooms are created before the next request
- **THEN** the next page still starts right after the boundary item of the previous page

#### Scenario: Walking a ranked sort back

- **GIVEN** 60 rooms in range sorted by `duration` descending, `limit=25`, three of them active
- **WHEN** the client requests the first page, the page at `nextCursor` and then the page at its `prevCursor`
- **THEN** the pages contain rooms 1-25, 26-50 and 1-25 of the ranking at the first page's `asOf`, with no gaps or
  duplicates

#### Scenario: Cursor content

- **WHEN** a list endpoint issues a cursor
- **THEN** it is a base64url string encoding the sort value and `_id` of the boundary item, the `sort` and `order` it
  was issued for and the direction, plus the `asOf` time of its first page for a ranked sort

### Requirement: Optional total count

Edition: CE. List responses SHALL include `total` (number of items matching the filters) only when the resolved
time range is not longer than `DASHBOARD_LIST_TOTAL_MAX_RANGE` (default `7d`); otherwise `total` SHALL be
omitted so that the UI shows "showing x-y" without a total.

#### Scenario: Short range

- **WHEN** a list is requested with `from=now-24h`
- **THEN** the response includes `total`

#### Scenario: Long range

- **GIVEN** the default threshold
- **WHEN** a list is requested with `from=now-30d`
- **THEN** the response has no `total` property

### Requirement: Sorting parameters

Edition: CE. List endpoints SHALL accept `sort` only from the sort keys that the resource spec declares, either
index-backed or ranked, and `order` as `asc` or `desc`, SHALL apply the resource's documented default when they are
absent, and SHALL reject any other value with `400`.

#### Scenario: Unsupported sort key

- **WHEN** the client sends `?sort=metadata`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["sort"]`

#### Scenario: Default order

- **WHEN** a list is requested without `sort` and `order`
- **THEN** the items follow the resource's default (newest first for time-keyed resources)

#### Scenario: Ranked key accepted

- **WHEN** the client sends `GET /api/v1/egresses?sort=duration&from=now-24h&to=now`
- **THEN** the response is `200` with the egresses started in the range ranked by duration, longest first

### Requirement: Search and enum filters

Edition: CE. List endpoints SHALL accept `q` (trimmed, 2 to 100 characters) as a case-insensitive prefix match
over the searchable fields the resource spec declares, except a `q` that matches the list's entity ID pattern, which
follows the exact-ID search whatever its length; `status` and `kind` take the resource's values, as a single value or
a comma-separated list as the resource spec declares; empty `q` SHALL be ignored and an unknown `status` or `kind`
value SHALL be rejected with `400`.

#### Scenario: Prefix search is case-insensitive

- **GIVEN** rooms named `Demo-Room` and `demo-2`
- **WHEN** the client sends `?q=DEMO`
- **THEN** both rooms are returned and a room named `my-demo` is not

#### Scenario: Multi-valued kind

- **WHEN** the client sends `?kind=EGRESS,AGENT` on the participants list
- **THEN** participants of any of the two kinds are returned (rooms use `features` for the same purpose)

#### Scenario: Exact ID instead of a prefix

- **GIVEN** a session `PA_x1y2` and a session whose identity is `pa_x1y2-bot`
- **WHEN** the client sends `?q=PA_x1y2` on the participants list
- **THEN** only the session `PA_x1y2` is returned

### Requirement: List response envelope

Edition: CE. Every list endpoint SHALL respond `200` with `{ items, nextCursor, prevCursor, total? }` where
`items` is an array (possibly empty) of the resource's list item shape and no other top-level properties exist.

#### Scenario: Empty result

- **WHEN** no item matches the filters
- **THEN** the response is `200` with `{ items: [], nextCursor: null, prevCursor: null, total: 0 }` (total
  present only under the threshold rule)

### Requirement: Time-series response envelope

Edition: CE. Every time-series endpoint SHALL respond `200` with
`{ granularity, from, to, series: [{ name, points: [[ts, value]] }] }` where `from`/`to` are the resolved
range in UTC, `granularity` is the applied bucket size, `ts` is the bucket start as an ISO 8601 UTC string and
every series is dense over the range (a bucket without data holds `0` for counters and `null` for averages; a UTC day
whose `uniqueIdentities` the reconciler has not computed yet holds `null`).

#### Scenario: Dense series

- **GIVEN** `granularity=1h` over a 24 h range with data in only 3 hours
- **WHEN** the series is requested
- **THEN** each series has 24 points and the 21 empty buckets hold `0` (counter) or `null` (average)

### Requirement: Error format and status mapping

Edition: CE. Every error response under `/api` SHALL be JSON `{ error: { code, message, details? } }` with `message` in
English and `code` from the fixed code-to-status table of the "Status table" scenario. Unexpected failures SHALL map to
`INTERNAL_ERROR` without exposing stack traces or internal messages.

#### Scenario: Unexpected failure

- **GIVEN** a repository throws while serving a list
- **WHEN** the response is sent
- **THEN** it is `500` with `{ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }`, the
  original error is logged with the request id and no stack trace is in the body

#### Scenario: Ranked sort over a too wide range

- **WHEN** the client sends `GET /api/v1/egresses?sort=endedAt&from=now-30d&to=now` with the default limit of 7 days
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`

#### Scenario: Status table

- **WHEN** an error response is sent under `/api`
- **THEN** its `code` and HTTP status are one of `VALIDATION_ERROR` 400, `SORT_RANGE_TOO_WIDE` 400, `UNAUTHORIZED` 401,
  `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `PRO_FEATURE` 403, `INVALID_LICENSE` 403, `NOT_FOUND` 404, `CONFLICT` 409,
  `RATE_LIMITED` 429, `INTERNAL_ERROR` 500 and `NOT_READY` 503

### Requirement: Input validation

Edition: CE. Every path parameter, query string and JSON body SHALL be validated against a declared schema
before any handler runs; a failure SHALL produce `400` `VALIDATION_ERROR` with
`details.issues: [{ path: string[], message }]` listing every issue; unknown JSON body properties SHALL be
rejected while unknown query parameters SHALL be ignored; JSON bodies above 1 MB SHALL be rejected with `400`.

#### Scenario: Several issues reported together

- **WHEN** the client sends `?limit=500&order=sideways`
- **THEN** the response is `400` and `details.issues` contains one entry for `["limit"]` and one for `["order"]`

#### Scenario: Unknown query parameter

- **WHEN** the client sends `?foo=bar` to a list endpoint
- **THEN** the parameter is ignored and the request succeeds

### Requirement: Request correlation

Edition: CE. Every response SHALL carry an `X-Request-Id` header, reusing the incoming header value when it
matches `^[A-Za-z0-9._-]{1,128}$` and generating a UUID otherwise, and every log line written while serving the
request SHALL include that id.

#### Scenario: Generated id

- **WHEN** a request arrives without `X-Request-Id`
- **THEN** the response carries a generated UUID in `X-Request-Id`

#### Scenario: Propagated id

- **WHEN** a request arrives with `X-Request-Id: caddy-7f3a`
- **THEN** the response carries `X-Request-Id: caddy-7f3a` and the request log lines contain `caddy-7f3a`

### Requirement: OpenAPI document

Edition: CE. The API SHALL expose an OpenAPI 3.1 document generated from the same schemas that validate
requests and responses, covering every `/api/v1` route the edition implements, at `GET /api/v1/docs/openapi.json` with a
browsable page at `GET /api/v1/docs`; both SHALL be served only when `NODE_ENV` is not `production` and answer `404`
otherwise.

#### Scenario: Development mode

- **GIVEN** the server runs with `NODE_ENV=development`
- **WHEN** the client requests `GET /api/v1/docs/openapi.json`
- **THEN** the response is `200` with `openapi: "3.1.0"` and a `paths` entry for every route the edition implements

#### Scenario: Production mode

- **GIVEN** the server runs with `NODE_ENV=production`
- **WHEN** the client requests `GET /api/v1/docs`
- **THEN** the response is `404` with code `NOT_FOUND`

#### Scenario: Locked routes left out

- **GIVEN** the CE server runs with `NODE_ENV=development`
- **WHEN** the client requests `GET /api/v1/docs/openapi.json`
- **THEN** `paths` has no entry for a locked PRO route, such as `/rooms/{sid}` or `/analytics/top`, and no schema of a
  PRO response

### Requirement: Versioning policy

Edition: CE. The API version SHALL be the first path segment after `/api`; additive changes (new endpoints,
optional parameters, response fields or enum values) SHALL stay within `v1`, clients SHALL tolerate unknown
fields and enum values, and a breaking change SHALL be published under the next version while the previous one
keeps working for at least one minor release.

#### Scenario: Additive field

- **WHEN** a release adds a field to the room list item
- **THEN** the path stays `/api/v1/rooms` and the UI of the previous release keeps working against it

#### Scenario: Unknown version

- **WHEN** the client requests `GET /api/v2/rooms` before `v2` exists
- **THEN** the response is `404` with code `NOT_FOUND`

### Requirement: Legacy health check

Edition: CE. `GET /api/healthcheck` SHALL answer `200` `{ status: 'ok' }` without authentication and without
touching MongoDB, as the image health check and the health checks of the OpenVidu 3.9 deployments expect.

#### Scenario: MongoDB down

- **GIVEN** MongoDB is unreachable
- **WHEN** the client requests `GET /api/healthcheck`
- **THEN** the response is still `200`

### Requirement: Liveness probe

Edition: CE. `GET /api/v1/health` SHALL answer `200` `{ status: 'ok', version }` without authentication and
without touching MongoDB, where `version` is the dashboard version.

#### Scenario: Liveness

- **WHEN** the client requests `GET /api/v1/health`
- **THEN** the response is `200` with `status: "ok"` and the dashboard version

### Requirement: Readiness probe

Edition: CE. `GET /api/v1/ready` SHALL answer `200` `{ status: 'ready', checks: { mongo: 'ok', schema } }`
without authentication when a MongoDB ping succeeds within 2 s and the writer schema status (as computed by the
writer schema gate: `ok`, `newer`, `uninitialized`, `older`) is not `older`, and SHALL answer `503` with code
`NOT_READY` and `details.checks` when the ping fails or the status is `older`.

#### Scenario: Ready

- **GIVEN** MongoDB answers the ping and `schema_meta` holds a compatible version
- **WHEN** the client requests `GET /api/v1/ready`
- **THEN** the response is `200` with `checks: { mongo: 'ok', schema: 'ok' }`

#### Scenario: Writer not started yet

- **GIVEN** MongoDB answers the ping and `schema_meta` has no schema document
- **WHEN** the client requests `GET /api/v1/ready`
- **THEN** the response is `200` with `checks: { mongo: 'ok', schema: 'uninitialized' }`

#### Scenario: Newer writer

- **GIVEN** `schema_meta` records a schema version higher than the dashboard's
- **WHEN** the client requests `GET /api/v1/ready`
- **THEN** the response is `200` with `checks: { mongo: 'ok', schema: 'newer' }`

#### Scenario: Writer downgraded below the minimum

- **GIVEN** `schema_meta` records a schema version lower than the dashboard's minimum
- **WHEN** the client requests `GET /api/v1/ready`
- **THEN** the response is `503` with code `NOT_READY` and `details.checks: { mongo: 'ok', schema: 'older' }`

#### Scenario: MongoDB unreachable

- **GIVEN** the ping does not answer within 2 s
- **WHEN** the client requests `GET /api/v1/ready`
- **THEN** the response is `503` with code `NOT_READY` and `details.checks.mongo` equal to `"error"`

### Requirement: SPA serving

Edition: CE. Every `GET` or `HEAD` request outside `/api` SHALL be answered without authentication with the matching
file of the built SPA or, when no file matches, with the SPA `index.html` and status `200`, so that `HEAD /`, client
routes and the unstripped `/dashboard/api/healthcheck` of the HA proxy health check answer `200`.

#### Scenario: Ready check

- **WHEN** the client sends `HEAD /`
- **THEN** the response is `200`

#### Scenario: Client route

- **WHEN** the client requests `GET /rooms/RM_abc`
- **THEN** the response is `200` with the SPA `index.html`

#### Scenario: Unstripped prefix

- **GIVEN** a proxy health check that requests `/dashboard/api/healthcheck` without stripping `/dashboard`
- **WHEN** the request reaches the dashboard
- **THEN** the response is `200` with the SPA `index.html`

### Requirement: Range on the start field

Edition: CE. A list endpoint with a time range SHALL apply `from` and `to` to the list's start field whatever the sort
key and order: `createdAt` for rooms, `joinedAt` for participants and agents, `startedAt` for egresses. Ingresses apply
the activity range that `ingress-api` declares, one of whose branches is the creation time.

#### Scenario: End-time sort keeps the creation range

- **GIVEN** a room created 3 days ago that ended 2 hours ago
- **WHEN** the client sends `GET /api/v1/rooms?sort=endedAt&from=now-24h&to=now`
- **THEN** the room is not in `items`, because its `createdAt` is outside the range

#### Scenario: Duration sort of participants

- **GIVEN** a session joined 30 hours ago that left 1 hour ago
- **WHEN** the client sends `GET /api/v1/participants?sort=duration&from=now-24h&to=now`
- **THEN** the session is not in `items`

### Requirement: Ranked sort keys

Edition: CE. A sort key that a resource spec declares as ranked SHALL order the items that match the range and the
filters by the resource's rank expression evaluated at the list's `asOf`, with `_id` as tie-breaker in the same
direction. The items SHALL be ranked in memory after a scan of the list's range index, so the documents examined never
exceed the documents matching the range.

#### Scenario: Rooms by duration with a running room

- **GIVEN** three rooms created in range: one closed after 40 minutes, one closed after 10 minutes and one active,
  created 25 minutes before `asOf`
- **WHEN** the client sends `GET /api/v1/rooms?sort=duration&order=desc`
- **THEN** `items` holds the 40-minute room, the active room and the 10-minute room, in that order

#### Scenario: Ascending order

- **WHEN** the same request is sent with `order=asc`
- **THEN** `items` holds the 10-minute room, the active room and the 40-minute room, in that order

#### Scenario: Ranking backed by the range index

- **GIVEN** a database generated at scenario M
- **WHEN** a ranked list request over a 7-day range is explained
- **THEN** the plan scans the list's range index, contains no `COLLSCAN`, and `totalDocsExamined` is at most the number
  of documents matching the range

### Requirement: Ranked sort reference time

Edition: CE. A ranked list SHALL take `asOf` from the request time of its first page and carry it in every cursor it
issues; a request with a cursor SHALL evaluate the rank at the cursor's `asOf`, so a running entity keeps one rank
across pages and no item repeats or goes missing while its live value grows.

#### Scenario: Running room across pages

- **GIVEN** 30 rooms in range, one of them active, and the first page of `sort=duration&limit=25` requested at
  12:00:00
- **WHEN** the client requests the page at `nextCursor` at 12:05:00
- **THEN** the second page ranks the active room by its duration at 12:00:00, and the two pages together hold the 30
  rooms with no gaps or duplicates

#### Scenario: First page

- **WHEN** a ranked list is requested without `cursor` at 12:00:00
- **THEN** every running entity of the page is ranked by its live value at 12:00:00, and the cursors of the response
  carry 12:00:00 as `asOf`

### Requirement: Ranked sort range limit

Edition: CE. A ranked sort key other than the ingresses' `createdAt` SHALL be accepted only when the resolved range is
no longer than the resource's limit: `DASHBOARD_LIST_TOTAL_MAX_RANGE` for rooms, egresses and ingresses; for
participants and agents the smaller of 24 h and that value, or any range when `room` is set. A wider request SHALL
answer `400` with code `SORT_RANGE_TOO_WIDE`; an exact-ID search ignores the sort and is never refused.

#### Scenario: Rooms over 30 days

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client sends `GET /api/v1/rooms?sort=duration&from=now-30d&to=now`
- **THEN** the response is `400` with `{ error: { code: 'SORT_RANGE_TOO_WIDE', message } }`

#### Scenario: Rooms over 7 days

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client sends `GET /api/v1/rooms?sort=duration&from=now-7d&to=now`
- **THEN** the response is `200` with the rooms ranked by duration

#### Scenario: Participants over 3 days

- **WHEN** the client sends `GET /api/v1/participants?sort=duration&from=now-3d&to=now`
- **THEN** the response is `400` with code `SORT_RANGE_TOO_WIDE`

#### Scenario: Exact ID with a ranked sort

- **WHEN** the client sends `GET /api/v1/rooms?q=RM_abc&sort=duration&from=now-30d&to=now`
- **THEN** the response is `200` with the room `RM_abc` as the only item

#### Scenario: Participants of one room

- **WHEN** the client sends `GET /api/v1/participants?sort=duration&room=RM_abc&from=now-90d&to=now`
- **THEN** the response is `200` with the sessions of `RM_abc` joined in the range, ranked by duration

#### Scenario: Index-backed sort over any range

- **WHEN** the client sends `GET /api/v1/rooms?sort=createdAt&from=now-90d&to=now`
- **THEN** the response is `200`, since `createdAt` is not ranked

### Requirement: Exact-ID search

Edition: CE. When `q` matches the entity ID pattern of the list (`^RM_[A-Za-z0-9]+$` for rooms, `^PA_[A-Za-z0-9]+$`
for participants and agents, `^EG_[A-Za-z0-9]+$` for egresses, `^IN_[A-Za-z0-9]+$` for ingresses), the list SHALL
answer only the entity with that ID, ignoring the range, the other filters and the sort, with both cursors `null` and
`total: 1`, or an empty list with `total: 0` when no entity has that ID.

#### Scenario: ID outside the range and the filters

- **GIVEN** a closed room `RM_ab12cd` created 40 days ago
- **WHEN** the client sends `GET /api/v1/rooms?q=RM_ab12cd&from=now-24h&status=active`
- **THEN** the response is `200` with that single room in `items`, `total: 1` and both cursors `null`

#### Scenario: Unknown ID

- **WHEN** the client sends `GET /api/v1/egresses?q=EG_missing`
- **THEN** the response is `200` with `{ items: [], nextCursor: null, prevCursor: null, total: 0 }`

#### Scenario: Lower-case prefix

- **WHEN** the client sends `GET /api/v1/rooms?q=rm_ab12cd`
- **THEN** the value does not match the ID pattern and is searched as a room name prefix within the range and filters

### Requirement: Stale flag

Edition: CE. Where a resource spec declares the `stale` flag, an `active` room or participant SHALL carry
`stale: true` when its `lastStatsAt` is older than the stale window of `status-api` (`max(90 s, 60 s + I + 15 s)`, I
the status's `writer.batchIntervalMs`, 10 s when absent) at the server's clock when the response is built, and SHALL
omit `stale` otherwise, also when it has no `lastStatsAt`.

#### Scenario: Default interval

- **GIVEN** a writer batch interval of 10 s and an active room whose `lastStatsAt` is 100 s old at the server's clock
- **WHEN** the room is returned
- **THEN** it carries `stale: true`

#### Scenario: Slow writer

- **GIVEN** a writer batch interval of 60 s, whose stale window is 135 s, and an active room whose `lastStatsAt` is
  100 s old
- **WHEN** the room is returned
- **THEN** it has no `stale` property

#### Scenario: Signal-only participant

- **GIVEN** an active participant that never published nor subscribed and has no `lastStatsAt`
- **WHEN** it is returned
- **THEN** it has no `stale` property

#### Scenario: Closed entity

- **GIVEN** a closed room whose `lastStatsAt` is 2 hours old
- **WHEN** it is returned
- **THEN** it has no `stale` property

### Requirement: OpenAPI document metadata

Edition: CE. The OpenAPI document SHALL carry the following:
- an `info.description` of the API conventions;
- `info.license`: Apache 2.0 unless the edition provides another;
- one `servers` entry with the dashboard's public base path;
- a `tags` list with a description per tag, holding only the tags of the listed operations.

#### Scenario: Behind a base path

- **GIVEN** the server runs with `DASHBOARD_BASE_PATH=/dashboard/` and `NODE_ENV=development`
- **WHEN** the client reads the document
- **THEN** `servers[0].url` is `/dashboard`, and the paths start with `/api/v1`

#### Scenario: Conventions described

- **WHEN** the client reads `info.description`
- **THEN** it explains the following:
  - the bearer access token and the refresh cookie;
  - the `from`, `to` and `tz` time expressions;
  - cursor pagination with `limit` and `total`;
  - the `ApiError` envelope;
  - `ETag` and `If-None-Match`;
  - the `X-Request-Id` header;
  - the versioning policy.

#### Scenario: Tags

- **WHEN** the client reads `tags`
- **THEN** every operation's tags are listed there with a description, and no listed tag lacks an operation

### Requirement: OpenAPI operations

Edition: CE. Every operation of the OpenAPI document SHALL have the following:
- a unique `operationId`, a summary and tags;
- a description for every parameter, with comma-separated list parameters as arrays of their allowed values
  (`style: form`, `explode: false`);
- an `If-None-Match` header parameter when it can answer `304`;
- on the auth routes, the refresh cookie as a cookie security scheme, and the `Set-Cookie` header of the responses that
  set or clear it.

#### Scenario: Operation identifiers

- **WHEN** the client reads every operation of the document
- **THEN** each has an `operationId` that no other operation shares, such as `listRooms` for `GET /api/v1/rooms`

#### Scenario: List parameter

- **WHEN** the client reads the `kind` parameter of `GET /api/v1/participants`
- **THEN** it has a description, `style: form`, `explode: false`, and an array schema whose items enumerate the
  participant kinds

#### Scenario: Conditional request

- **WHEN** the client reads `GET /api/v1/overview`
- **THEN** it declares the `If-None-Match` header parameter, the `ETag` header of its `200`, and its `304`

#### Scenario: Refresh cookie

- **WHEN** the client reads `POST /api/v1/auth/refresh`
- **THEN** its security names the refresh cookie scheme (`in: cookie`, `name: ov_dashboard_refresh`), and its `200` and
  `401` declare `Set-Cookie`

### Requirement: OpenAPI error responses

Edition: CE. Every error response an operation can answer SHALL be declared with the `ApiError` schema. This means
`400` only for operations that take parameters or a body, `401` for operations that need or accept a token, and the
route's own errors such as `404`, `429` and `503`. A response that only one edition answers SHALL appear only in that
edition's document.

#### Scenario: Operation without input

- **WHEN** the client reads `GET /api/v1/health`
- **THEN** it declares no `400`

#### Scenario: Error body

- **WHEN** the client reads the `429` of `POST /api/v1/auth/login`
- **THEN** its content is `application/json` with the `ApiError` schema

#### Scenario: Edition-specific error

- **WHEN** the client reads `GET /api/v1/analytics/series` in the CE document
- **THEN** it declares the `403` of a PRO metric, dimension or node scope; and no CE operation declares a `403`
  `PRO_FEATURE` for being a PRO route
