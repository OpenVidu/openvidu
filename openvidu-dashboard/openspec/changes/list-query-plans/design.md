# Design

## Context

See `proposal.md` for the motivation. What shapes the approach:

- **How each list builds its plan today:**
  - `participantsListPlan` (`backend/src/participants/participants-query.ts`) pins an index on every branch but the
    plain one, since 5be251ce0. The identity branch builds
    `{ [roomSid], identityLower: /^prefix/, joinedAt, [kind], [status], [isPublisher], [origin] }` on
    `identityLower_joinedAt`, or on `roomSid_identityLower_joinedAt` with a room. `ParticipantsService.agents()` calls
    it with `kind: [AGENT]`, so the agents list and `?kind=AGENT` on the participants list build the same query.
  - `roomsListPlan` (`rooms/rooms-query.ts`) pins nothing. Its precedence: `q`, then `mediaNode`, then features (one
    `$or` branch per feature), then the status.
  - `egressesListPlan` (`egress/egress-query.ts`) pins every branch. The `q` branch is read through `sortedPage`
    (sort on `{ startedAt, _id }`) on `roomNameLower_startedAt`.
  - `ingressesListPlan` ranks every page over a three-branch `$or` and pins nothing.
- **How the planner behaves on these collections (MongoDB 8.0.29):**
  - A plan with a blocking in-memory sort returns nothing during the trial run. A page sorted by the range field
    therefore never picks an index that is not in that order unless every candidate sorts. This is why a broad
    prefix pages through the time index and a selective one through the prefix index, which reaches EOF first.
  - A ranked sort or a count has no order to keep, so every candidate that reads matching documents at the same rate
    ties. Ties seen:
    - agents `q=agent`: `kind_status_joinedAt_id` 24/50 against `identityLower_joinedAt` 24/50 at S. This is the CI
      failure.
    - rooms ranked with `status=closed`: `status_createdAt_id` 101/101 against `status_endedAt_id` 101/101 at S and
      at M.
    - rooms ranked with a broad prefix and `status=closed`: a three-way tie at M that includes `status_endedAt_id`.
  - `status_endedAt_id` has no `createdAt` key, so it reads every closed room of the retention: 12,600 at M over
    7 days, where `status_createdAt_id` reads the closed rooms of the range.
  - Hinting one feature's partial index on the several-features `$or` is accepted without error and returns wrong
    rows. In a throwaway 8.0.29 probe, the hinted count was 618 where the true count is 954: rooms with only the
    other feature were missing.
  - The prefix indexes `{ identityLower, joinedAt }` and `{ nameLower, createdAt }` seek once for each distinct
    value of the prefix in the whole collection. Their key cost grows with retention, not with the range: 334 ms for
    a 24 h participants search with 4 weeks of history.
- **Measurements:** the orchestrator measured at scenario M over 7 days on a throwaway 8.0.29. The participants data
  is in its scratchpad `round1.txt` and `round2.txt`; the 24 h cost with 1 and 4 weeks of history is in
  `retention.txt`; the planner trials at S and M are in `margins-*.json`; egress and ingress are in
  `egress-ingress-m.txt`. The figures below are the p95 of the page plus `total`, run in parallel as the services run
  them.

## Goals / Non-Goals

**Goals:**

- The plan that measures fastest at scenario M for each list query, deterministic wherever the planner can tie.
- Plan tests that assert the plan of each case on prefixes built to reach it.

**Non-Goals:**

- A new or removed index, and pinning by selectivity: no pre-count chooses a plan.
- Plans of the summary, detail, overview and analytics queries.

## Data model

No collection, field, type, index or retention class changes. `SCHEMA_VERSION`, the validator and the legacy
migration mapping are untouched.

## API

No path, parameter or response changes. The OpenAPI document is untouched. The index behind each list query after
the change ("hint" = pinned on the page, the ranked sorts and `total` unless the row says otherwise):

| List         | Filters                                             | Index                                                                                                           |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| participants | none                                                | `joinedAt_id` (only candidate)                                                                                  |
| participants | `kind`, `status`                                    | `kind_status_joinedAt_id` (hint), merged                                                                        |
| participants | `room`, with or without `q`                         | `roomSid_joinedAt_id` / `roomSid_identityLower_joinedAt` (hint)                                                 |
| participants | `q`, `kind` absent or including `STANDARD`          | planner: `identityLower_joinedAt`, `joinedAt_id`, `status_kind`, `status_lastStatsAt_open`                      |
| participants | `q`, `kind` without `STANDARD`; agents list `q`     | `kind_status_joinedAt_id` (hint), merged, prefix residual                                                       |
| rooms        | none                                                | `createdAt_id` (only candidate)                                                                                 |
| rooms        | `mediaNode` (features residual)                     | `mediaNode_status_createdAt_id` (hint)                                                                          |
| rooms        | one feature                                         | `status_createdAt_id_<feature>` (hint)                                                                          |
| rooms        | status                                              | `status_createdAt_id` (hint)                                                                                    |
| rooms        | several features                                    | planner: one partial index per `$or` branch, merged                                                             |
| rooms        | `q`                                                 | planner; with a status, ranked and `total` hint `mediaNode_status_createdAt_id` (with `mediaNode`) or `status_createdAt_id` |
| egress       | `room` / status / none                              | `roomSid_startedAt` / `status_startedAt` / `startedAt_id` (hint, unchanged)                                     |
| egress       | `q` without `room`                                  | planner: `roomNameLower_startedAt`, `startedAt_id`, `status_startedAt`                                          |
| ingress      | any                                                 | planner over the three branches (unchanged)                                                                     |

`publisher` and `origin` stay residual filters on the index of their branch, and an exact SID or id stays a point
lookup.

## Performance budget

- **Identity searches.** A page plus its `total`, through the service, p95 within 300 ms, enforced:
  - participants list with one whole identity;
  - participants list with `q=user`;
  - agents list with `q=user`;
  - agents list with one agent identity.

  Measured at M over 7 days: 1.1 ms, 56.7 ms, 2.0 ms and 2.9 ms. On the broad search, the covered `total` takes 48 of
  the 56.7 ms. These rows replace "List, identity prefix" (50 ms, reported). The same searches ranked by `duration`
  over 24 hours get rows of 300 ms each, enforced like the other ranked sorts.
- **Rooms.** Every ranked row stays at 300 ms, enforced. One row is added: ranked by `endedAt` with `q=room&status=closed`
  (the name-prefix-with-status hint), measured at M at 64 ms over 7 days.
- **Egress.** The current prefix row is broad (`roo`), and a row for one room's name is added; both are within
  200 ms, enforced. Measured at M: 9.0 ms broad and 8.6 ms selective, unhinted.
- **Every other budget is unchanged.**
- **Verification.**
  - The four plan suites run at scenario S over 2 days on every run. CI sets `DASHBOARD_TEST_LATENCY_BUDGETS=report`,
    so p95 overruns are warnings there and plan assertions fail.
  - The orchestrator runs each suite once at scenario M over 7 days, alone, with the command of `backend/AGENTS.md`.
    A failed plan assertion or an enforced overrun at M goes to the owner.

## Decisions

1. **The plan that measures fastest at M, pinned only where the planner loses or can tie.** This supersedes
   `agents-identity-search-plan`, which left every identity search to the planner. Rejected:
   - every branch pinned (5be251ce0): it loses on the participants and egress searches;
   - nothing pinned: the agents search and the rooms ranked sorts tie.

2. **Participants identity search without a room: no pin.** Page, ranked and `total` go to the planner. The figures:

   | Case (7 d unless stated)                    | Pinned `identityLower_joinedAt` | `joinedAt_id` | Planner |
   | ------------------------------------------- | ------------------------------- | ------------- | ------- |
   | Prefix shared by 99.5%                      | 222 ms                          | 146 ms        | 57 ms   |
   | Same over 24 h, 4 weeks of history          | 334 ms                          | 23 ms         | 22 ms   |
   | Selective (16 matches)                      | 1 ms                            | 179 ms        | 1 ms    |
   | Prefix with `status=active`                 | 27 ms                           | 169 ms        | 6.6 ms  |

   With `status=active`, the planner picks `status_kind` for the page and `status_lastStatsAt_open` for the count. The
   plan cache replans when one query shape moves from a selective to a broad prefix.

3. **Agents list, and a participants list whose kinds exclude `STANDARD`: `kind_status_joinedAt_id`, merged.**
   - The `q` branch without a room is built as the kind and status branch builds it: `kind` as one value or `$in`,
     `status` as given or `$in` every status. The identity prefix, `isPublisher` and the origin are residual filters,
     and the plan is pinned on the page, the ranked sorts and `total`. Both branches build their filter with one
     shared local function.
   - The condition is "`kind` given and without `STANDARD`". `agents()` passes `[AGENT]`, so both lists take the
     branch with no new flag (owner's answer 1). With `STANDARD` among the kinds, the query is the participants case
     of decision 2.
   - Figures at M:
     - prefix that no agent has: 231 ms → 2 ms;
     - every agent: 4.1 ms → 2.9 ms, with no sort;
     - one agent: 0.9 ms → 2.9 ms (675 documents instead of 1).

     The read is capped by the sessions of those kinds in the range.
   - Rejected: the planner (it ties at S and sorts); `identityLower_joinedAt` (231 ms).

4. **Branches with a room and the kind and status branch keep their pins.** With a room, every candidate answers in
   1 ms or less at M.

5. **Rooms: pin the status, media node and single-feature branches for the page, the ranked sorts and `total`.**
   - The `page` plan gains two optional fields: `hint` for the find and `countHint` for `total`. Every pinned plan
     sets `countHint` explicitly; it is never inferred from `hint`.
   - The `ranked` plan gains an optional `hint`, used for the match and for `total`.
   - `RoomsRepository.list` and `count` take an optional hint; `ranked` already passed one through `rankedPage`.
     For these branches, the query `total` runs is the page filter without the cursor condition, so the same index
     serves it. The owner accepted the `total`.
   - At M the trials are clear for the media node (101/203 against 70/203) and the feature (101/203 against 57/203),
     and tied for the status ranked sort.
   - The branch with no filter has one candidate and stays unpinned.

6. **Several features: never pinned.** One hint covers the whole `$or`.
   - A partial index returns wrong rows (Context).
   - `status_createdAt_id` is correct but reads 452 documents where the planner's merge of the partial indexes reads
     101.
   - A unit test guards that this branch has no hint. The plan suite checks that its rows and `total` equal the
     union of the features.

7. **Rooms name prefix: planner, except the ranked sorts and `total` with a status.**
   - **Why the page cannot pick `status_endedAt_id`:** the page sorts on `{ createdAt, _id }`, so that index needs a
     blocking sort over every closed room. `status_createdAt_id` or `createdAt_id` always returns results first. It
     scored 0 in every page trial at S and M.
   - **Where it can win:** a ranked sort or a count with a status equality keeps no order. There, `status_endedAt_id`
     reads matches at the rate of the indexes the range bounds. A broad prefix ties three ways. A medium prefix over
     24 hours can tip the trial to it by sampling. Without a status, `status` is the index's leading field and the
     index is not eligible.
   - **The fix:** when `q` comes with a status, the ranked sort and `total` pin `mediaNode_status_createdAt_id` with
     `mediaNode`, and `status_createdAt_id` otherwise. Both are bounded by the rooms of that status created in the
     range. The page stays with the planner: its plan has no `hint` and carries the pin in `countHint`.
   - **Cost**, measured on the M database (planner → pin):

     | Case                       | `total`         | Ranked         |
     | -------------------------- | --------------- | -------------- |
     | Selective, 7 d             | 4 ms → 38 ms    | 5 ms → 38 ms   |
     | Selective, 24 h            | 3 ms → 5 ms     | 5 ms → 5 ms    |
     | Broad, 7 d                 | equal (36 ms)   | equal (64 ms)  |
     | Broad, 24 h                | equal (5 ms)    | equal (6 ms)   |

     The pin never costs more than the same request without `q`.
   - Rejected:
     - pinning `nameLower_createdAt`: 41 ms instead of 6 ms for a broad search over 24 h with 7 days of rooms, and
       its keys scale with the 90-day room retention;
     - a redundant `endedAt >= from` condition: `endedAt` is optional in the contract, and it leaves the index
       unbounded when `to` is in the past;
     - relying on the tie-break order of index creation: fragile, and a medium prefix escapes it;
     - removing `status_endedAt_id`, which no dashboard query uses: a contract and writer change.
   - **Accepted:** without a status, a broad prefix ranked ties `nameLower_createdAt` with `createdAt_id`. Both read
     at most the rooms of the range, as in the participants case of decision 2.

8. **Egress room-name search without a room: no pin** (owner's answer 3).
   - The plan type makes `hint` optional, and `roomNameLower_startedAt` leaves the `EgressesIndex` type.
   - The service reads a `q` page without a hint through `sortedPage`, sorted on `{ startedAt, _id }`. Its count
     and ranked sort run without a hint; `EgressRepository.count` takes an optional hint.

   | Case (M)                    | Pinned `roomNameLower_startedAt` | Planner |
   | --------------------------- | -------------------------------- | ------- |
   | Broad, 7 d                  | 17.4 ms                          | 9.0 ms  |
   | Broad, 24 h                 | 15.6 ms                          | 3.9 ms  |
   | Selective or no match       | ≤ 2 ms                           | ≤ 2 ms  |

   The pinned 24 h count reads the 4,182 keys of the whole collection. With a status, the planner picks
   `status_startedAt` when the status is the selective part and the name index otherwise, ≤ 16 ms in every case.
   Every egress index has `startedAt`, so no candidate escapes the range, as `status_endedAt_id` does for rooms.
   Rejected: pinning `startedAt_id`, which reads all 4,182 egresses for a selective prefix.

9. **Ingress: spec correction only.** The planner picks `nameLower_createdAt` for a selective prefix and
   `createdAt_id` for a broad one, ≤ 11 ms at M. The bound "the ingresses of the three branches" is false for a
   prefix: on the M database, over the last hour, one ingress was examined where the branches held none. The bound
   now adds the ingresses whose name starts with the prefix.

10. **Specs:**
    - The four "Index-backed … queries" requirements are MODIFIED. "Identity search plans" and "Room list plans" are
      ADDED. "Origin filter of the agents list" is MODIFIED for "Origin explain plans", with its text and other
      scenarios carried verbatim.
    - `openspec validate` refuses a MODIFIED requirement that drops or renames a scenario of the main spec. That
      leaves "Explain plans on the generated database" in rooms, egress and ingress, and "Ranked sorts over 7 days"
      in rooms and egress, under the same name.
    - Their tests carry the list in the detail, for example `Explain plans on the generated database: rooms, …`.
      Each suite thus supplies one test per shared name, and `./dashboard.sh scenarios` maps the title to every
      capability that has it.
    - Rejected: ADDED requirements beside untouched texts. The ingress text and two scenarios are false after the
      change.

11. **Purpose-built prefixes in the participants suite.**
    - After `generate`, `beforeAll` rewrites every STANDARD session of the suite's own database with an update
      pipeline: `identity` and `identityLower` get the `user-` prefix. It then reloads the sample session.
    - The cases are:
      - selective: the sample's whole `identityLower`;
      - broad: `user`, about 95% of the sessions;
      - matches no agent: `user` on the agents list;
      - one agent: one generated agent identity.
    - The rewrite runs at every scenario, so the M run covers the same cases. At S, the trial winner is structural:
      the identity index reaches EOF first for one identity, and the time index returns a page while the identity
      plan still sorts for `user`.
    - No mid-selectivity prefix is tested, because the planner's choice flips there.
    - Rooms, egress and ingress need no rewrite: generated names are `room-…` and `ingress-…`, so `room` and
      `ingress` are broad, and one name minus its last character is selective.
    - Rejected: a generator option. It changes a shared tool and the demo data for a test need.

12. **What the plan tests assert:**
    - Each case asserts its index when the plan is pinned, or when the planner's choice is structural (decision 11).
    - Otherwise it asserts no `COLLSCAN`, the sort expectation and a bound on `totalDocsExamined`:
      - a broad prefix, or a prefix with a status, on the participants list;
      - the rooms broad prefix ranked without a status;
      - the ingress prefixes.
    - `total` is explained as `countDocuments` runs it: `$match` then `$group`, with the same hint. One helper,
      `countQuery(collection, match, hint?)` in `backend/test/support/query-plan.ts`, builds that explain for the
      participants, rooms and egress suites. It is exported through `@openvidu-dashboard/backend/testing` with the
      rest of `test/support/`. There is no shared helper for the in-range bounds.
    - The helpers of the rooms and egress suites pass the plan's hint, as the services do.
    - Where the identity-search scenarios explain the page and `total`, they use the suite's range; only
      `sort=duration` runs over 24 hours, because the sample identity may have no session in the last day.
    - The ranked cases of the unhinted participants identity search assert membership in the planner's candidates
      named by "Ranked sorts over 24 hours": `identityLower_joinedAt`, `joinedAt_id`, `kind_status_joinedAt_id` (with
      `kind`), and with `status` also `status_kind` or `status_lastStatsAt_open`. They also assert its bound.
    - Selective room-name and egress cases are bounded by the matches in the range, which is tighter than the bound
      the scenarios state.
    - `Activity range over 30 days` is only retitled. That scenario predates this change and is carried unchanged.
      At S it runs over the suite's 2-day range. The M run is 7 days for every suite, because a 30-day M dataset does
      not fit the verification machine, so its 30-day premise stays unverified at M. The orchestrator records the gap
      in `operations.md`.
    - The rooms, egress and ingress export, cursor-page and summary plan tests carry the
      `Explain plans on the generated database: <list>, …` titles.
    - New budget rows:
      - "Identity search latency": four rows, 300 ms, enforced;
      - the participants and agents identity searches ranked by `duration` over 24 hours (selective, broad and agents
        prefixes): 300 ms each, enforced like the other ranked rows;
      - "List, ranked by endedAt, prefix and status closed": 300 ms, enforced;
      - "List, room name prefix of one room": 200 ms, enforced like every egress row.

13. **Code structure.**
    - The participants plan keeps one `index` choice, now dependent on the kinds. The rooms plan returns `hint` and
      `countHint` next to the filters it already returns.
    - No new production abstraction. `RoomsRepository.list` and `count`, and `EgressRepository.count`, gain an
      optional hint parameter. The refactor review added only the test helper `countQuery` (decision 12).

14. **CHANGELOG and AGENTS.md.**
    - One line under `Improved` → `Data` (proposal).
    - No `AGENTS.md` or `README.md` change, since no command, path or convention changes. The test-only `user-`
      rewrite is documented in the participants suite's header comment.

## Test strategy

| Scenario                                  | Test (title prefix)                                                                   | File                                   | Level       |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| Explain plans                             | `Explain plans: …` (the retitled index-order and summary tests)                      | `participants-query-plan.test.ts`      | integration |
| Ranked sorts over 24 hours                | `Ranked sorts over 24 hours: by %s`                                                   | `participants-query-plan.test.ts`      | integration |
| Publisher filter                          | `Publisher filter: …`                                                                 | `participants-query-plan.test.ts`      | integration |
| Origin explain plans                      | `Origin explain plans` (exact index per combination); unit `Origin explain plans: …` | plan suite; `unit/participants.test.ts` | integration, unit |
| OpenVidu agents only … Exact SID ignores the origin | existing titled tests, unchanged                                            | `participants-api.test.ts`             | integration |
| Selective identity prefix                 | `Selective identity prefix: …`                                                        | plan suite; unit                       | integration, unit |
| Broad identity prefix                     | `Broad identity prefix: …`                                                            | plan suite                             | integration |
| Identity prefix with a status             | `Identity prefix with a status: …`                                                    | plan suite                             | integration |
| Agents identity prefix                    | `Agents identity prefix: …`                                                           | plan suite; unit                       | integration, unit |
| Identity prefix of a service kind         | `Identity prefix of a service kind: …`                                                | plan suite; unit                       | integration, unit |
| Identity prefix within a room             | `Identity prefix within a room: …`                                                    | plan suite                             | integration |
| Identity search latency                   | `Identity search latency: p95 of a page and its total`                               | plan suite                             | integration |
| Explain plans on the generated database   | `…: rooms, …`, `…: egress, …`, `…: ingress, …`                                        | rooms, egress, ingress plan suites     | integration |
| Ranked sorts over 7 days                  | `Ranked sorts over 7 days: rooms by %s`, `…: egress by %s`                            | rooms, egress plan suites              | integration |
| Name prefix within one node               | `Name prefix within one node: …`                                                      | `rooms-query-plan.test.ts`             | integration |
| Hinted room filters                       | `Hinted room filters: …`                                                              | rooms plan suite; `unit/rooms-query.test.ts` | integration, unit |
| Several features                          | `Several features: …`                                                                 | rooms plan suite; unit                 | integration, unit |
| Selective room name prefix                | `Selective room name prefix: …`                                                       | rooms plan suite                       | integration |
| Broad room name prefix                    | `Broad room name prefix: …`                                                           | rooms plan suite; unit                 | integration, unit |
| Room-name prefix                          | `Room-name prefix: …`                                                                 | egress plan suite; `unit/egress.test.ts` | integration, unit |
| Activity range over 30 days               | `Activity range over 30 days: …`                                                      | `ingress-query-plan.test.ts`           | integration |
| Ingress name prefix                       | `Ingress name prefix: …`                                                              | `ingress-query-plan.test.ts`           | integration |

## Risks / Trade-offs

- **A deployment where agents are a large share of sessions.** A selective agents search reads every agent session of
  the range: up to about 14,000 at M over 7 days if every room had an agent. → It stays capped by the range and under
  the 300 ms budget the M run enforces. A selectivity-dependent plan would need a pre-count (non-goal).
- **Broad identity and room-name searches.** Their `total` (and, for rooms without a status, a possible ranked plan
  on `nameLower_createdAt`) read keys in proportion to retention: about 270 ms in the 4-week participants probe. →
  This is the planner's own choice. No index of the contract avoids it, and the budget rows measure it at M.
- **A selective room-name search with a status.** Its ranked sort and `total` pay the status scan of the range: 38 ms
  instead of 4 ms at M over 7 days. → Accepted, so the planner cannot choose `status_endedAt_id` (decision 7).
- **The planner's choice changes in a later MongoDB release.** → The plan suites assert the structural cases and
  fail. The pinned cases do not depend on the planner.
- **The `user-` rewrite drifts from the generator's model** (`rooms.identities` keeps the old identities). → Only the
  participants plan suite reads its own database, and none of its queries reads `rooms.identities`.
- **CI runs S while the scenarios say M.** → Accepted by the owner, with one recorded M run of each suite before the
  archive.

## Migration Plan

Nothing to migrate: the queries change in one release and return the same rows. Rollback: revert the backend commit.
The spec changes describe the plans, so the archive follows the code.
