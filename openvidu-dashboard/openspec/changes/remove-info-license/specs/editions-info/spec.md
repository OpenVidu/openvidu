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
  holds `state`, `progress?` and `error?`, and `limits` holds `rankedSortMaxRangeMs` and
  `participantRankedSortMaxRangeMs`

### Requirement: Feature catalogue

Edition: CE. `features` SHALL be an array of `FeatureKey` identifiers from a shared enumeration (`room-detail`,
`participant-detail`, `egress-detail`, `ingress-detail`, `analytics-quality`, `analytics-diagnostics`,
`analytics-top-rooms`, `track-detail`, `per-node-breakdown`), empty on CE; every PRO feature has its identifier in it.

#### Scenario: CE feature list

- **WHEN** the CE dashboard answers `GET /api/v1/info`
- **THEN** `features` is `[]`

#### Scenario: Unknown identifier tolerated

- **GIVEN** a PRO backend newer than the UI reports a feature the UI does not know
- **WHEN** the UI reads `features`
- **THEN** it ignores the unknown identifier and keeps working

## ADDED Requirements

### Requirement: Migration outcome in info

Edition: CE. `migration.progress` SHALL carry `processed`, `total`, `startedAt?` and `finishedAt?`, and `migration.error`
SHALL carry the reason of a `failed` migration.

#### Scenario: Failed migration

- **GIVEN** the writer's migration document has `state: 'failed'`, `finishedAt` and `error: 'legacy event without a room'`
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `migration` has `state: "failed"`, `progress.finishedAt` and `error: "legacy event without a room"`

## REMOVED Requirements

### Requirement: Migration outcome and license in info

**Reason**: Info no longer reports a license; the migration outcome moves to "Migration outcome in info".

**Migration**: None. The `license` key never shipped in a release.
