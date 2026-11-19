# Proposal: retried analytics batches apply each write once

## Why

Two retry paths of the writer can apply a write twice or never, which the specs forbid:

- The legacy migration reads a batch again, with fresh entries, after any transient failure inside it. Stats deltas,
  `track_stats` samples and stats rollups of that batch are then added twice, and its raw-stored events whose rollups
  were still pending are never counted.
- The rollup step of the writer (and the stats deltas) writes one collection after another and marks the step done only
  when all succeed: a transient error after the first collection makes the retry add that collection's counters again,
  for events and stats alike, in the live writer and in the migration.

## What Changes

- Every queued event and stats flush records which rollup collections (`analytics_5min`, `analytics_hourly`,
  `analytics_daily`) it has written, and a stats flush also which delta collections (`participants`, `rooms`); a retry
  writes only the collections still missing, with the same number of database round trips.
- The migration keeps the batch it is applying, with the progress of each entry and of its fixer closures, and finishes
  it before reading the legacy collection again; each document of a batch is decoded once.
- The migration refreshes its lock before every retry of a batch and stops when the refresh fails, so no other node
  starts the same batch while this one still retries it.
- The retry budget of a failing migration batch stays as built (five rounds of five attempts, about 90 s); the spec now
  states it instead of "five attempts".
- The specs accept one residual: a batch whose run ends before its checkpoint is persisted (process killed, lock lost,
  or migration failed after its retries) is replayed whole by the next run, with what that replay can reapply or leave
  uncounted.

Observable behaviour: after a transient database error, rollup counters and participant and room traffic and quality
totals no longer grow twice, migrated statistics are no longer duplicated and migrated events are no longer left
uncounted, except in the accepted residual. Nothing changes in the API, the UI, the data contract or the configuration.

CHANGELOG: none. The analytics writer and the migration are unreleased (3.10.0); both changelogs describe 3.10 against
3.9.0, and earlier fixes to the unreleased writer logged no line.

## Track

Lite, kept by the owner over the full track proposed: one package of one repository, no API, contract, configuration
or dependency change, although it touches two capabilities and nine scenarios. `design.md` records the decisions.

## Scope

- Edition: CE and PRO (the writer is the same in both).
- Repositories: openvidu-livekit (`openvidu/main`, package `openvidu/analytics/`); openvidu-pro-livekit takes it with
  the merge of `openvidu/main`. The dashboard repository gets the specs only.
- Not in scope: a write the database applied but reported as failed (it is reapplied by the next retry, a limit of
  MongoDB), updates split into several pipeline rounds within one collection, the dashboard, the contract, the
  documentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-legacy-migration`: "Checkpoint and resume" finishes a failed batch instead of reading it again and states the
  real retry budget; new requirements for the replay of an interrupted batch and for the lock during retries.
- `server-analytics-writer`: new requirement for rollup and stats delta writes tracked per collection.

## Impact

- Writer: `openvidu/analytics/batch.go` (entries and the processor), `migration.go` (in-flight batch, retries, lock),
  their unit and integration tests. `store/` keeps its interface.
- Data model, API, configuration, metrics: unchanged.
