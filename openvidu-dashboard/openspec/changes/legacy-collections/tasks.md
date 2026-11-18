# Tasks

Paths are relative to `dashboard-ce/` unless they start with `openvidu/analytics/` or name a file at the root of the
writer checkout (`openvidu-livekit`, branch `openvidu/main`). `settings/` is
`frontend/projects/dashboard-ui/src/lib/features/settings/`. A test covers a scenario when its title is the scenario
name, alone or followed by `: <detail>`; a test that exists under another title is retitled, not duplicated. Decisions
(D1 to D12) are those of `design.md`.

## 1. Writer (openvidu-livekit): legacy data dropped after its rollback window (implementer)

Done in the writer checkout and committed there, not pushed (group 9). It comes first because
`./dashboard.sh scenarios` counts these tests from group 7 on.

- [x] 1.1 Test seed with live expiries (D11): in `openvidu/analytics/migration_integration_test.go`, `legacyData.seed`
      writes every legacy document with `openvidu_expire_at` set to now + 32 days, and `legacyFixerClose` uses the
      same date. Commit it apart (tests only). Verify:
      `go test -tags integration -count=1 -run '^TestMigration' ./openvidu/analytics/` passes (Docker) with the
      existing assertions unchanged.
- [x] 1.2 In `openvidu/analytics/migration.go`, factor the latest-expiry query of `cleanup` into
      `latestLegacyExpiry(ctx, db) (*time.Time, error)`, used by `cleanup`. Verify: `recorded snapshot with fixer
      closures` still finds `legacyRetainedUntil` set.
- [x] 1.3 Add `openvidu/analytics/migration_retention.go` (D1 to D5): `legacyRetention` with `db`, `log` (`jobLog`),
      `now` and `interval` (`legacyRetentionInterval`, 1 h), its `check(ctx) (done bool, err error)` (no completed
      migration: wait, or done without a migration document; date ahead: log it once and wait; date passed or absent:
      `latestLegacyExpiry`, a later expiry raised with `$max` on a `completed` document and logged, else drop the
      existing legacy collections and log them) and `loop(ctx)` (check now, then every `interval`, until done; a
      failed check logs the warning and waits). `newLegacyRetentionTask(ctx, db)` returns `nil` unless the migration
      document and `legacy_events` or `stats` exist; in `analytics.go` keep it in a package variable set by
      `InitializeAnalytics`, start it in `Start` after the migration task and stop it first in `Stop`. Verify: task
      1.4 and `go vet ./openvidu/analytics/...`.
- [x] 1.4 In `openvidu/analytics/migration_integration_test.go`, add `TestLegacyRetention` with one subtest per
      scenario, on databases seeded with legacy collections (legacy indexes, their own `openvidu_expire_at`), a
      migration document, a fixed `now` and a short `interval`:
      `Rollback window ended` (built through `newLegacyRetentionTask`, as at startup; the `migration` document compared
      before and after; one info line with both names), `Rollback window ends while running` (the date passes between
      two checks of a running loop), `Rollback window still open` (documents and the three legacy indexes kept; one
      info line with the date after several checks), `Unfinished migration keeps legacy data` (`pending` with the
      migration disabled), `Stats collection without a migration` (no task at startup and a check that returns
      without dropping a `stats` created afterwards), `Legacy documents newer than the date` (`legacyRetainedUntil`
      raised to the later expiry, nothing dropped), `Completed without a retention date` and
      `Nodes dropping together` (two `legacyRetention` checks started together; both collections gone, no error).
      Covers: those eight scenarios. Verify:
      `go test -tags integration -count=1 -run '^TestLegacyRetention$' ./openvidu/analytics/` passes (Docker).
- [x] 1.5 In `TestMigrationReplay`, add `Rollback after the migration`: after a completed migration of the recorded
      data, drop the v2 collections and `schema_meta` and rename `legacy_events` to `events`; `events` and `stats`
      hold every seeded document, with `timestamp.seconds_1`, `time_stamp.seconds_1` and the TTL index
      `openvidu_expire_at_1`. Covers: Rollback after the migration. Verify: the subtest passes.
- [x] 1.6 In `README-openvidu.md`, "Legacy data migration", state that `legacy_events` and `stats` are kept until
      `legacyRetainedUntil` (raised when a later legacy document exists) and then dropped by the hourly check of every
      node, and that the Rollback paragraph applies until that date; in `CHANGELOG-openvidu.md`, `[Unreleased]`,
      Changed, rewrite the line on the renamed `legacy_events` as the proposal says. Verify: read-through; the
      changelog diff is that one line.
- [x] 1.7 Lint with the toolchain of the `Dockerfile` (D6) and run `go test -count=1 ./openvidu/...` and
      `go test -tags integration -count=1 ./openvidu/analytics/...` (Docker), one at a time; run `go test ./test/`
      with a throwaway Redis only if a file outside `openvidu/analytics/` changed. Commit the feature (1.2 to 1.6) in
      the style of that repository's `git log` (`Analytics: …`, `Analytics tests: …`), without pushing, and give the commits to the
      orchestrator for `operations.md`. Verify: lint and tests pass, and
      `git -C <writer checkout> log --oneline origin/openvidu/main..` lists the commits of 1.1 and 1.7 with a clean
      tree.

## 2. Typings (implementer)

- [x] 2.1 In `typings/src/data-model/collections.ts`, export `LegacyCollection` (`EVENTS: 'legacy_events'`,
      `STATS: 'stats'`) and its type, outside `Collection` (D7); in `typings/src/api/info.ts`, add
      `legacyRetainedUntil?: string` to `InfoMigration` with its doc comment. Verify: `./dashboard.sh typecheck` and
      `pnpm --filter @openvidu-dashboard/typings test` pass, and the contract artifacts are unchanged
      (`git status typings/schema typings/fixtures` is clean).

## 3. Data generator and demo (implementer)

- [x] 3.1 In `tools/data-generator/src/`, add `GenerateOptions.legacy` and the `--legacy` argument (D10): the two
      legacy collections with their indexes, 50 events and 150 stats per hour over the 48 hours before the generated
      range, each expiring 32 days after it was written, and a completed `migration` document whose
      `legacyRetainedUntil` is the latest expiry; nothing drawn from the seeded stream. Verify: task 3.2.
- [x] 3.2 In `backend/test/integration/data-generator.test.ts`, add `generates a legacy history with a completed
      migration`: on scenario S over 1 day, 2,400 `legacy_events` and 7,200 `stats` documents with the indexes
      `timestamp.seconds_1`, `time_stamp.seconds_1` and the TTL `openvidu_expire_at_1`, the `migration` document
      accepted by the `schema_meta` validator with `legacyRetainedUntil` equal to the latest `openvidu_expire_at`,
      and the same document count in every contract collection as without the option, except `schema_meta`, one
      higher (the migration document). Verify: the test passes
      (Docker) and the figures the other tests of the file assert are unchanged.
- [x] 3.3 In `tools/demo-lib.sh`, pass `--legacy` when `DASHBOARD_DEMO_LEGACY=true` and document the variable in its
      header; add the option to `tools/data-generator/README.md` (options table and what it writes) and
      `DASHBOARD_DEMO_LEGACY=true` beside `DASHBOARD_DEMO_KEEP_DATA` in the root `AGENTS.md`. Verify:
      `./dashboard.sh check` passes; the demo runs in group 8.

## 4. Backend (implementer)

- [x] 4.1 In `backend/src/info/info-service.ts`, `migrationInfo()` returns `legacyRetainedUntil` as ISO 8601 when the
      document has it; in `info-routes.ts`, add `legacyRetainedUntil: z.iso.datetime().optional()` to
      `healthFactsShape.migration` (D8). Verify: tasks 4.3 and 4.4, and `backend/test/integration/openapi-document.test.ts`
      passes.
- [x] 4.2 In `info-service.ts`, report the existing legacy collections in `storage` when `fullInfo()` read a migration
      document, and date them through `oldestQuery` from `timestamp.seconds` and `time_stamp.seconds` (D7). Verify:
      tasks 4.3 and 4.5.
- [x] 4.3 In `backend/test/integration/api.test.ts`, retitle `reports a running writer` as `CE with a running writer`;
      split `reports a writer that has not started, a running migration and a failed one` into
      `Writer not started yet`, `Migration in progress: …` and `Failed migration`; add `Nested keys` (a completed
      migration with `legacyRetainedUntil`: the keys of `versions`, `schema`, `migration` and `limits` and no other),
      `Legacy collections in storage` (the legacy collections seeded with their indexes and future expiries) and
      `Stats without a migration in info`. Covers: CE with a running writer, Migration in progress, Nested keys, Legacy
      collections in storage, Stats without a migration in info. Verify: `./dashboard.sh test-integration` passes
      (Docker).
- [x] 4.4 In `backend/test/integration/status-api.test.ts`, add `Legacy retention date in the status`. Covers: Legacy
      retention date in the status. Verify: the integration tests pass.
- [x] 4.5 In `backend/test/integration/info-query-plan.test.ts`, generate with `legacy: true` and add
      `legacy collections read their oldest legacy timestamp through the legacy index`: both queries are index-backed
      on `timestamp.seconds_1` and `time_stamp.seconds_1`, examine one document, have no COLLSCAN and return a number
      that `fullInfo()` reports as a date. Verify: the `integration-plans` project passes.
- [x] 4.6 Add the Data line of the proposal to `CHANGELOG.md` (3.10.0, Added, Data) in the commit of the API change.
      Verify: `./dashboard.sh check` passes.

## 5. Frontend (implementer)

- [x] 5.1 In `settings/storage-classes.ts`, add the Legacy data row after Daily rollups, with its retention text per
      migration state ("In use by the migration", "Kept until the migration completes", "Kept until <date> for
      rollback", "Being removed by the server"), sums, collections and no tip, and widen
      `StorageCollectionEntry.collection` (D9). Verify: task 5.3.
- [x] 5.2 In `settings/data-tab.ts`, pass the latest migration state (`migrationState()`) and the session zone to
      `storageClasses()`; in `data-tab.html` and `data-tab.scss`, let the Retention cell of that row wrap. Verify:
      task 5.3.
- [x] 5.3 In `settings/storage-classes.spec.ts`, add `Legacy row kept for rollback`, `Legacy row while the migration
      runs`, `Legacy row of a pending migration`, `Legacy row of a failed migration`, `Legacy row after its date` (also
      `: without a date`) and `Deployment without legacy data`; in `settings/settings-page.spec.ts`, add `Legacy row
      kept for rollback: no info icon`, `Collections of Legacy data` and `Legacy row follows the status` (the new text
      while the info request it triggers is unanswered). Covers: those eight scenarios. Verify: from `frontend/`,
      `pnpm exec ng test dashboard-ui --watch=false --include=**/settings/*.spec.ts` passes, with the existing tests
      of both files unchanged.
- [x] 5.4 Add the UI line of the proposal to `CHANGELOG.md` (3.10.0, Added, UI, after the Settings line) in the commit
      of the row. Verify: `./dashboard.sh check` passes.

## 6. End-to-end tests (implementer)

- [x] 6.1 In `e2e/fixtures/api.ts`, export `legacyStorage(now)` and add the `ApiOptions.legacy` flag: the two entries
      and a completed migration with `legacyRetainedUntil` 20 days ahead (D10). Verify: the existing e2e suites pass
      unchanged.
- [x] 6.2 In `e2e/tests/settings.spec.ts`, add `Legacy row kept for rollback: …` (the row after Daily rollups with its
      retention, documents and size, no info button, and its two collections once expanded) and, in the phone
      describe, `Legacy row on a phone: …` (the bounding box of the retention cell between 0 and 375 px and the
      document no wider than 375 px). Covers: Legacy row kept for rollback, Legacy row on a phone. Verify:
      `./dashboard.sh e2e` passes.
- [x] 6.3 In `e2e/tests/accessibility.spec.ts`, inside the light and dark loop, add
      `Legacy row kept for rollback: the Data tab passes axe` with the Legacy data collections expanded. Covers: Legacy
      row kept for rollback. Verify: `./dashboard.sh e2e` passes in both themes.

## 7. Checks and refactor review (implementer)

- [x] 7.1 Run `./dashboard.sh scenarios legacy-collections <writer checkout>`. Verify: each of the 24 scenarios lists
      a test and none reads NO TEST; `Migration in progress` lists the test of 4.3 besides the banner tests that share
      its name.
- [x] 7.2 Run `./dashboard.sh check`, `./dashboard.sh test-integration` and `./dashboard.sh e2e`, one at a time.
      Verify: all pass, the e2e with axe and both themes; report any suite that could not run and why.
- [x] 7.3 Refactor review: whether the Legacy data row should be a conditional entry of `STORAGE_CLASSES` rather than
      a row apart, and whether `oldestQuery` should carry a value converter instead of a numeric special case; apply a
      small refactor here or record that none is needed. Verify: the outcome is written in the implementation report.

## 8. Owner review on the demo (owner)

After the full verification and its fixes, before any push.

- [x] 8.1 The orchestrator runs `DASHBOARD_DEMO_LEGACY=true ./dashboard.sh demo ce` (`http://localhost:4200`,
      `admin` / `admin`); the owner reviews `/settings?tab=data`: the Legacy data (before 3.10) row, its retention
      text and date, its collections, both themes and a phone width. Verify: the owner's verdict and any change asked
      are recorded in `operations.md`.

## 9. Writer: contract check and push (orchestrator)

After group 8. The dashboard push follows this group.

- [x] 9.1 Run `./dashboard.sh contract-check <writer checkout>`. Verify: it ends
      with "contract check passed", recorded in `operations.md`.
- [x] 9.2 Push openvidu-livekit `openvidu/main` (the commits of 1.1 and 1.7). Verify: its `Test` workflow run is green
      and recorded in `operations.md`.

## 10. Documentation in openvidu.io (orchestrator)

After the dashboard push and its green CI run, before the archive. In the openvidu.io checkout, branch
`docs/openvidu-dashboard-3.10` (draft PR #160), following that repository's `CLAUDE.md`.

- [ ] 10.1 In `docs/docs/self-hosting/production-ready/observability/openvidu-dashboard.md`, "Analytics data", after
      the migration paragraph: OpenVidu Server keeps the analytics data of the previous version (`legacy_events` and
      `stats`) so that a rollback still has it; it keeps expiring with its own retention (32 days with the installers
      up to 3.9) and, after the date Settings → Data shows, the server removes both collections and frees their disk
      space; to free it earlier when no rollback is wanted, once the migration has completed, drop them with `mongosh`
      on the analytics database (`openvidu` unless `openvidu.analytics.database` says otherwise) with
      `db.getCollection("legacy_events").drop()` and `db.getCollection("stats").drop()` (D12), which frees the disk at
      once. In "Settings", the Data bullet mentions the legacy data while it is kept. Verify: the full command
      (container, port, credentials) matches the installer templates of openvidu-deployment, and the repository's
      validation (`/check-web`) passes; the commit is pushed to the branch and recorded in `operations.md`.

## Workflow follow-up

- Push the dashboard to `master` after group 9, wait for the `openvidu-dashboard-ci.yml` run and record it; then group
  10.
- Archive the change when the Definition of Done holds.
- openvidu-pro-livekit takes the writer commits with its next merge of `openvidu/main`; nothing waits for it.
- The PRO edition of the dashboard takes this change on its own side.
