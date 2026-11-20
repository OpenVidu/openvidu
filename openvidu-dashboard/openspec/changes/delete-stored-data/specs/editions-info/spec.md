# Spec Delta

## MODIFIED Requirements

### Requirement: Info endpoint

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL answer `200` with the keys `edition`, `versions`,
`schema`, `migration`, `retention?`, `database`, `storage`, `deletions`, `features`, `limits` and `openapiDocsEnabled`,
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
  holds `state`, `progress?`, `error?` and `legacyRetainedUntil?`, and `limits` holds `rankedSortMaxRangeMs` and
  `participantRankedSortMaxRangeMs`

#### Scenario: Deletions before any deletion

- **GIVEN** no deletion ever ran
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `deletions` is `{}`

### Requirement: Storage and database facts in info

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL include `database` (`version` of the MongoDB server
and `timeseriesSupported`) and `storage`, one entry per analytics collection with `documents`, `storageBytes`,
`indexBytes`, `freeBytes` (space free for new data in the collection and its indexes, 0 when not reported) and
`oldest` (the earliest value of the collection's time field when an index leads with it, and of `firstSeenAt` for
`nodes`), read with `$collStats` and cached for 60 seconds; once a deletion completes, a value read before it, and
from 60 s after it a value read before that moment, SHALL NOT be served.

#### Scenario: Storage per collection

- **GIVEN** a database with 1 200 rooms and 20 000 raw events
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage.rooms.documents` is `1200`, `storage.events.documents` is `20000`, every entry has `storageBytes`,
  `indexBytes` and `freeBytes`, and `database.version` is the server version string

#### Scenario: Oldest per collection

- **GIVEN** a database with documents in every analytics collection
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `oldest` holds the earliest `createdAt` of `rooms` and `ingresses`, `joinedAt` of `participants`,
  `startedAt` of `egresses` and `ingress_sessions`, `ts` of `events`, `bucket` of the 5-minute and hourly rollups and
  of the `global` scope of the daily rollups, and `firstSeenAt` of `nodes`, while `tracks`, `track_subscriptions` and
  `track_stats` have no `oldest`

#### Scenario: Free space after deleting documents

- **GIVEN** an `events` collection of 50 000 documents of which 40 000 are then deleted
- **WHEN** the client requests `GET /api/v1/info` with a valid token after the deletion completes
- **THEN** `storage.events.documents` is `10000`, `storageBytes` has not decreased and `freeBytes` is larger than
  before the deletion

#### Scenario: Storage read again after the release

- **GIVEN** an Events deletion that completed at 10:00:00 and storage figures read and cached at 10:00:20
- **WHEN** the client requests `GET /api/v1/info` at 10:00:50 and again at 10:01:05
- **THEN** the first answer serves the figures cached at 10:00:20 and the second reads `$collStats` again

#### Scenario: Free space of the indexes

- **GIVEN** `$collStats` of `events` reporting `freeStorageSize` 16.0 MB and two indexes with 8.0 MB and 4.8 MB of
  file bytes available for reuse, and of `rooms` reporting `freeStorageSize` 1 MB and an index without that figure
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage.events.freeBytes` is 28.8 MB and `storage.rooms.freeBytes` is 1 MB
