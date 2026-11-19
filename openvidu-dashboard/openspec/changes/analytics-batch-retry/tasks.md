# Tasks

Checkouts: the **writer checkout** is the sibling openvidu-livekit checkout on `openvidu/main`, never the
`openvidu-livekit` submodule of the openvidu repository; the **CE workspace** is `openvidu-dashboard/` of the
standalone openvidu checkout. All code is in the writer checkout. Suites that need Docker run one at a time, when the
orchestrator schedules them. Each scenario test is a `t.Run` subtest whose title is the scenario name, alone or
followed by `: <detail>`, which is how `./dashboard.sh scenarios` finds it. Lint means the lint of `buildtest.yaml` with the Go version of the `Dockerfile`:
`GOTOOLCHAIN=go$(.github/scripts/go-version.sh Dockerfile) go run
github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0 run --build-tags integration ./openvidu/...`.

## 1. Writer: rollups and stats deltas written per collection (implementer)

- [x] 1.1 In `openvidu/analytics/batch.go`, replace `rollupsDone` of `eventEntry` and `statsEntry` with the set of
      rollup collections written, and `deltasDone` of `statsEntry` with the set of delta collections written; apply
      the increments and the stats updates one collection at a time in a fixed order, each call carrying only the
      entries that still miss that collection, and mark them when it succeeds or its writes are rejected for good
      (design, decision 1). Keep `done()` and the writer's requeue as they are in meaning. Leave `store/` unchanged.
      Verify: `go build ./openvidu/...` and lint pass.
- [x] 1.2 In `applyRollups`, compute the room-end increments of an entry once, on its first pass, and keep them on the
      entry; count `hostedRooms` when a `ROOM_CREATED` entry has written every rollup collection (design, decision 2).
      Verify: `go test ./openvidu/analytics/` passes.
- [x] 1.3 Add `openvidu/analytics/batch_test.go` with a fake `batchStore` that records each `ApplyIncrements` and
      `ApplyUpdates` call by collection and fails one collection once with a network error. Tests `Rollup step
      interrupted between collections` (5-minute written, hourly fails: the retry writes no 5-minute increment again,
      hourly and daily once, and the summed counters equal the event counts; also a `ROOM_CREATED` counted once in
      `hostedRooms` and room-end increments identical across the retry) and `Stats deltas interrupted between
      collections` (participants written, rooms fail: the retry writes rooms only, then the stats rollups once). Covers
      both writer scenarios. Verify: `go test -race ./openvidu/analytics/` passes, and both tests fail against the
      code before 1.1.

## 2. Migration: in-flight batch, retries and lock (implementer)

- [x] 2.1 In `openvidu/analytics/migration.go`, hold the in-flight batch on the migrator (design, decision 3):
      `applyEvents` and `applyStats` decode a batch once into it, record whether the authentic events and the fixer
      closures are finished, and `replay` finishes a held batch before it advances the checkpoint and opens the cursor.
      Drop the held batch when it completes, when the run ends and at the start of `run`. Keep the inner `retrying`
      and the outer `withRetries` with their budget (decision 4). Verify: `go build ./openvidu/...` and lint pass.
- [x] 2.2 Refresh the lease before every new attempt in `retrying` and `withRetries`, returning `errLockLost` when the
      refresh fails (decision 5); pass the lease to both. Update the doc comments of `migrationLockTTL` and
      `migrationRetries` to the five rounds of five attempts and the refresh before each retry. Verify:
      `go build ./openvidu/...` and lint pass.
- [x] 2.3 Add `openvidu/analytics/migration_test.go` with the unit tests `Transient error with progress` (a phase
      failing with a network error four times, then progressing and failing again, is not given up and keeps
      `running`) and `Lock refreshed while a batch retries` (a lease whose refresh fails before the third attempt: two
      attempts, one refresh between them, `errLockLost`, no third attempt). Verify: `go test -race
      ./openvidu/analytics/` passes.
- [x] 2.4 In `openvidu/analytics/migration_integration_test.go`, add to `TestMigrationResilience`, with failures
      injected by wrapping the real store: `Batch finished after its fixer closures failed` (fixer closures fail once
      after the authentic events were applied; rollups, closed entities and `counts` equal a reference run);
      `Stats batch finished after a transient error` (room deltas fail once after `track_stats` and participant
      deltas; `track_stats` count, participants, rooms and rollups equal a reference run); `Killed mid-run: in the
      middle of a stats batch` (the run is abandoned through a failed lock refresh after a stats batch's
      `track_stats` insert; the next run resumes at that batch's first second and differs from the reference only by
      that batch's samples and deltas); `Batch replayed after a failed run` (the rollup writes of the second events
      batch fail until `failed`; after a new start its raw-stored events are not counted and the first batch's events
      are counted once). Retitle `resumes after a lost lock without reapplying a document` to `Killed mid-run: between
      two batches` and `fails after the retries and resumes on the next start` to `Database error`, asserting there 25
      attempts of the failing write before `failed`. Covers the five integration scenarios of the migration. Verify:
      `go test -race -tags integration -run 'TestMigration' ./openvidu/analytics/` passes (Docker), and the new
      subtests fail against the code before 2.1.
- [x] 2.5 Commit 1.1 to 2.4 on `openvidu/main` of the writer checkout without pushing. Verify:
      `go test -race -tags integration ./openvidu/analytics/...` passes (Docker), as the `Analytics integration tests`
      step of `buildtest.yaml` runs it, and `go test -race ./openvidu/analytics/...` passes.

## 3. Refactor review (implementer)

- [ ] 3.1 Review the diff of the writer checkout for a needed refactor; apply a small one here, record a larger one as
      a proposed change. Confirm that no `AGENTS.md`, README, `CHANGELOG.md` or `CHANGELOG-openvidu.md` needs a line
      (design, decision 7). Verify: in the CE workspace, `./dashboard.sh check` passes and
      `./dashboard.sh scenarios analytics-batch-retry <writer checkout>` finds a test for every scenario.

## 4. Publish (orchestrator)

After the full verification.

- [ ] 4.1 Push `openvidu/main` of the writer checkout. Verify: its `Test` workflow run (`buildtest.yaml`, analytics
      integration tests included) is green.
- [ ] 4.2 Merge `openvidu/main` of openvidu-livekit into openvidu-pro-livekit and push it. Verify: its CI run is
      green.
- [ ] 4.3 Push the CE workspace's `master` with the change. Verify: the `openvidu-dashboard-ci.yml` run, `contract`
      job included (it builds the writer's `openvidu/main`), is green.

## Workflow follow-up

- Archive once the Definition of Done holds; the archive syncs `server-legacy-migration` and
  `server-analytics-writer`.
