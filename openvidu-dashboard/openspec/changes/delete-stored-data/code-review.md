# Code review: delete-stored-data

- Date: 2026-11-20
- Reviewed commit: `f0e2158846825bf7bb6673c8e900754f7db72882` (local `master`, 44 commits ahead of `origin/master`, clean
  working tree)
- Scope: every file in `git diff origin/master`: backend `deletions/` slice, info/status/startup wiring, typings,
  dashboard-ui (confirm dialog, info tip, Data tab, banner, status poll, refresh scheduler), e2e and the tests. The
  workspace suites were not run; the e2e tests were reviewed by reading them.

Summary: 1 CRITICAL, 2 WARNING, 4 SUGGESTION.

## CRITICAL

### C1. After the entities retention is shortened, every deletion keeps weeks of ended rooms and egresses with all their data

- `dashboard-ce/backend/src/deletions/deletion-runner.ts:75`, `:87-95` (`planContext`). Applied through the filters
  in `dashboard-ce/backend/src/deletions/deletion-plan.ts:164-200`.
- The kept set "rooms that ended in the grace window" is read as `rooms.expiresAt >= T + retention.entities`, with the
  *current* retention and no condition on `endedAt`. Egresses are read the same way. A room closed at `E` under an
  earlier retention `R_old` has `expiresAt = E + R_old`, which the data contract keeps when the retention changes
  (data-model "Entities retention change"). The room is then kept whenever `E >= T - (R_old - R_new)`, not only when
  `E >= T`.
- Triggering case: `retention.entities` goes from 90 d to 30 d (a documented setting), and some days later the admin
  runs Entities, Events, Stats, Tracks or Total. Every room and egress closed in the 60 days before the change that
  still exists lands in `kept.rooms` or `kept.egresses`. Each class filter excludes `roomSid` (or `egressId`, or
  `_id`) in those sets, so those rooms, sessions, egresses, tracks, subscriptions, events and stats all survive. The
  job still ends `completed` and stamps `deletions.<class>.completed` with `endedBefore = cutoff - 5 min`, which says
  that everything that ended earlier is gone. The Data tab shows "Deleted <date>", and the later PRO notice built on
  `endedBefore` would call rooms deleted that still exist. The `$nin` arrays also grow to thousands of ids, and every
  batch query carries them.
- The design's Risks section (design.md:365-368) accepts only a retention change made inside the same 5 minutes. The
  case above is not covered: the error reaches back as far as the difference between the two retentions. No test
  changes the retention (`deletion-world.ts` uses a single `WORLD_RETENTION_MS`).
- Fix: keep the index-backed candidate read through `expiresAt_ttl`, and add the end time as a residual predicate:
  `{ expiresAt: { $gte: T + R }, endedAt: { $gte: T } }` for rooms, and for egresses `endedAt >= T`, or `updatedAt >= T`
  when there is no `endedAt`. Then add a rules test that writes a room closed long ago with a longer `expiresAt` and
  checks that Entities deletes it.

## WARNING

### W1. The completion toast also shows on the Preferences tab, where Data is not open

- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/settings/data-tab.ts:282-300`
- `<mat-tab>` creates projected content eagerly, so `DataTab` exists whenever Settings is open, even on Preferences
  (design.md:250-252 notes that the component outlives tab switches). The toast effect does not check `active()`.
- Triggering case: a session opens Settings on Preferences (the default tab) while a deletion runs, for example
  through the banner, and stays there. `watching` takes the job id, and when the status reports `completed` the toast
  "Events deleted: …" shows on Preferences. The owner decision is "Toast at the end in sessions with Data open", and
  the scenario "Deletion completed while watching" names Data showing the job.
- Fix: set `watching` only while `active()` is true, or clear it when the tab becomes inactive. Add a unit test of the
  toast on the Preferences tab.

### W2. The plan test of time-series stats batches lets each batch read every bucket

- `dashboard-ce/backend/test/integration/deletions-query-plan.test.ts:106-111`
- The by-time batch query (`find(filter).sort({ ts: 1 }).skip(4999).limit(1)`, `deletion-runner.ts:55-60`) is checked
  with `maxDocsExamined: buckets` (the whole buckets collection) and `collection scan == false` only. The design budget
  is "totalDocsExamined bounded by the batch plus the kept documents met" (design.md:320-323), and this assertion does
  not enforce it. If the server does not use a bounded sort here and unpacks every matching measurement for its top-k
  sort, every batch reads all deletable stats, and the job costs O(N^2 / 5,000), yet the test still passes. The
  matching `deleteMany(filter + ts <= bound)` is never explained.
- Fix: bound `totalDocsExamined` (buckets examined) by about the buckets that hold 5,000 measurements plus those of
  kept rooms, on the scenario dataset, and explain the `deleteMany` once.

## SUGGESTION

### S1. Two dashboards with the same host name interrupt each other's job at startup

- `dashboard-ce/backend/src/deletions/deletion-records.ts:227-245`, `:29-33`
- `markRestarted` treats any running job whose `instance` has this host name, but not this exact process, as its own
  restarted job. With host networking, a second dashboard process on the same machine and database gets the same
  `hostname()`: for example `demo both`, or a CE and a PRO dashboard started side by side. When that process starts,
  it marks the other process's live job `interrupted`. The live runner then stops at its next write and logs
  "another instance took over its record". Consider adding a per-install identifier, such as the container id or a
  random id persisted on local disk, or documenting the assumption.

### S2. The API accepts a class deletion while the 3.9 migration runs

- `dashboard-ce/backend/src/deletions/deletion-service.ts:34-57`
- Only the UI disables the buttons ("Available once the migration ends"). A `POST /deletions` with `events` or `all`
  during a running migration is accepted. It deletes migrated documents while the migration keeps inserting older
  ones, so the job's "completed" record is wrong as soon as it is written. A `409` with the migration message would
  make the API match the UI. The spec does not require this, so it is a suggestion.

### S3. A storage read that is in flight can put stale figures back into the cache after a completion clears it

- `dashboard-ce/backend/src/info/info-service.ts:225-248`, `dashboard-ce/backend/src/deletions/figure-caches.ts:39-49`
- `storageInfo` stores `{ at: <start of read>, value }` when it finishes, even if `FigureCaches.observe` cleared the
  cache meanwhile. Triggering case: an info read starts its `$collStats` loop, a status poll observes a completion and
  clears the cache, then the info read finishes and caches figures that may predate the completion. They are served
  until `finishedAt + 60 s`, the checkpoint boundary. This is narrow, and the 65 s re-read of the UI corrects it. A
  generation counter that `observe` increments, with the store skipped on a mismatch, would close the gap.

### S4. A failed progress or record write fails the job at once, without the batch retries

- `dashboard-ce/backend/src/deletions/deletion-runner.ts:166-171`, `:199-204`, `:220`, `:233`, `:239`
- `write(records.progress(...))`, `complete()` and `finish()` are not wrapped in `retry()`. A MongoError that the
  driver's single retryable-write attempt does not absorb ends the job as `failed`, "A database error stopped it",
  even if the batches themselves would have recovered. Wrapping the record writes in the same `retry()` would make
  "three retries" hold for the whole job.

## Checked without findings

- Lock and stale judgement by `$$NOW`: `acquire` is a conditional upsert, and the duplicate-key error on a collision
  reads as running. The takeover is detected through `matchedCount` on every record write and through the heartbeat.
- `incomplete` and `completed` bookkeeping for failed, stale and restarted jobs, including Entities stamping its
  detail classes and Total stamping all seven.
- Rollup bucket floors: 10:07 keeps 10:00/10:05, 09:00/10:00, and D-1/D. Daily uses the `scope_bucket` hint because
  there is no TTL index when retention is unlimited.
- Validation: strict body, `includeLegacy` only with `all`, bearer security, and no cause or instance in API
  responses (`toDeletionJob`).
- Status keeps its two finds, with the job judged by the MongoDB clock. Info adds one `hello` call, as designed.
- Info tip with a link: Tab, Shift+Tab, Escape and outside-click handling. The confirm dialog focuses Cancel first,
  and Cancel returns `null`.
- Status cadence: `delay()` is now separate from `interval()`, and the baseline of the info re-read is set by the
  first status. The Data tab baseline, the 65 s timer and the pending notice are cleared on deactivation.
- Tests reviewed: rules, jobs, API, the runner unit test, the UI specs and the e2e flows. All assert the behaviour
  they name. Apart from W2, the gaps found are those noted in C1 and W1.
