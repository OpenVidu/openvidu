# Verification Report: list-query-plans

- Date: 2026-11-18
- Mode: incremental
- Verified commit: `3903977febeb61be3c00038fc8a4f16d0676da67` (not pushed)
- Starts from: `51ad853077d983d2a1c2b612ae4f972f00295db4`, the last verified commit. Its reports, `verification.md` and
  `code-review.md`, were committed in b7f0efea5. This report replaces both.
- Range reviewed: `b7f0efea5..HEAD`: da479af52 (spec and design revisions), 2496350e3, f87412bcd, df6a119bc,
  d5d4c00b8 and 3903977fe (fixes and re-run).
- Working tree: clean

## Commands run

| Command                                     | Result                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `./dashboard.sh check`                      | Pass. Lint, format, typecheck and `openspec validate --all --strict` (31/31) pass. Unit tests: backend 261 (257 before), frontend 631, typings 110, tooling 136 |
| `./dashboard.sh scenarios list-query-plans` | 29 scenarios, 0 without a test                                                                             |
| `./dashboard.sh test-integration` (Docker)  | Pass: 22 files and 279 tests (278 before), none skipped. Plan suites ran at scenario S over 2 days         |
| `./dashboard.sh e2e`                        | Not applicable: no frontend or e2e files changed                                                           |

Recorded, not checked: the evidence gap of "Activity range over 30 days" in `operations.md:11-13`. Group 7 (the four
plan suites at scenario M over 7 days) and the CI run of the push are orchestrator work after this verification.

## Summary

| Dimension    | Status                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Completeness | 23/24 tasks. 7.1 is orchestrator work after the verification, so it is pending, not a finding. All 6 ADDED/MODIFIED reqs are implemented |
| Correctness  | 6/6 reqs implemented. 29/29 scenarios have a passing test. One scenario has no evidence for its 30-day premise (W2) |
| Coherence    | Design followed. The design/tasks inconsistency of W2 is resolved. Two minor traceability suggestions      |

## Earlier findings

### From `verification.md` (51ad85307)

- **W1, Ranked sorts over 24 hours partly covered: resolved.**
  - The scenario now names the planner's candidates for the unhinted participants identity search
    (`specs/participants-api/spec.md:23`). It also states the bound with `status` (range plus status).
  - Design decision 12 says the same (`design.md:257-259`).
  - The test checks the scenario's claims for `q=<selective>`, `q=user`, `q=user&status=active` and
    `q=user&kind=STANDARD,AGENT`, under `sort=leftAt` and `sort=duration`
    (`dashboard-ce/backend/test/integration/participants-query-plan.test.ts:289-317`):
    - no `COLLSCAN`;
    - at least one index, and every index is in the candidate set for that query;
    - the scenario's bound.
  - The test passes at S.
- **W2, Activity range over 30 days not exercised at 30 days: still open, narrowed (see W1 below).**
  - The design now agrees with task 7.1. Every suite runs at M over 7 days (`design.md:262-265`), so the inconsistency
    is gone.
  - The gap itself is recorded for the owner (`operations.md:11-13`). This verification was not told that the owner
    accepted it.
- **S1, p95 of ranked identity searches not measured: resolved.**
  - `participants-query-plan.test.ts:633-658` adds four enforced 300 ms rows, all ranked by `duration` over 24 hours:
    participants selective and `q=user`, agents `q=user` and one agent identity.
  - Design and task 4.7 match these rows (`design.md:94-95`, `:269-270`).
- **S2, Wording of "Room list plans": resolved.** The requirement now reads "Several features without `mediaNode`, and
  `q`, SHALL leave the index to the query planner" (`specs/rooms-api/spec.md:38`). This matches
  `rooms-query.ts:96-98`.
- **S3, CHANGELOG line in its own commit: still open.**
  - The history is unchanged. Fixing it would mean rewriting commits that are about to be pushed.
  - The finding remains a recommendation for future task plans.

### From `code-review.md` (51ad85307)

- **Code-review WARNING 1, service hint wiring not tested: resolved.**
  - `dashboard-ce/backend/test/support/recording-db.ts` adds a `Db` stand-in that records the operation, collection and
    `hint` of each `find`, `countDocuments` and `aggregate` call.
  - `test/unit/rooms-query.test.ts:241-290` drives the real `RoomsService.list` and checks the hint of each call:
    - `status=closed` (find and count on `status_createdAt_id`);
    - `mediaNode` ranked (aggregate and count on `mediaNode_status_createdAt_id`);
    - one feature ranked (`status_createdAt_id_egress`);
    - `q=room&status=closed` (page unhinted, count on `status_createdAt_id`), and ranked (aggregate and count on
      `status_createdAt_id`);
    - `q=room` alone (both unhinted);
    - several features (unhinted, page and ranked).
  - It also asserts exactly two calls per request.
  - `test/unit/egress.test.ts:153-181` covers the egress service: `q` with no hint on count, find and aggregate, and
    `roomSid_startedAt` with a room.
  - Each case named in the review is covered.
- **Code-review SUGGESTION 1, `countQuery` not on the testing entry: resolved.** `test/support/index.ts:13` exports it.
  Task 6.4 is checked.
- **Code-review SUGGESTION 2, selective egress prefix ranked by `endedAt` unasserted: resolved.**
  - `dashboard-ce/backend/test/integration/egress-query-plan.test.ts:236-238` now pins both `duration` and `endedAt` to
    `roomNameLower_startedAt` for the selective prefix.
  - This is the review's first proposed fix, applied in "Room-name prefix" instead of "Ranked sorts over 7 days".

## Review of the new diff

- The spec revisions validate strictly. The participants exception is scoped to the participants list without `room`,
  so the agents and in-room searches stay pinned. Their tests are unchanged and pass
  (`participants-query-plan.test.ts:282-285`, `:362-374`, `:392-402`).
- The candidate-set test fails closed. An empty `plan.indexes` fails the `length > 0` assertion, so `every` on an empty
  list cannot pass by itself.
- `recordingDb` covers only the cursor methods the services use (`sort`, `limit`, `project`, `toArray`). If a service
  starts calling another method, its unit test fails loudly, which is acceptable for a test double.
- No `src/` change, no contract, writer, index, UI or generator change, and no secrets. Everything is in English.
- No CHANGELOG line is needed, because the change is test- and spec-only.
- Commit subjects follow `openvidu-dashboard: …, change list-query-plans` and carry no AI attribution.

## Issues

### CRITICAL

None.

### WARNING

- **W1 (was W2). The 30-day premise of "Activity range over 30 days" stays unverified.**
  - Where: `dashboard-ce/backend/test/integration/ingress-query-plan.test.ts:138`, `specs/ingress-api/spec.md:19`.
  - The test explains over `ctx.range`. That is 2 days at S, and it will be 7 days in the group 7 M run.
  - No run explains the `createdAt` list over 30 days on a 30-day database, which the scenario's GIVEN/WHEN require.
  - The design (`design.md:262-265`) and `operations.md:11-13` state the gap and its cause (a 30-day M dataset does not
    fit the machine), but neither records that the owner accepted it.
  - Recommendation: the owner either accepts the gap (and the next report marks W1 accepted) or has the scenario's
    premise changed, in a later change because the scenario predates this one.

### SUGGESTION

- **S1 (was S3). CHANGELOG line in its own commit.**
  - Where: `CHANGELOG.md:133-134`. The line came in 7adc14ad1, separate from the behaviour commits.
  - Recommendation: in future task plans, put the CHANGELOG line in the first behaviour commit. Do not rewrite this
    history.
- **S2. `recording-db.ts` is the only `test/support/` module the testing entry does not export.**
  - Where: `dashboard-ce/backend/test/support/recording-db.ts:1`, `test/support/index.ts:5-23`.
  - `backend/AGENTS.md:84` says `test/support/` is exported to extending packages as
    `@openvidu-dashboard/backend/testing`, and the header of `index.ts` says the same.
  - Recommendation: add `recordingDb` and `RecordedCall` to `index.ts`, so a PRO service test can reuse it, or state in
    `backend/AGENTS.md` that unit-test doubles stay CE-internal.
- **S3. The service-hint unit tests have no task.**
  - Where: `openspec/changes/list-query-plans/tasks.md:122-131`, `:187-190`.
  - Tasks 4.6, 4.7 and 6.4 record the other review fixes. Commit 2496350e3 (the `RoomsService`/`EgressService` hint
    tests and `recording-db.ts`) has no task line, and the design does not mention them.
  - Recommendation: add a checked task, for example 2.4 "Unit-test the hints the rooms and egress services send", so
    the task list describes the change before the archive.

## Definition of Done (items the diff or the checks affect)

| Item                                                      | Status                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| All tasks checked                                         | Not met yet: 7.1 is pending (orchestrator, after this verification) |
| `scenarios` finds a passing test for every delta scenario | Met: 29/29, and the unit and integration suites pass             |
| `check` passes locally                                    | Met                                                              |
| Backend: `test-integration` passes                        | Met at scenario S. The M run of group 7 is pending               |
| Latest verification reports have no CRITICAL              | Met: this report, which supersedes `code-review.md`              |
| Refactor review applied or recorded                       | Met: `countQuery` is now exported as the design states           |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met. S2 is an optional AGENTS.md clarification                 |
| CI run of the push green                                  | Pending (not pushed)                                             |
| Change archived                                           | Pending                                                          |

The other items are unchanged since the full report: e2e, contract check and image are not applicable.

## Final assessment

No critical issues. 1 warning and 3 suggestions to consider. The owner still has to decide on W1, the unverified
30-day premise of the ingress scenario. The group 7 M run and the CI run of the push come before the archive.
