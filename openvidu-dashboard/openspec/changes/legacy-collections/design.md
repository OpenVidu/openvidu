# Design

## Context

See proposal.md, Why. Current state:

- Writer (`openvidu-livekit/openvidu/analytics/`): `analytics.go` renames a legacy `events` to `legacy_events` before
  initializing; `migration.go` records `schema_meta` `_id: "migration"` (`prepareMigration`) when a legacy collection
  exists and runs the migration on one node at a time (`migrator`, Redis lock `analytics-migration-lock`). Its
  `cleanup` phase drops `active_entities` and `last_alive` and records `legacyRetainedUntil`, the latest
  `openvidu_expire_at` of `legacy_events` and `stats`, absent when neither holds a dated document. Nothing ever drops
  `legacy_events` or `stats`. `InitializeAnalytics` builds the migration task only while a migration remains, and
  `Start`/`Stop` run the reconciler, aggregator and migration loops as `task`s.
- The legacy writer gave every document `openvidu_expire_at = write time + expiration` with a TTL index on it, and
  indexed `timestamp.seconds` (events) and `time_stamp.seconds` (stats), numbers of seconds. A rename keeps the
  indexes. The Go driver's `Collection.Drop` ignores `NamespaceNotFound`.
- Dashboard: `InfoService.storageInfo()` (`backend/src/info/info-service.ts`, cached 60 s) iterates the `Collection`
  names of the contract; `migrationInfo()` maps the migration document into `InfoMigration`, whose zod shape
  (`healthFactsShape` in `info-routes.ts`) both `/info` and `/status` use. `legacyRetainedUntil` is already in the
  contract (`SchemaMetaMigration`, `schema_meta.schema.json`) but never leaves the backend.
- UI: `storageClasses()` (`features/settings/storage-classes.ts`) builds the seven class rows from `STORAGE_CLASSES`;
  the Data tab reads the migration from the status poll first, then the info document (`migrationState`), and each
  row expands into `ovd-collection-breakdown`.
- The recorded legacy fixtures of the writer tests (`openvidu/analytics/migration/testdata/legacy/`) carry
  `openvidu_expire_at` between 2026-11-14 09:26 and 10:21 UTC, already past: the TTL monitor of the test MongoDB
  (every 60 s) can delete them in the middle of a migration test.

## Goals / Non-Goals

**Goals:**

- Free the disk space of the legacy collections without ever removing a legacy document that has not expired.
- Show the legacy data, its size and how long it stays on the Data tab, from facts the writer already records.

**Non-Goals:**

- Any deletion triggered from the dashboard; compacting the v2 collections.
- Changing the v2 data contract, the migration phases or `SCHEMA_VERSION`.

## Decisions

### D1. The server checks at startup and every hour, on every node, without a lock

A `legacyRetention` loop (`openvidu/analytics/migration_retention.go`) runs its check at `Start` and then every
`legacyRetentionInterval` (1 h, a field the tests shorten), until it has dropped the collections or finds none. Every
node runs it: the check only reads `schema_meta` until the date passes, and a drop is idempotent (MongoDB answers
`NamespaceNotFound`, which the driver ignores), so two nodes dropping together end in the same state.

`InitializeAnalytics` builds the task only when the migration document exists and `legacy_events` or `stats` exists at
startup; `Start` starts it after the migration task and `Stop` stops it first, like the other tasks. A pending,
running or failed migration keeps the loop waiting: the next check after it completes on any node goes on.

Rejected: checking at startup only (a server that runs for months never frees the space); a timer set to
`legacyRetainedUntil` (more state for no gain, and D3 can move the date); running it inside the reconciler or
aggregator loop (unrelated jobs, and the reconciler can be disabled); a Redis lock (nothing to serialise).

### D2. A collection named `stats` is legacy only with a completed migration document

The check drops nothing unless `schema_meta` `_id: "migration"` exists with `state: "completed"`. The writer records
that document at startup whenever `stats` exists, so a `stats` collection is migrated before it can be dropped; one
created later, on a database without a migration, is never touched (the task is not even started, and a check that
finds no migration document returns).

### D3. The latest expiry is read again before dropping

Once `legacyRetainedUntil` has passed (or is absent), the check reads the latest `openvidu_expire_at` of both
collections through their TTL index (`cleanup`'s query, factored out as `latestLegacyExpiry`). A date later than now
means legacy documents were written after the migration completed, by a node of a previous version that the upgrade
guide says should not run: the check raises `legacyRetainedUntil` to it (`$max`, filtered on `state: "completed"`),
logs the new date and waits. Only with no later expiry does it drop. This keeps "Legacy data kept for rollback" true
without trusting that nothing wrote after the migration, at the cost of two index-backed reads once the date passes.

Rejected: dropping at the recorded date alone (simpler, but loses unexpired documents in a mixed-version cluster).

### D4. A completed migration without `legacyRetainedUntil` drops at the first check

`cleanup` records no date only when neither legacy collection held a document with `openvidu_expire_at`, which the
legacy writer always set: the collections were empty. The first check confirms through D3 that nothing expires later
and drops them.

### D5. Logs, and no new metric or option

- At the first check, while the data is kept: info `analytics: legacy data kept for rollback until <date>` with
  `legacyRetainedUntil`; again whenever D3 moves the date.
- On a drop: info `analytics: legacy data dropped after its rollback window` with `collections` (those this node found
  before dropping) and `legacyRetainedUntil`. A node whose list came back empty logs nothing; two nodes racing may
  both log, which is harmless.
- On an error: warn `analytics: cannot check the legacy data retention, retrying at the next check`.
- Through the loop's `jobLog`, so the tests capture the lines. No metric: the drop happens once in a deployment's
  life. No option: the drop removes only what the TTL has already deleted, and the documentation tells how to drop
  earlier.

### D6. Writer files and conventions

Only fork-owned files under `openvidu/analytics/` change (`analytics.go` wiring, `migration.go` factoring,
`migration_retention.go`, tests), so no `// BEGIN OPENVIDU BLOCK`. Lint as CI does with the Go toolchain of the
`Dockerfile`: `GOTOOLCHAIN=go$(.github/scripts/go-version.sh Dockerfile) go run
github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0 run --build-tags integration ./openvidu/...`. `go test
./test/` (Redis on localhost:6379) runs only if code outside `openvidu/analytics/` changes. `README-openvidu.md`,
"Legacy data migration": the cleanup bullet and the Rollback paragraph state the window and the drop.
`CHANGELOG-openvidu.md`: the existing unreleased Changed line on `legacy_events` is rewritten, since 3.10 is not
released.

### D7. Legacy collections in `storage`, dated by their legacy index

`typings/src/data-model/collections.ts` exports `LegacyCollection` (`EVENTS: 'legacy_events'`, `STATS: 'stats'`) and
its type, outside `Collection`: `Collection` is the contract, which the generator, the contract artifacts and the
writer's vendored copy iterate. `storageInfo(withLegacy)` adds the existing legacy collections after the contract ones
when `fullInfo()` found a migration document in the `schema_meta` it already reads (same rule as D2; the 60 s cache
keeps whatever the read found).

`oldestQuery` gains the legacy entries: `{ 'timestamp.seconds': { $type: 'number' } }` sorted ascending, limit 1, and
`time_stamp.seconds` for `stats`, read through `timestamp.seconds_1` and `time_stamp.seconds_1`; the numeric seconds
become an ISO date. The projection of a dotted field returns a nested document, so the reader takes the value by path.

### D8. `migration.legacyRetainedUntil` in the shared migration shape

`InfoMigration.legacyRetainedUntil?: string` (ISO 8601), set by `migrationInfo()` whenever the document has it, and
`legacyRetainedUntil: z.iso.datetime().optional()` in `healthFactsShape.migration`, so `/status` carries it too
(`status-api` already states the same shape and sources as `/info`). No new route, parameter or index.

OpenAPI shape (additive):

- `InfoResponse.migration` and `StatusResponse.migration`: `+ legacyRetainedUntil?: string (date-time)`.
- `InfoResponse.storage`: keys `legacy_events` and `stats` with the existing entry shape
  (`documents`, `storageBytes`, `indexBytes`, `oldest?`).

### D9. The Legacy data row

- Label "Legacy data (before 3.10)": the legacy writer wrote this data in every release before 3.10, not only 3.9, and
  the version ties it to the upgrade that left it. Rejected: "Legacy data (3.9)", which reads as data of that single
  release.
- `storageClasses(storage, retention, readAt, legacy)` appends the row after Daily rollups when `storage` holds a
  legacy entry, `legacy` being `{ migration, tz }`; the Total sums it like any row. `StorageCollectionEntry.collection`
  widens to `Collection | LegacyCollection`. The row has `tip: null`.
- Retention, from the `MigrationState` the dashboard reads (`pending`, `running`, `completed`, `failed`):
  - `running`: "In use by the migration".
  - `completed`: "Kept until <yyyy-MM-dd> for rollback" when `legacyRetainedUntil` is later than `readAt`, else "Being
    removed by the server". The date is that of the session zone (`formatTimestamp` cut to the date). Comparing with
    `readAt`, as the retention spans do, keeps the cell stable between reads.
  - Any other state: "Kept until the migration completes". That is `pending`, which a migration disabled by
    `openvidu.analytics.migration.enabled: false` keeps, and `failed`; the server keeps the legacy data in both (D2).
    `none` falls here too, although the backend reports no legacy entry without a migration document (D7).
- The migration comes from `migrationState()`, the status poll first, so the row follows a migration that completes
  while the tab is open; the storage figures stay those of the info document.
- The breakdown reuses `ovd-collection-breakdown`: the legacy collections are dated (D7), so `UNDATED` is unchanged.
- The Retention cell of this row may wrap (`white-space: normal` on a class of that cell), so its text stays inside a
  375 px viewport like the wrapping class names.

### D10. Test data: inline seeds, a mock option and a generator option

- Unit and backend integration tests seed the legacy collections inline (a few documents, the legacy indexes,
  `openvidu_expire_at` in the future).
- `e2e/fixtures/api.ts` exports `legacyStorage(now)` and the mock gains an `ApiOptions.legacy` flag that adds the
  two entries and a completed migration with `legacyRetainedUntil` 20 days ahead; tests without it are unchanged.
- The data generator gains `GenerateOptions.legacy` (`--legacy`): `legacy_events` and `stats` with the legacy indexes
  (`timestamp.seconds`, `time_stamp.seconds`, TTL on `openvidu_expire_at`), 50 events and 150 stats per hour over the
  48 hours before the generated range (legacy-shaped minimal documents: `type`, `timestamp`/`time_stamp` in seconds,
  room and participant ids), each expiring 32 days after it was written, and a completed `migration` document
  (`finishedAt` one hour into the range, `legacyRetainedUntil` the latest expiry, counts of the documents). It draws
  nothing from the seeded stream, so every other document of a seed stays the same. The query plan test of the info
  oldest dates uses it; `tools/demo-lib.sh` passes `--legacy` with `DASHBOARD_DEMO_LEGACY=true`, so the owner can see
  the row on the demo.

### D11. Writer test seed with live expiries

`legacyData.seed` rewrites `openvidu_expire_at` of every seeded legacy document to now + 32 days, and
`legacyFixerClose` uses the same, so the TTL monitor never deletes a fixture during a test. The retention tests write
their own documents with the expiries their scenarios need.

### D12. Documentation command

`db.stats` in `mongosh` is the Database method `db.stats()`, so `db.stats.drop()` fails; the page uses
`db.getCollection("legacy_events").drop()` and `db.getCollection("stats").drop()` on the analytics database (`openvidu`
unless `openvidu.analytics.database` says otherwise), only once the migration has completed (the Data tab reads "Kept
until <date> for rollback" or "Being removed by the server"), and says the drop frees the disk at once. The docs group verifies the full command (container, port,
credentials) against the installer templates of openvidu-deployment before writing it.

## Data model

- No change to the contract: collections, validators, indexes and `SCHEMA_VERSION` (1) stay; nothing is vendored.
- `schema_meta` `_id: "migration"`: `legacyRetainedUntil` (date, optional, existing) may be raised by D3 after the
  migration completed.
- Legacy collections, outside the contract: `legacy_events` and `stats`, read for `$collStats` and their oldest date
  (indexes `timestamp.seconds_1` and `time_stamp.seconds_1`), and for their latest expiry (TTL index
  `openvidu_expire_at_1`); dropped by D1. Retention: the legacy TTL, then the drop.
- Migration mapping from legacy events: unchanged.

## Performance budget

- Writer: one `schema_meta` read per node and hour; after the date, two index-backed `findOne` and two drops, once.
- Dashboard: at most two more `$collStats` and two index-backed `find().limit(1)` per info read, under the 60 s cache.
  `info-query-plan.test.ts` explains both oldest queries on generated legacy data: IXSCAN on the legacy index, one
  document examined, no COLLSCAN. No p95 is added: the cost is that of the existing per-collection reads.

## Test strategy

| Scenario | Test file | Level |
| --- | --- | --- |
| Rollback after the migration | `openvidu/analytics/migration_integration_test.go` (`TestMigrationReplay`) | Go integration |
| Rollback window ended, Rollback window ends while running, Rollback window still open, Unfinished migration keeps legacy data, Stats collection without a migration, Legacy documents newer than the date, Completed without a retention date, Nodes dropping together | `openvidu/analytics/migration_integration_test.go` (`TestLegacyRetention`) | Go integration |
| CE with a running writer, Migration in progress, Nested keys, Legacy collections in storage, Stats without a migration in info | `backend/test/integration/api.test.ts` | integration |
| Legacy retention date in the status | `backend/test/integration/status-api.test.ts` | integration |
| (oldest query plans, no scenario) | `backend/test/integration/info-query-plan.test.ts` | integration |
| Legacy row kept for rollback, Legacy row while the migration runs, Legacy row of a pending migration, Legacy row of a failed migration, Legacy row after its date, Deployment without legacy data | `features/settings/storage-classes.spec.ts` and `settings-page.spec.ts` | unit |
| Collections of Legacy data, Legacy row follows the status | `features/settings/settings-page.spec.ts` | unit |
| Legacy row kept for rollback, Legacy row on a phone | `e2e/tests/settings.spec.ts` | e2e |
| Legacy row kept for rollback (axe, both themes) | `e2e/tests/accessibility.spec.ts` | e2e |

## Risks / Trade-offs

- [A node of a previous version keeps writing legacy documents after the upgrade] → D3 moves the date instead of
  dropping them.
- [The server is stopped when the date passes] → the next start drops; the row reads "Being removed by the server"
  until then.
- [Up to an hour between the date and the drop] → the TTL has already emptied the collections; only their space waits.
- [The 60 s storage cache shows the row for up to a minute after the drop] → accepted, as for every storage figure.
- [An operator drops the collections by hand during a migration] → the documentation allows it only once the migration
  has completed.

## Migration Plan

Writer first: implemented and committed in openvidu-livekit, pushed by the orchestrator before the dashboard (the
dashboard does not depend on it: the contract is unchanged), then `./dashboard.sh contract-check`. A writer without
this change leaves the collections in place, and a dashboard without it ignores them: either can ship alone.
Rollback of the change: revert the writer commit; dropped legacy collections cannot come back, which is why the drop
waits for their last expiry.
