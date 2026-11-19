# Verification Report: analytics-batch-retry

- Date: 2026-11-19
- Mode: full (lite track: this report covers scenarios, specs and code)
- Verified commit: CE workspace `5e1d6fc5f` (`git rev-parse HEAD`, clean tree); writer checkout
  `openvidu-livekit` `openvidu/main` at `e4b17cac` (commits `3707ac91`, `0988b49a`, `e4b17cac` on top of `0ecee9d2`,
  not pushed, clean tree)

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 9/12 tasks (the 3 open ones are group 4 `(orchestrator)` publish, pending after this verification); 3 ADDED/MODIFIED requirements found implemented, no REMOVED or RENAMED |
| Correctness  | 3/3 requirements mapped (4 counting the two ADDED migration requirements separately: 4/4); 9/9 scenarios have a test that asserts the THEN; writer Go tests not verified (not run by this report, see below) |
| Coherence    | Design decisions 1 to 7 followed; 2 minor suggestions |

## Commands run

- `./dashboard.sh check` (CE workspace): passed (lint, format, typecheck, `openspec validate --all --strict` with
  `change/analytics-batch-retry` valid, workflow tests, unit tests).
- `./dashboard.sh scenarios analytics-batch-retry <writer checkout>`: 9 scenarios, 0 without a test.
- `./dashboard.sh e2e`, `./dashboard.sh test-integration`: not applicable; the change touches no dashboard frontend,
  backend or e2e suite (the CE diff against `origin/master` is the change folder only).
- Writer tests (`go test -race ./openvidu/analytics/...`, `go test -race -tags integration ./openvidu/analytics/...`)
  and the writer lint: **Not verified**. The verifier guard allows only `./dashboard.sh` checks and read-only commands,
  so these Go suites could not be run here; they are covered by task 4.1 (writer `Test` workflow, analytics
  integration tests included) and task 4.3 (`contract` job), both pending in group 4. No `operations.md` exists, so
  nothing orchestrator-only is recorded yet.

## Completeness

- Tasks: 9/12. Unchecked 4.1, 4.2, 4.3 belong to `## 4. Publish (orchestrator)`, marked "After the full
  verification": pending, not findings.
- Spec coverage:
  - `server-analytics-writer` ADDED "Rollup and stats delta writes per collection": `openvidu/analytics/batch.go:30`
    (`rollupCollections`, `deltaCollections`, `collectionSet`), `batch.go:347` (`applyRollups`, one
    `ApplyIncrements` per collection with only the entries missing it), `batch.go:423` (`applyStats`, one
    `ApplyUpdates` per delta collection, then one `ApplyIncrements` per rollup collection).
  - `server-legacy-migration` MODIFIED "Checkpoint and resume": `migration.go:352` (`replay` finishes a held batch
    before opening the cursor), `migration.go:389` (`finish` advances and persists the checkpoint, adds the batch's
    counts), `migration.go:467` (`applyEvents` with `eventsDone`/`fakesDone`), `migration.go:502` (`retrying`, 5
    attempts) inside `withRetries` (5 rounds).
  - ADDED "Interrupted batch replayed whole": the held batch is dropped at the start and end of `run`
    (`migration.go:257-258`), so a new run reads from the persisted checkpoint.
  - ADDED "Migration lock held through retries": `withRetries` (`migration.go:329`) and `retrying` refresh the lease
    before each new attempt and return `errLockLost`, which `run` returns without failing the migration.

## Correctness: scenario coverage

| Scenario | Test | Assessment |
| -------- | ---- | ---------- |
| Rollup step interrupted between collections | `batch_test.go:121` | Asserts 5-minute not rewritten, hourly and daily once, counters equal event counts, `hostedRooms` once, one `ClosedRooms` lookup. Covers. |
| Stats deltas interrupted between collections | `batch_test.go:165` | Asserts no `track_stats` re-insert, participant and room deltas once, stats rollups once with summed bytes. Covers. |
| Killed mid-run | `migration_integration_test.go:747` (between two batches), `:828` (in the middle of a stats batch) | The second asserts `track_stats` count = reference + abandoned samples, other collections equal, participant bytes = reference + abandoned deltas. Covers. |
| Database error | `migration_integration_test.go:771` | Asserts `failed`, 25 attempts, error naming the phase, resume on next start. Covers. |
| Transient error with progress | `migration_test.go:50`, `:71` | Asserts the count restarts after progress and no failure. Covers (see SUGGESTION 1). |
| Batch finished after its fixer closures failed | `migration_integration_test.go:791` | Reference comparison of state, counts, `track_stats` and v2 snapshot. Covers. |
| Stats batch finished after a transient error | `migration_integration_test.go:806` | Room deltas fail once after insert and participant deltas; reference comparison. Covers. |
| Batch replayed after a failed run | `migration_integration_test.go:912` | Asserts `failed`, then completed with `rooms.created` = reference minus the replayed batch's rooms in all rollup collections. Covers. |
| Lock refreshed while a batch retries | `migration_test.go:83`, `:96` | Asserts two attempts, refresh before the second, `errLockLost`, no third attempt. The THEN clause "the next runner resumes from the checkpoint" is exercised by `migration_integration_test.go:828` (see SUGGESTION 2). |

Whether these tests pass was not verified by this report (see Commands run).

## Coherence

- Decision 1 (per-collection progress, fixed order, same round trips): followed; `store/` unchanged; the lists are
  shared with `fixtures_test.go`.
- Decision 2 (room-end increments once, `hostedRooms` after every collection): followed (`batch.go:399`).
- Decision 3 (held `migrationBatch`, decoded once, counts added on completion, dropped at start/end of run):
  followed.
- Decision 4 (budget kept, `closeFakes` now under `retrying`): followed; `migrationRetries` doc comment updated.
- Decision 5 (refresh before every retry): followed in both levels.
- Decision 7 (no CHANGELOG line; README describes the refresh, budget and replay): followed in `README-openvidu.md`.
- Conventions: writer commits follow the `Analytics: ...` style of the branch; no PRO detail in CE; CE diff is the
  change folder only; no data contract, configuration or dependency change.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. `openvidu-livekit/openvidu/analytics/migration_test.go:68`: the assertion that `state` stays `running` cannot
   fail, since `withRetries` never writes `m.state.State` (only `run` via `fail` does). The scenario's THEN is
   effectively proven by `require.NoError` at line 65. Recommendation: drop the assertion or drive the scenario
   through `run` so the state check is meaningful.
2. `openvidu-livekit/openvidu/analytics/migration_test.go:83`: "the next runner resumes from the checkpoint" of
   "Lock refreshed while a batch retries" is only asserted by `migration_integration_test.go:828`, titled after
   "Killed mid-run". Recommendation: add a `Lock refreshed while a batch retries: <detail>` subtest (or reuse that
   integration case under this title) that asserts the second lease resumes from the checkpoint.
3. `openvidu-livekit/README-openvidu.md:122`: the line runs to about 150 characters while the rest of the section
   wraps at 120. Recommendation: rewrap the paragraph.

## Definition of Done (CE `AGENTS.md`)

| Item | Status |
| ---- | ------ |
| All tasks checked | Not met yet: 4.1 to 4.3 `(orchestrator)`, pending after this verification |
| `scenarios` finds a passing test for every delta scenario | Partly met: a test for all 9 found; passing not verified here (Go suites; pending CI of 4.1) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push green | Not met yet: pending 4.1 to 4.3 |
| Backend changes: `test-integration` | Not applicable (no dashboard backend change); the writer's integration tests run in 4.1 CI |
| UI changes: `e2e` | Not applicable |
| Data contract changes: `contract-check` | Not applicable (contract unchanged); `contract` job of 4.3 builds the writer |
| Image or runtime dependency changes | Not applicable |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met (task 3.1 checked; this report has no CRITICAL) |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met: no CHANGELOG line by design decision 7; writer README updated; no AGENTS.md affected |
| Change archived | Not met yet (after publish) |

## Final assessment

No critical issues found in the checks that ran. Not verified: the writer's Go unit and integration tests and lint
(the verifier guard cannot run them; they are covered by the pending CI of tasks 4.1 and 4.3). 0 warnings, 3
suggestions.
