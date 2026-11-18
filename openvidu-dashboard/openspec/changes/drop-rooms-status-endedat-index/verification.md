# Verification Report: drop-rooms-status-endedat-index

- Date: 2026-11-18
- Mode: full (lite track, only verification of the change)
- Verified commit (CE workspace): `6ed6702d00eb5782d7c50a4c8f099881d0645e41` (`master`, change commits `42856dd61`,
  `b894a716c`, `2d4ec2155`, `8c9d08405`, `6ed6702d0`)
- Writer checkout: openvidu-livekit `openvidu/main` at `0ecee9d2` (one commit ahead of `origin/openvidu/main`, not
  pushed, clean working tree)

## Summary

| Dimension    | Status                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Completeness | 10/13 tasks (the 3 open ones are group 6, `(orchestrator)`, after verification: pending); 3 reqs   |
| Correctness  | 3/3 reqs implemented, 7/7 scenarios with a test that asserts them                                  |
| Coherence    | Design: not applicable (lite track, no `design.md`; proposal decisions followed). Patterns followed |

## Commands run

- `./dashboard.sh check` (CE workspace): passed (lint, format, typecheck, `openspec validate --all --strict` with the
  change, tooling tests, typings 111, backend unit 262, frontend 630 + 1).
- `./dashboard.sh scenarios drop-rooms-status-endedat-index <writer checkout>`: 7 scenarios, 0 without a test.
- `./dashboard.sh e2e`: not applicable (no frontend or e2e change).
- `./dashboard.sh test-integration`: not rerun here, on the orchestrator's instruction (heavy Docker suite, reported
  green on this code, no finding needed it). The rooms query plan suite is part of it.
- Writer `go test -race -tags integration ./openvidu/analytics/...` and lint: not runnable by the verifier (guard);
  reported green by the orchestrator.
- Contract check: recorded in `operations.md` (CE `8c9d08405` against writer `0ecee9d2`, passed, version 2), not
  checked here. `8c9d08405..6ed6702d0` touches only `tasks.md` and `operations.md`, so the recorded run applies to the
  verified code.

## Completeness

- Tasks 1.1 to 5.1 checked and confirmed in the diffs:
  - 1.1: `dashboard-ce/typings/contract/indexes.ts` and `schema/indexes.json` lose the entry; fixtures,
    `contract_version.txt` and `src/schema-version.ts` untouched.
  - 1.2: `dashboard-ce/typings/test/contract.test.ts:354` reads `schema/indexes.json` (line 294).
  - 2.1: doc comment of `roomsListPlan`, `dashboard-ce/backend/src/rooms/rooms-query.ts:113-115`, no code change.
  - 2.2: `dashboard-ce/backend/test/integration/rooms-query-plan.test.ts:281` retitled, `COLLSCAN` kept; active rooms
    count without `status_endedAt_id` (line 406).
  - 3.1: vendored `openvidu/analytics/schema/contract/schema/indexes.json` has the same blob (`9fcd52f0`) as the CE
    file.
  - 3.2: `dropRetiredIndexes` at the end of `openvidu/analytics/schema/upgrade.go:98-124`, called once from
    `initialize.go:153` after the `ensureIndexes` loop and before `upgradeDocuments`; `DroppedIndexes` doc widened;
    `upgradeDocuments`, `removeTrackFrames` and `writeSchemaMeta` untouched.
  - 3.3: subtests at `initialize_integration_test.go:388` and `:417`.
- Tasks 6.1 to 6.3 (`(orchestrator)`, "After the full verification"): pending, not findings.
- `git grep status_endedAt_id`: in CE only the new test and the change artifacts remain, plus the two mentions in
  `openspec/specs/rooms-api/spec.md:279,299` that the archive replaces with the MODIFIED requirement; in the writer only
  the retired list and its tests.

## Correctness

- **Rooms end time not indexed** (data-model, ADDED): contract has no `rooms` index with `endedAt`. Scenario "No rooms
  index on endedAt": `contract.test.ts:354` checks every `rooms` entry of `schema/indexes.json` for the name and for an
  `endedAt` key field, and that rooms entries exist.
- **Room list plans** (rooms-api, MODIFIED; only the `status_endedAt_id` mentions leave the scenarios):
  - Hinted room filters: `rooms-query-plan.test.ts:228` asserts the index of each filter for page, `total` and every
    ranked sort, bounded by the filter's rooms in range.
  - Several features: `:248` asserts both partial indexes, no `SORT`, and `items` and `total` against the union.
  - Selective room name prefix: `:270` asserts `nameLower_createdAt` for page, `total` and a ranked sort, bounded by the
    prefix's rooms in range.
  - Broad room name prefix: `:281` asserts the page on `createdAt_id`/`status_createdAt_id`, no `SORT`, within two
    pages; `status_createdAt_id` for `total` and the ranked sorts with `status=closed`; no `COLLSCAN`; every plan bounded
    by the rooms in range (`maxDocsExamined`).
  - The plans keep their pins, as decision 5 of the proposal requires (`rooms-query.ts` code unchanged).
- **Retired rooms index** (server-analytics-writer, ADDED): drop at every start with no version gate, only the named
  index, `IndexNotFound` treated as done and not reported, reported in `DroppedIndexes`, which the initialization log
  prints (`openvidu/analytics/analytics.go:359`).
  - Retired rooms index dropped: `initialize_integration_test.go:388` asserts the dropped list, no created index,
    `operator_custom` kept, every contract index present, version 2, and a second run dropping and creating nothing.
  - Nodes dropping the retired index together: `:417` runs four concurrent `Initialize` calls, asserts no error and the
    index gone.

## Coherence

- Proposal decisions followed: contract version 2 kept; drop at every start; only the named index; the retired name
  lives in the writer beside the frames upgrade; pins kept.
- Implementer deviations, both acceptable: `retiredIndexes` is an ordered slice instead of a map (deterministic order
  of `DroppedIndexes`, same behaviour); the helper `notEndedAt` renamed `noCollscan`, matching what it now asserts.
- Commit messages follow each repository's convention (`openvidu-dashboard: …`, `Analytics: …`).
- CHANGELOG, README and `AGENTS.md`: no line needed (the index never shipped in a release; no command, layout or
  convention change), as the proposal and task 4.1 state.

## Definition of Done (CE `AGENTS.md`)

- All tasks checked; scenarios each have a passing test: not met yet only by the pending group 6 tasks; scenarios met
  (typings test passed in `check`; plan and writer tests reported green by the orchestrator).
- `./dashboard.sh check` passes locally: met. CI run of the push green: pending (task 6.1).
- Backend change, `test-integration` passes: reported green by the orchestrator, not rerun here.
- UI change, `e2e`: not applicable.
- Data contract change, `contract-check` passes against the writer: recorded in `operations.md`, not checked here.
- Image or runtime dependency change: not applicable.
- Latest verification report has no CRITICAL; refactor review applied or recorded: met (this report; task 4.1).
- `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change: met (nothing to add).
- Change archived: pending (after group 6).

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Final assessment

No critical issues, warnings or suggestions in the checks that ran. `test-integration` and the writer's integration
tests and lint were not rerun in this verification (orchestrator instruction; reported green), and the contract check is
recorded, not checked. The change is ready for the publish tasks of group 6 and then the archive.
