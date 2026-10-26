# editions-info Specification

## Purpose
Tells the UI and operators which edition is running, which versions and schema are in play, how the migration and
retention stand, and which features are enabled, so that CE shows PRO entries deliberately locked and PRO unlocks
them from the same contract.

## Requirements

### Requirement: Info endpoint

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL answer `200` with the keys `edition`, `versions`,
`schema`, `migration`, `retention?`, `database`, `storage`, `features`, `limits`, `license?` and `openapiDocsEnabled`,
where `schema.status` is the writer schema gate's `ok`, `newer`, `older` or `uninitialized` and `openapiDocsEnabled`
tells whether the docs routes are served.

#### Scenario: CE with a running writer

- **GIVEN** the CE dashboard 3.10.0 expects schema 1 and `schema_meta` records writer schema 1, server 3.10.0, a
  completed migration and the default retention, with the default `DASHBOARD_LIST_TOTAL_MAX_RANGE`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** the response is `200` with `edition: "ce"`, `versions: { dashboard: "3.10.0", server: "3.10.0" }`,
  `schema: { dashboard: 1, writer: 1, status: "ok" }`, `migration.state: "completed"`, `migration.progress.processed`
  and `.total`, `retention: { eventsMs: 604800000, statsMs: 604800000, tracksMs: 604800000,
  entitiesMs: 7776000000, rollups5MinMs: 604800000, rollupsHourlyMs: 34560000000, rollupsDailyMs: null }`,
  `features: []`, `limits: { rankedSortMaxRangeMs: 604800000, participantRankedSortMaxRangeMs: 86400000 }` and
  `openapiDocsEnabled: false`

#### Scenario: Migration in progress

- **GIVEN** the writer's migration document has `state: 'running'`, `processed: 400000` and `total: 1200000`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `migration` is `{ state: "running", progress: { processed: 400000, total: 1200000, startedAt } }`

#### Scenario: Nested keys

- **WHEN** a client with a valid bearer token requests `GET /api/v1/info`
- **THEN** `versions` holds `dashboard` and `server?`, `schema` holds `dashboard`, `writer?` and `status`, `migration`
  holds `state`, `progress?` and `error?`, and `limits` holds `rankedSortMaxRangeMs` and
  `participantRankedSortMaxRangeMs`

### Requirement: Migration outcome and license in info

Edition: CE. `migration.progress` SHALL carry `processed`, `total`, `startedAt?` and `finishedAt?`, and `migration.error`
SHALL carry the reason of a `failed` migration. `license` (`validUntil?`, `maskedKey`) SHALL be reported only by a
licensed PRO deployment; CE never reports it.

#### Scenario: Failed migration

- **GIVEN** the writer's migration document has `state: 'failed'`, `finishedAt` and `error: 'legacy event without a room'`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `migration` has `state: "failed"`, `progress.finishedAt` and `error: "legacy event without a room"`

#### Scenario: No license on CE

- **GIVEN** the CE dashboard
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** the response has no `license` property

### Requirement: Info fields recorded by the writer

Edition: CE. `versions.server`, `schema.writer`, `migration` and `retention` (`eventsMs`, `statsMs`, `tracksMs`,
`entitiesMs`, `rollups5MinMs`, `rollupsHourlyMs` and `rollupsDailyMs` in milliseconds, `rollupsDailyMs` `null` when
unlimited) SHALL be read from `schema_meta` on every call; when the writer has not recorded them, `versions.server`,
`schema.writer` and `retention` SHALL be absent and `migration.state` SHALL be `none`.

#### Scenario: Writer not started yet

- **GIVEN** `schema_meta` has no documents
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** the response is `200` with `versions: { dashboard }` only, `schema: { dashboard: 1, status: "uninitialized" }`,
  `migration: { state: "none" }` and no `retention` property

#### Scenario: Retention recorded later

- **GIVEN** the writer records its retention after the dashboard started
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** the response includes `retention` without a dashboard restart

#### Scenario: Daily rollups with a retention

- **GIVEN** the writer records `rollupsDailyMs: 157680000000`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `retention.rollupsDailyMs` is `157680000000`

### Requirement: Storage and database facts in info

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL include `database` (`version` of the MongoDB server
and `timeseriesSupported`) and `storage`, one entry per analytics collection with `documents`, `storageBytes`,
`indexBytes` and `oldest` (earliest `ts`, `bucket` or `createdAt`, when cheap to obtain), read with `$collStats`
and cached for 60 seconds.

#### Scenario: Storage per collection

- **GIVEN** a database with 1 200 rooms and 20 000 raw events
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage.rooms.documents` is `1200`, `storage.events.documents` is `20000`, every entry has `storageBytes`
  and `indexBytes`, and `database.version` is the server version string

### Requirement: Public subset of info

Edition: CE. Without an `Authorization` header `GET /api/v1/info` SHALL answer `200` with only
`{ edition, versions: { dashboard } }`, so the login page can show them; a request carrying an invalid or expired
token SHALL answer `401` like any protected route, so that the UI refreshes its session instead of reading the
subset.

#### Scenario: No token

- **WHEN** the client requests `GET /api/v1/info` without an `Authorization` header
- **THEN** the response is `200` with exactly the keys `edition` and `versions.dashboard`

#### Scenario: Expired token

- **WHEN** the client requests `GET /api/v1/info` with an expired token
- **THEN** the response is `401` with code `UNAUTHORIZED` and `details.reason: "expired"`

### Requirement: Feature catalogue

Edition: CE. `features` SHALL be an array of `FeatureKey` identifiers from a shared enumeration (`room-detail`,
`participant-detail`, `egress-detail`, `ingress-detail`, `analytics-quality`, `analytics-diagnostics`,
`analytics-top-rooms`, `track-detail`, `per-node-breakdown`, `license-info`), empty on CE; every PRO feature has its
identifier in it.

#### Scenario: CE feature list

- **WHEN** the CE dashboard answers `GET /api/v1/info`
- **THEN** `features` is `[]`

#### Scenario: Unknown identifier tolerated

- **GIVEN** a PRO backend newer than the UI reports a feature the UI does not know
- **WHEN** the UI reads `features`
- **THEN** it ignores the unknown identifier and keeps working

### Requirement: CE performs no license check

Edition: CE. The CE dashboard SHALL ignore every `OPENVIDU_PRO_*` variable and SHALL make no licensing request.

#### Scenario: CE with an invalid license variable

- **GIVEN** a CE container with `OPENVIDU_PRO_LICENSE=invalid`
- **WHEN** it starts
- **THEN** it listens normally and no licensing request is made

### Requirement: PRO-only routes on CE

Edition: CE. Every route that the PRO edition adds SHALL be known to the CE route registry with its feature
identifier, and CE SHALL answer requests to such a route with `403` `PRO_FEATURE` and `details.feature` set to that
identifier, after authentication, so that a direct API call never falls through to a `404` or to the SPA fallback.

#### Scenario: Room detail on CE

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/rooms/RM_abc`
- **THEN** the response is `403` with `{ error: { code: 'PRO_FEATURE', message, details: { feature: 'room-detail' } } }`

#### Scenario: Unauthenticated call to a PRO route

- **WHEN** the client requests `GET /api/v1/rooms/RM_abc` without a token on CE
- **THEN** the response is `401`, not `403`

#### Scenario: Locked routes of each feature

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client sends `GET` to one of these routes under `/api/v1`
- **THEN** the response is `403` `PRO_FEATURE` with `details.feature`:
  - `room-detail`: `/rooms/{sid}`, `/rooms/{sid}/participants`, `/rooms/{sid}/egresses`,
    `/rooms/{sid}/ingress-sessions`, `/rooms/{sid}/events` and `/rooms/{sid}/series`
  - `participant-detail`: `/participants/{sid}`, `/participants/{sid}/sessions`, `/participants/{sid}/tracks`,
    `/participants/{sid}/subscriptions`, `/participants/{sid}/events` and `/participants/{sid}/series`
  - `track-detail`: `/tracks/{sid}`, `/tracks/{sid}/subscriptions` and `/tracks/{sid}/series`
  - `egress-detail`: `/egresses/{id}` and `/egresses/{id}/events`
  - `ingress-detail`: `/ingresses/{id}`, `/ingresses/{id}/sessions` and `/ingresses/{id}/events`
  - `analytics-top-rooms`: `/analytics/top`
  - `per-node-breakdown`: `/analytics/scopes`

#### Scenario: Literal routes keep precedence

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/rooms/summary`
- **THEN** the rooms summary answers `200`, not the locked `/rooms/{sid}` route

### Requirement: UI locks from features

Edition: CE. The UI SHALL decide the locked state of PRO routes and sections from the `features` of the
authenticated `GET /api/v1/info`, reloaded after every login, against the `feature` declared in the page metadata of
a route and on each gated section; the locked presentation SHALL be rendered without calling the PRO endpoint and
SHALL never depend on receiving a `403`. Lock visuals and the handling of a stray `403` belong to the UI shell.

#### Scenario: Locked route on CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the user opens `/rooms/RM_abc`
- **THEN** the locked presentation is rendered and no request is sent to `GET api/v1/rooms/RM_abc`

#### Scenario: Features reloaded after login

- **GIVEN** the UI loaded the public subset before login
- **WHEN** the login succeeds
- **THEN** the UI requests `GET /api/v1/info` with the bearer before rendering any gated route

#### Scenario: Info unavailable

- **GIVEN** the authenticated `GET /api/v1/info` fails
- **WHEN** the UI renders
- **THEN** every PRO feature is treated as locked until a retry succeeds

### Requirement: Edition and version before login

Edition: CE. The login page SHALL show the edition and dashboard version read from the public subset of
`GET /api/v1/info`, and SHALL render without them when that request fails.

#### Scenario: Login page footer

- **WHEN** the login page renders on the CE dashboard 3.10.0 before any authentication
- **THEN** it requests `GET /api/v1/info` without a token and shows `CE · 3.10.0`

### Requirement: Ranked sort limits in info

Edition: CE. `limits` SHALL carry `rankedSortMaxRangeMs`, the value of `DASHBOARD_LIST_TOTAL_MAX_RANGE` in
milliseconds, and `participantRankedSortMaxRangeMs`, the smaller of 24 h and that value: the widest resolved range
on which the lists accept a metric sort, so that the UI disables those sort headers beyond it without a request.

#### Scenario: Default limits

- **GIVEN** the default `DASHBOARD_LIST_TOTAL_MAX_RANGE` of 7 days
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `limits` is `{ rankedSortMaxRangeMs: 604800000, participantRankedSortMaxRangeMs: 86400000 }`

#### Scenario: Configured range below a day

- **GIVEN** `DASHBOARD_LIST_TOTAL_MAX_RANGE=12h`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `limits` is `{ rankedSortMaxRangeMs: 43200000, participantRankedSortMaxRangeMs: 43200000 }`

#### Scenario: Limits are not public

- **WHEN** the client requests `GET /api/v1/info` without an `Authorization` header
- **THEN** the response has no `limits` property

### Requirement: Edition fixed at build time

Edition: CE. The edition SHALL be determined by the package that is built, never by a runtime variable.

#### Scenario: Runtime variable cannot select PRO

- **GIVEN** a CE container started with `OPENVIDU_EDITION=PRO`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** the response has `edition: "ce"` and `features: []`
