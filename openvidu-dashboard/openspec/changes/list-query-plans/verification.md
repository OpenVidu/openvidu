# Verification Report: list-query-plans

- Date: 2026-11-18
- Mode: full
- Verified commit: `51ad853077d983d2a1c2b612ae4f972f00295db4` (range `origin/master` bad4c47ba..HEAD, not pushed;
  c71abee98 is a direct generator-test fix outside the change, approved by the owner)
- Working tree: clean

## Commands run

| Command                                       | Result                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `./dashboard.sh check`                        | Pass: lint, format, typecheck, `openspec validate --all --strict` (31/31), unit tests (backend 257, frontend 631, typings 110, tooling 136) |
| `./dashboard.sh scenarios list-query-plans`   | 29 scenarios, 0 without a test                                            |
| `./dashboard.sh test-integration` (Docker)    | Pass: 22 files, 278 tests, none skipped (plan suites at scenario S, 2 days) |
| `./dashboard.sh e2e`                          | Not applicable: no frontend or e2e file changes                           |

Recorded, not checked: nothing yet in `operations.md` beyond owner decisions. Group 7 (the four plan suites at scenario
M over 7 days) and the CI run of the push are orchestrator work after this verification.

## Summary

| Dimension    | Status                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| Completeness | 19/20 tasks (7.1 is orchestrator work after verification, pending); 6 ADDED/MODIFIED reqs found in code |
| Correctness  | 6/6 reqs implemented; 29/29 scenarios with a passing test, 2 with partial assertions (warnings) |
| Coherence    | Design followed; one design/tasks inconsistency (W2)                                       |

Requirements (all MODIFIED or ADDED; no REMOVED or RENAMED):

- participants-api: Index-backed participant queries (MODIFIED), Origin filter of the agents list (MODIFIED), Identity
  search plans (ADDED): `dashboard-ce/backend/src/participants/participants-query.ts:146-193`.
- rooms-api: Index-backed room queries (MODIFIED), Room list plans (ADDED):
  `dashboard-ce/backend/src/rooms/rooms-query.ts:93-105`, `:157-181`; hints passed in `rooms-service.ts:73,80,92-93`
  and `rooms-repository.ts:37-50`.
- egress-api: Index-backed egress queries (MODIFIED): `dashboard-ce/backend/src/egress/egress-query.ts:59-64`,
  `egress-service.ts:57,68,86-88`, `egress-repository.ts:59-61`.
- ingress-api: Index-backed ingress queries (MODIFIED): spec correction only; bound asserted in
  `test/integration/ingress-query-plan.test.ts:83-88`.

## Completeness

- Task 7.1 (orchestrator, M run of the four suites) is unchecked by design: pending, not a finding.
- Every ADDED/MODIFIED requirement has an implementation matching its text: the agents and service-kind identity
  search on `kind_status_joinedAt_id` (merged, prefix residual) for page, ranked and `total`; the participants identity
  search without a room unhinted; room status, media node and single-feature pins with explicit `countHint`; several
  features never pinned; `q` with a status pinning the status (or media node) index for ranked and `total` only; egress
  `q` without `room` unhinted and read through `sortedPage`.

## Correctness: scenario coverage

Tests were read against each scenario. Covered by tests that assert what the scenario states: Explain plans, Publisher
filter, Origin explain plans (exact index per combination, no `SORT` outside ranked and `q`+`room`), Selective
identity prefix, Broad identity prefix, Identity prefix with a status, Agents identity prefix, Identity prefix of a
service kind, Identity prefix within a room, Identity search latency (enforced through `expectWithinBudgets`), the five
untouched origin API scenarios, rooms Explain plans on the generated database, Ranked sorts over 7 days (rooms and
egress), Name prefix within one node, Hinted room filters, Several features (plan plus `items` and `total` against the
union), Selective room name prefix, Broad room name prefix, Room-name prefix (egress), Ingress name prefix.

Partially covered: Ranked sorts over 24 hours (W1) and Activity range over 30 days (W2).

## Coherence

- Design decisions 2-13 are followed: one shared `kindAndStatus` builder, `countHint` set explicitly on every pinned
  page plan, `roomNameLower_startedAt` removed from `EgressesIndex`, `countQuery` added to `test/support/query-plan.ts`
  as the refactor review records (decision 13), the `user-` rewrite documented in the suite header.
- No index, contract, writer, UI or generator change. No secrets. Artifacts and code in English. `README.md` and the
  `AGENTS.md` files need no change (no command, path or convention changes).
- CHANGELOG: one line under `3.10.0` → `Improved` → `Data` (`CHANGELOG.md:133-134`), the proposal's text.
- Commits follow `openvidu-dashboard: …, change list-query-plans`, with no AI attribution.

## Issues

### CRITICAL

None.

### WARNING

- **W1. Scenario partly covered: Ranked sorts over 24 hours (participants).**
  `dashboard-ce/backend/test/integration/participants-query-plan.test.ts:287-295`. The scenario
  (`specs/participants-api/spec.md:23`) states that each plan scans a named index "or `status_kind` for an identity
  search with `status`". For `q=user` and `q=user&status=active`, the test asserts only no `COLLSCAN` and the bound,
  and records the index in a label. It never checks the index. The design's Context (`design.md:122`) says that with
  `status=active` the planner picks `status_lastStatsAt_open` for the count. A ranked sort keeps no order either, so
  `status_lastStatsAt_open` may win there too and break the spec's index list without any test failing. The p95 clause
  is not measured with `q` either (S1 below).
  Recommendation: assert that the ranked plans' indexes lie in the set the scenario names, or widen the scenario to
  the planner's real candidates (`status_lastStatsAt_open` included), in line with design decision 12.
- **W2. Scenario not exercised at 30 days: Activity range over 30 days (ingress).**
  `dashboard-ce/backend/test/integration/ingress-query-plan.test.ts:138` explains over `ctx.range`, which is 2 days
  at S and 7 days in the M run. Design decision 12 (`design.md:258-259`) says "the 30 days come from the M run", but
  task 7.1 (`tasks.md:179-181`) sets `<PREFIX>_PLAN_DAYS=7` for every suite. With the current tasks, no run explains
  the `createdAt` list over 30 days on a 30-day database, which the scenario's GIVEN/WHEN require. The scenario text
  is carried over from the main spec, and the change gives its test the scenario title.
  Recommendation: run the ingress suite in task 7.1 with `INGRESS_PLAN_DAYS=30`, or correct design decision 12 and
  record the gap for the owner.

### SUGGESTION

- **S1. The p95 of ranked identity searches is not measured.**
  `dashboard-ce/backend/test/integration/participants-query-plan.test.ts:572-578` measures `List, ranked by …
  (24 h)` without `q`. The modified scenario "Ranked sorts over 24 hours" also states the 300 ms p95 with `q`. The
  "Identity search latency" rows cover only `sort=joinedAt`. Recommendation: add a ranked row with `q=user` over
  24 hours, or narrow the scenario's p95 clause.
- **S2. Spec wording of "Room list plans" with `mediaNode` and several features.**
  `specs/rooms-api/spec.md:36-40` says several features "SHALL leave the index to the query planner". The code
  (`dashboard-ce/backend/src/rooms/rooms-query.ts:96-98`) and the unit test (`test/unit/rooms-query.test.ts:137`)
  pin `mediaNode_status_createdAt_id` when `mediaNode` comes with several features, which the design table allows
  (`design.md:73`) and is correct, because the features are residual on a full-coverage index. Recommendation: write
  "several features without `mediaNode`" in the requirement before the archive.
- **S3. CHANGELOG line in its own commit.** The line came in 7adc14ad1, not with the backend commits it describes
  (296ee1dea, eb930f85a, a81e4f86d), which deviates from the `AGENTS.md` rule "written in the same commit as the
  change". Task 6.1 planned it that way, and pushed-to-be history should not be rewritten for this. Recommendation:
  put the CHANGELOG line into the first behaviour commit in future task plans.

## Definition of Done

| Item                                                                 | Status                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| All tasks checked                                                    | Not met yet: 7.1 (orchestrator, after this verification) pending    |
| `scenarios` finds a passing test for every delta scenario            | Met (29/29; unit and integration suites pass)                       |
| `check` passes locally                                               | Met                                                                 |
| CI run of the push green                                             | Pending (not pushed)                                                |
| Backend: `test-integration` passes                                   | Met (scenario S); the M run of group 7 is pending                   |
| UI: `e2e` with axe and both themes                                   | Not applicable                                                      |
| Data contract: `contract-check`                                      | Not applicable (no contract change)                                 |
| Image or runtime dependency: `build-image`, `smoke-image`            | Not applicable                                                      |
| Latest verification reports have no CRITICAL                         | Met (this report); `code-review.md` not present at verification time |
| Refactor review applied or recorded                                  | Met (`countQuery` helper, design decision 13)                       |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change          | Met (one CHANGELOG line; README and AGENTS.md unaffected)           |
| Change archived                                                      | Pending                                                             |

## Final assessment

No critical issues. 2 warnings and 3 suggestions to consider. Before the archive, the scenario M run of task 7.1 and
the CI run of the push are still to come, and W2 decides how that run covers the 30-day ingress scenario.
