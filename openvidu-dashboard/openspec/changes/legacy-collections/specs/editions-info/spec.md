## MODIFIED Requirements

### Requirement: Info endpoint

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL answer `200` with the keys `edition`, `versions`,
`schema`, `migration`, `retention?`, `database`, `storage`, `features`, `limits` and `openapiDocsEnabled`, where
`schema.status` is the writer schema gate's `ok`, `newer`, `older` or `uninitialized` and `openapiDocsEnabled` tells
whether the docs routes are served.

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
  holds `state`, `progress?`, `error?` and `legacyRetainedUntil?`, and `limits` holds `rankedSortMaxRangeMs` and
  `participantRankedSortMaxRangeMs`

## ADDED Requirements

### Requirement: Legacy data in info

Edition: CE. While `schema_meta` holds a `migration` document, `storage` SHALL also report each legacy collection that
exists, `legacy_events` and `stats`, with `oldest` from its earliest `timestamp.seconds` or `time_stamp.seconds` read
through the legacy index; without that document neither SHALL be reported. `migration.legacyRetainedUntil` SHALL carry
the writer's `legacyRetainedUntil` when it is recorded, in `GET /api/v1/info` and in `GET /api/v1/status`.

#### Scenario: Legacy collections in storage

- **GIVEN** a completed migration with `legacyRetainedUntil` `2026-12-15T08:00:00Z`, `legacy_events` with 3 documents
  whose earliest `timestamp.seconds` is 1791883555 and `stats` with 2 documents
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage.legacy_events` has `documents: 3`, `storageBytes`, `indexBytes` and
  `oldest: "2026-10-13T09:25:55.000Z"`, `storage.stats` has `documents: 2`, and `migration.legacyRetainedUntil` is
  `"2026-12-15T08:00:00.000Z"`

#### Scenario: Legacy retention date in the status

- **GIVEN** a completed migration with `legacyRetainedUntil` `2026-12-15T08:00:00Z`
- **WHEN** the client requests `GET /api/v1/status` with a valid token
- **THEN** `migration.legacyRetainedUntil` is `"2026-12-15T08:00:00.000Z"`

#### Scenario: Stats without a migration in info

- **GIVEN** no `migration` document and a `stats` collection with documents
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage` has no `stats` entry and `migration` is `{ state: "none" }`
