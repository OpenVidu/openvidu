# Design

## Context

See `proposal.md` for the motivation. What shapes the approach:

- `participantsListPlan` (`backend/src/participants/participants-query.ts`) hints an index only on the kind and status
  branch (`kind_status_joinedAt_id`). With `q` as an identity prefix it builds
  `{ [roomSid], identityLower: /^prefix/, joinedAt: <range>, [kind], [status] }` with no hint, for both lists; the
  agents list is the participants list with `kind: AGENT`.
- A prefix is a range on `identityLower`. `identityLower_joinedAt` and `roomSid_identityLower_joinedAt` return its
  matches ordered by identity first, so the plan is `SORT > FETCH > IXSCAN`: the sort keeps the page (`limit + 1`
  documents) and reads every match. No index of the contract, and no index that could be added, returns a prefix
  range in `joinedAt` order.
- The planner chooses per query. Probed on a throwaway MongoDB 8.3 with 120,000 synthetic sessions over 7 days, 1,183
  of them agents, and the six `participants` indexes of the contract (indicative figures: neither the generator's data
  nor the bundled 8.0.29):

  | Query (page of 100)                       | Winning plan                                        | Documents examined |
  | ----------------------------------------- | --------------------------------------------------- | ------------------ |
  | Participants, narrow prefix               | `SORT > FETCH > IXSCAN(identityLower_joinedAt)`     | 12                 |
  | Participants, broad prefix, 24 h          | `SORT > FETCH > IXSCAN(identityLower_joinedAt)`     | 1,062              |
  | Participants, broad prefix, 7 days        | `LIMIT > FETCH > IXSCAN(joinedAt_id)`, no sort      | 1,922              |
  | Participants, prefix and room             | `SORT > FETCH > IXSCAN(roomSid_identityLower_joinedAt)` | 0 to 1         |
  | Agents, prefix of every agent             | `SORT > FETCH > IXSCAN(kind_status_joinedAt_id)`    | 1,183              |
  | Agents, prefix of a third of the agents   | `SORT > FETCH > IXSCAN(identityLower_joinedAt)`     | 382                |
  | Agents, prefix without a match            | `SORT > FETCH > IXSCAN(identityLower_joinedAt)`     | 0                  |
  | Agents, prefix and room                   | `SORT > FETCH > IXSCAN(roomSid_identityLower_joinedAt)` | 1              |

  Every query answered in 10 ms or less. On `kind_status_joinedAt_id` the agents search sorts too: without a status
  the index is not in `joinedAt` order.
- The main spec's "Explain plans" says none of these sorts in memory. No test is titled after it: the suite's
  `identity prefix: …` test pins the index and never looks for a `SORT` stage.
- `openspec validate` refuses a MODIFIED requirement that omits a scenario of the main spec, and
  `./dashboard.sh scenarios` asks for a titled test for every scenario of a delta. "Index-backed participant queries"
  has three scenarios ("Explain plans", "Ranked sorts over 24 hours", "Publisher filter"); they predate the title
  rule and none has a titled test, though the suite asserts most of what they say under other titles.
- `agent-origin` adds "Origin explain plans" to another requirement of the same spec ("Origin filter of the agents
  list") and does not touch "Index-backed participant queries", so the two deltas apply in either order. Its test
  (`Origin explain plans` in the same suite) already exempts the identity searches from the no-sort assertion and
  stays as it is.
- Of the suite's p95 rows only the ranked sorts, the two origin rows and the exports are enforced; the 50 ms rows are
  reported. The agents list has no identity search row and no ranked row.

## Goals / Non-Goals

**Goals:**

- A spec that states what the identity searches do, for both lists, in words that "Origin explain plans" does not
  contradict.
- A titled test for each scenario of the corrected requirement, built from the tests the suite has.

**Non-Goals:**

- Changing any production query, index or budget.
- Pinning the planner's choice for an identity search.

## Data model

No collection, field, type, index or retention class changes; `SCHEMA_VERSION` and the legacy migration mapping are
untouched. The change reads the six `participants` list indexes the contract already has.

## API

No path, parameter or response changes; the OpenAPI document is untouched. Index backing each list query of the
participants and agents lists sorted by `joinedAt`, as measured (this table replaces the one of `agent-origin`'s
design, which its archive deletes):

| Filters                             | Index                                                                                     | Sort                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| none                                | `joinedAt_id`                                                                             | index order                  |
| `kind`, `status` (the agents list)  | `kind_status_joinedAt_id` (hint)                                                          | index order, merged          |
| `room`                              | `roomSid_joinedAt_id`                                                                     | index order                  |
| `q`                                 | planner's choice: `identityLower_joinedAt`, `kind_status_joinedAt_id` or `joinedAt_id`    | in memory, unless the range index returns the page in order |
| `q` and `room`                      | planner's choice: `roomSid_identityLower_joinedAt` or `roomSid_joinedAt_id`               | in memory, unless the range index returns the page in order |
| `publisher`, `origin`               | residual on the index of the other filters                                                | as the row of those filters  |
| `sort=leftAt`, `sort=duration`      | the index of the filters above                                                            | ranked in memory             |
| exact `PA_` SID                     | `_id`                                                                                     | point lookup                 |

## Performance budget

No query changes, so no budget changes: 50 ms for an index-ordered page (design figure, reported), 300 ms for a ranked
page and for a page with `origin` (enforced), 2 s for an export of 10,000 rows (enforced).

- Bound of an identity search: at most the sessions joined in the range, whichever index the planner takes (an
  identity index reads the matches of the prefix in the range; a range index reads its sessions in the range).
- The suite adds three rows to its p95 report: "Agents list, identity prefix" (50 ms, reported like its participants
  twin) and "Agents list, ranked by leftAt / duration (24 h)" (300 ms, enforced like the participants ones, since
  "Ranked sorts over 24 hours" names both lists).
- Verification: `backend/test/integration/participants-query-plan.test.ts`, at scenario S over 2 days on every run
  (CI included, where `DASHBOARD_TEST_LATENCY_BUDGETS=report` turns p95 overruns into warnings), and once at scenario
  M over 7 days, run alone by the orchestrator before the archive with the command of `backend/AGENTS.md` and recorded
  in `operations.md` (owner's answer 3). Plan assertions fail at either size.

## Decisions

1. **Correct the spec; change no query** (owner's answer 1). The planner already takes the cheaper scan for each
   prefix, and the sort keeps one page. Rejected: hinting the agents identity searches with the existing indexes
   (`kind_status_joinedAt_id` with the status as `$in` and the identity as residual; `roomSid_joinedAt_id` with a
   room), which removes the sort but makes a selective search fetch every agent session of the range (0 → 1,183
   documents in the probe, with no range cap on the default sort), the realistic case when looking for one
   `agent-AJ_…` identity; adding `identityLower` to the keys of the kind and status index, a contract and writer change
   for a query that answers in milliseconds.

2. **Both lists in one requirement** (owner's answer 2). The participants list runs the same query without the kind,
   so the same sentence, scenario and test cover it. A hint was never an option there: it would scan every session of
   the range.

3. **MODIFIED "Index-backed participant queries", scenario names kept.** The requirement text and "Explain plans"
   change; "Ranked sorts over 24 hours" and "Publisher filter" are carried verbatim, because a MODIFIED block
   replaces the whole requirement. Rejected: REMOVED plus a renamed requirement (nothing forces a rename here);
   touching "Origin explain plans" (true as written, and its requirement is not in the main spec until
   `agent-origin` is archived).

4. **The identity searches may sort; the spec does not say they must.** A range index can return the page in order
   (the probe saw `joinedAt_id` do it for a broad prefix), so the scenario allows the sort and the test asserts it
   only where it is structural: a plan on `identityLower_joinedAt` or `roomSid_identityLower_joinedAt` has a `SORT`
   stage.

5. **One allowed set of indexes for every identity search, no pinned index.** The five list indexes:
   `identityLower_joinedAt`, `roomSid_identityLower_joinedAt`, `joinedAt_id`, `kind_status_joinedAt_id` and
   `roomSid_joinedAt_id`. The suite's current pins (`identityLower_joinedAt` for `q`,
   `roomSid_identityLower_joinedAt` for `q` and `room`, also in the ranked test) hold on generated data today but
   bind the planner to a choice the product does not make; they become "one index, in the set". Rejected: a set per
   combination (more text for the same guarantee: an index of the contract and a bounded scan).

6. **Retitle and regroup, do not duplicate.** In the `lists` block of the suite:

   | Today                                                              | After                                                              |
   | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
   | `no filter: joinedAt_id without a sort`                            | `Explain plans: no filter on joinedAt_id without a sort`           |
   | `room: roomSid_joinedAt_id without a sort`                         | `Explain plans: room on roomSid_joinedAt_id without a sort`        |
   | `kind and status: kind_status_joinedAt_id merged without a sort, also for the agents list` | `Explain plans: kind, status and publisher on kind_status_joinedAt_id without a sort, also for the agents list` (adds `status=active&publisher=true`) |
   | `identity prefix: identityLower_joinedAt within the prefix range`  | `Explain plans: identity searches of both lists` (rewritten, below) |
   | `summary: active sessions through the status indexes, …`           | `Explain plans: summary through the status indexes and joinedAt_id` |
   | `ranked by %s: the range index of the filters, …`                  | `Ranked sorts over 24 hours: by %s` (range set to the last 24 hours; adds the agents list with `q`) |
   | `publisher: kind_status_joinedAt_id with isPublisher residual`     | `Publisher filter: kind_status_joinedAt_id with isPublisher residual` (adds: no `SORT` stage) |

   `Explain plans: identity searches of both lists` explains, sorted by `joinedAt`: the participants list with `q`,
   with `q` and `room`, with `q` and `kind`, with `q` and `status`; the agents list (the filter
   `ParticipantsService.agents()` builds, through the suite's `agentsFilter`) with `q`, with `q` and `room`, with `q`
   and `status`. For each: no `COLLSCAN`; exactly one index, in the set of decision 5; `totalDocsExamined` at most the
   sessions joined in the range (`countDocuments` of the plan's `joinedAt` bounds, as `Origin explain plans` computes
   it); and a `SORT` stage when the index is one of the two identity indexes. The other `Explain plans` tests keep
   their `not.toContain('SORT')`.

   The tests `export at the row cap: …`, `SID: _id`, `Origin explain plans` and the cursor walks keep their titles and
   bodies: they belong to other scenarios.

7. **The ranked test bounds identity searches by the range, as its scenario says.** `explainFilter` bounds a ranked
   plan by the documents matching the filter; with `q` the planner may scan a range index and examine more than the
   matches, so those cases pass the sessions joined in the range as the bound and accept any index of the set.

8. **The p95 of the ranked sorts moves to a test titled after its scenario.** `Ranked sorts over 24 hours: p95 of a
   page` measures the two ranked rows of the participants list and the two new ones of the agents list, enforces 300
   ms through `expectWithinBudgets` and appends them to the suite's one report; `reports the p95 of every budgeted
   query` keeps the other rows and gains "Agents list, identity prefix". The report keeps one header whichever test
   writes first. Rejected: leaving the ranked rows in the untitled report test (the scenario's p95 clause would have
   no titled test); a p95 row per identity search combination (nothing is budgeted there beyond the 50 ms design
   figure).

9. **No CHANGELOG line, no `AGENTS.md` change.** Nothing observable changes, and no command, path or convention does.

## Test strategy

One file, `dashboard-ce/backend/test/integration/participants-query-plan.test.ts`, Vitest project
`integration-plans` (MongoDB through Testcontainers, Docker).

| Scenario                   | Tests (titles of decision 6 and 8)                                              | Level       |
| -------------------------- | ------------------------------------------------------------------------------- | ----------- |
| Explain plans              | the five `Explain plans: …` tests                                               | integration |
| Ranked sorts over 24 hours | `Ranked sorts over 24 hours: by %s`, `Ranked sorts over 24 hours: p95 of a page` | integration |
| Publisher filter           | `Publisher filter: kind_status_joinedAt_id with isPublisher residual`           | integration |

## Risks / Trade-offs

- [`agent-origin` changes "Origin explain plans" or the suite before its archive] → Task 1.1 re-reads the synced spec
  and the suite before the apply; a difference goes back to the proposer as a revision.
- [At scenario M the planner takes an index outside the set, or two indexes, for an identity search] → The plan
  assertion fails; stop and ask instead of widening the set.
- [The scenarios say "scenario M" and CI runs scenario S] → Accepted by the owner with one recorded run at M over 7
  days before the archive (group 3).
- [A broad prefix over a long range sorts every match; the default sort has no range limit] → Existing behaviour,
  now stated; the sort keeps one page (or the export cap) in memory. A range limit or a hint stays possible in a later
  change without touching the API.
- [The probe figures come from synthetic data on MongoDB 8.3] → They only illustrate the plans; the assertions run on
  generated data on the bundled 8.0.29, and the M run records the real figures.
- [Splitting the p95 test changes the order of the report rows] → The report is read by people, not parsed.

## Migration Plan

Nothing is deployed: a test commit and, at the archive, the spec sync. Rollback: revert the test commit; the spec
correction can stay, since it describes what the queries do with or without it.
