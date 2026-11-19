# Design

## Context

See proposal.md, Why. State of the writer checkout (`openvidu/analytics/`) before this change:

- `batch.go`: `eventEntry` and `statsEntry` keep one flag per step (`rollupsDone`, `deltasDone`). `applyRollups` and
  `applyStats` merge the increments and updates of the pending entries and call `ApplyIncrements` / `ApplyUpdates`
  once; the store does one unordered bulk write per collection and returns at the first transient error, so the flag
  stays false although some collections were written. The live writer requeues the entries that are not `done()`
  (`writer.go`, `applyBatch`), and new entries join them in the next batch.
- `migration.go`: `replay` reads a whole-second batch, calls `applyEvents` or `applyStats`, which build new entries,
  retry them with `retrying` (5 attempts, sleeps 1, 2, 4, 8 s), then advances the checkpoint in memory, persists it and
  refreshes the lock. A failure returns to `withRetries` (5 rounds, the same sleeps between rounds), which calls
  `replay` again: it reopens the cursor at the checkpoint and builds fresh entries for the same batch. The lock (TTL
  60 s) is refreshed only after a batch, while a failing batch can retry for about 90 s.
- Event entity updates and cascades are idempotent; stats deltas and every rollup increment are not
  (`projection/stats.go`, `StatsResult.Updates`).

## Goals / Non-Goals

**Goals:**

- No acknowledged write of a batch applied twice by an in-process retry, in the live writer and in the migration.
- Same number of database round trips per batch as today.
- The retry budget of a migration batch unchanged (about 90 s before `failed`).

**Non-Goals:**

- Writes the server applied but reported as failed (see Risks).
- Persisting the progress of a batch across processes: an interrupted batch is replayed whole (accepted residual).
- Any change to `store/`, the contract, metrics or configuration.

## Decisions

1. **Per-collection progress on each entry.** `eventEntry` and `statsEntry` replace `rollupsDone` with the set of
   rollup collections written, and `statsEntry` replaces `deltasDone` with the set of delta collections written. The
   collections and their write order are the lists `rollupCollections` (`analytics_5min`, `analytics_hourly`,
   `analytics_daily`) and `deltaCollections` (`participants`, `rooms`) of `batch.go`, which `fixtures_test.go` also
   uses. The processor groups the pending
   increments (and stats updates) by collection and, in a fixed order, calls `ApplyIncrements` (`ApplyUpdates`) once
   per collection with only the entries that still miss it, marking those entries when the call succeeds or fails for
   good (rejected writes are dropped as today). `done()` holds when every collection is written. The store already did
   one bulk write per collection, so the round trips are the same. A collection with no increment for an entry counts
   as written. Rejected: a store method that reports which collections succeeded (it would change the `batchStore`
   interface and every fake for the same result); a transaction across collections (needs a replica set and costs
   round trips).
2. **Room-end increments computed once per entry.** The extra rollup increments of an ending room
   (`RoomEndedIncrements`, from the `ClosedRooms` lookup) are computed the first time the entry reaches the rollup step
   and kept on the entry, so a retry never writes the hourly and daily collections from a different lookup than the
   collections already written. `hostedRooms` counts a `ROOM_CREATED` once its entry has written every collection.
3. **The migration keeps its in-flight batch.** The migrator holds a `migrationBatch`: its collection field, last
   second, document count, start time, event entries, stats entries, fixer events, whether the authentic events
   (`eventsDone`) and the fixer closures (`fakesDone`) are finished, and its own `counts` (events, stats, synthetic,
   skipped). `replay` first finishes a held batch (entries keep their per-step and per-collection progress, closures
   run only if not finished), then advances and persists the checkpoint and only then opens the cursor. Documents are
   decoded once, so `counts.skipped` no longer grows on a re-read. The batch's counts are added to the migration's
   `counts` only when the batch completes, so a failed or interrupted batch leaves no partial counts in the saved
   state (before, `counts.events` was added before the fixer closures ran). The held batch is dropped when it
   completes, when the run ends (failure, lost lock) and at the start of every run, since a new run reads from the
   persisted checkpoint and another node may have applied the batch meanwhile.
4. **Retry budget kept as built** (owner's answer). The inner `retrying` (5 attempts) wraps every step of a batch:
   the authentic events, the fixer closures (`closeFakes`, which before had only the outer level) and the stats. The
   outer `withRetries` (5 rounds) stays; both retry the held batch, so every step gets five rounds of five attempts.
   The spec now states five rounds of five attempts. Rejected: a single
   level of 5 attempts (about 15 s), which fails the migration, and needs a restart, after shorter outages; retrying
   without limit, which hides a lasting failure behind `running`.
5. **Lock refreshed before every retry.** `retrying` and `withRetries` refresh the lease before each new attempt and
   return `errLockLost` when the refresh fails; the run then ends like any lost lock and the held batch is dropped. This
   keeps "Single runner across nodes" true during the 90 s budget. Rejected: a lock TTL above the budget, which delays
   the takeover after a crash.
6. **Spec layout.** The writer gets an added requirement instead of new scenarios under "Rollup counters from events"
   and "Stats deltas into entities and rollups": a modified requirement carries all its scenarios, and the seven
   unchanged ones would each need a test titled after them. The migration modifies only "Checkpoint and resume" and
   adds the requirements for the interrupted batch and the lock.
7. **No CHANGELOG line.** Both changelogs describe 3.10 against 3.9.0, and the new writer and the migration are
   unreleased; earlier fixes to the unreleased writer (`3a697751`, `0ecee9d2`) logged none. The "Legacy data
   migration" section of the writer's `README-openvidu.md` describes the lock refresh before every retry, the retry
   budget and the interrupted batch replayed whole.

## Risks / Trade-offs

- [A write the server applied but reported as failed (write concern error, network error after the commit once the
  driver's retryable write also fails) is reapplied by the next retry; an ambiguous raw insert makes its events
  duplicates that are not counted] → accepted: a limit of MongoDB without transactions; not stated in the specs, whose
  guarantees concern acknowledged writes.
- [An update whose merged pipeline exceeds 500 stages is applied in successive rounds within its collection, and a
  failure in a later round makes the retry apply the earlier rounds again] → accepted: stats deltas take one stage per
  participant and flush, so it needs one participant in about 500 seconds of a single migration batch.
- [An interrupted batch is replayed whole by the next run] → accepted and specified ("Interrupted batch replayed
  whole"): at most one batch (500 documents by default) per interruption.
- [The reconciler's closure of fixer entities is not tracked per entity: when it fails after closing some entities of a
  batch, the retry finds them closed and leaves them out of `counts.synthetic`] → accepted: only that counter of the
  migration state undercounts; the entities are closed once and the dashboard does not show the counter.
- [A refresh failure caused by Redis alone ends the run during a retry] → the node retries the lock every minute and
  resumes from the checkpoint, replaying that one batch.

## Migration Plan

None: no data or configuration change. A server upgraded during a migration resumes from the persisted checkpoint as
before.

## Test strategy

| Scenario                                         | Test file (writer checkout)                         | Level              |
| ------------------------------------------------ | --------------------------------------------------- | ------------------ |
| Rollup step interrupted between collections      | `openvidu/analytics/batch_test.go` (fake store)     | unit               |
| Stats deltas interrupted between collections     | `openvidu/analytics/batch_test.go` (fake store)     | unit               |
| Transient error with progress                    | `openvidu/analytics/migration_test.go`              | unit               |
| Lock refreshed while a batch retries             | `openvidu/analytics/migration_test.go`              | unit               |
| Batch finished after its fixer closures failed   | `openvidu/analytics/migration_integration_test.go`  | integration (Mongo) |
| Stats batch finished after a transient error     | `openvidu/analytics/migration_integration_test.go`  | integration (Mongo) |
| Killed mid-run                                   | `openvidu/analytics/migration_integration_test.go`  | integration (Mongo) |
| Database error                                   | `openvidu/analytics/migration_integration_test.go`  | integration (Mongo) |
| Batch replayed after a failed run                | `openvidu/analytics/migration_integration_test.go`  | integration (Mongo) |

Failures are injected by wrapping the real store (as `unavailableStore` does) so that one call for one collection
fails once, or fails until the budget ends; the test backoff stays at 10 ms. No performance budget applies: the round
trips per batch do not change.
