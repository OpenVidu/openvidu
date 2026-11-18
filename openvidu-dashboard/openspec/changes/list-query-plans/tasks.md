# Tasks

## Conventions

- Paths are relative to `dashboard-ce/backend/`. Decisions are those of `design.md`.
- A test covers a scenario when its title is the scenario name, alone or followed by `: <detail>`. A test that
  exists under another title is retitled, not duplicated.
- "S run" means the suite alone at the default scenario S, for example
  `pnpm --filter @openvidu-dashboard/backend exec vitest run --project integration-plans test/integration/<suite>.test.ts`
  (Docker).
- No index, contract, writer, UI or generator file changes. If a task seems to need one, stop and ask.

## 1. Backend: participants and agents identity searches (implementer)

- [x] 1.1 In `src/participants/participants-query.ts`, change the `q` branch without `room` (decisions 2 and 3):
  - When `kind` is given and lists no `STANDARD`, build the kind and status form: `kind` as one value or `$in`,
    `status` as given or `$in` every status, `joinedAt`, the `identityLower` prefix and `extra` as residuals. Pin
    `kind_status_joinedAt_id`.
  - Otherwise build the current filter with no hint.
  - With `room`, keep `roomSid_identityLower_joinedAt`. The room, kind and status, and plain branches do not change.
  - Update the doc comment.

  Verify: `./dashboard.sh check` passes, and `git diff` touches only this function and its comment.
- [x] 1.2 Update `test/unit/participants.test.ts`:
  - The test `Origin explain plans: each branch hints its index, page and ranked, whatever the residual filters`
    expects `kind_status_joinedAt_id` for `{ q: 'agent' }` and `{ q: 'agent', status: 'active' }`. The participants
    plan with `q` alone or with `publisher` has no hint.
  - Add `Agents identity prefix: the kind and status form with the prefix residual, page, ranked and total`, which
    checks the filter, the count filter and the hint for the page, `duration` and `leftAt`.
  - Add `Identity prefix of a service kind: kinds without STANDARD take the agents plan, with STANDARD no hint`.
  - Add `Selective identity prefix: the participants list leaves the index to the planner`.

  Covers: Origin explain plans, Agents identity prefix, Identity prefix of a service kind, Selective identity prefix.
  Verify: `pnpm --filter @openvidu-dashboard/backend test` passes.

## 2. Backend: rooms list plans (implementer)

- [x] 2.1 In `src/rooms/rooms-query.ts`, add an optional `hint` to the `page` and `ranked` plans (decisions 5 to 7):
  - Without `q`: `mediaNode_status_createdAt_id` with `mediaNode`, else `status_createdAt_id_<feature>` with exactly
    one feature, else `status_createdAt_id` with a status. No hint with several features or with no filter.
  - With `q` and a status: no hint on the page; a hint for the ranked match and the count, namely
    `mediaNode_status_createdAt_id` with `mediaNode` and `status_createdAt_id` otherwise. Return that hint as a
    separate `countHint` on the page plan.
  - Update the doc comment with the reason for the `q` and status pin (`status_endedAt_id` is not bounded by the
    creation range).

  Verify: `./dashboard.sh check` passes.
- [x] 2.2 In `src/rooms/rooms-repository.ts` and `src/rooms/rooms-service.ts`, pass the plan's hints to `list`,
  `count` and `ranked`. Each hint is passed only when it is defined. Verify: `./dashboard.sh check` passes, and
  `rooms-api.test.ts` passes under `./dashboard.sh test-integration` (Docker).
- [x] 2.3 In `test/unit/rooms-query.test.ts`, add:
  - `Hinted room filters: status, media node and one feature pin their index for page, ranked and total`;
  - `Several features: no hint on the $or of partial indexes`;
  - `Broad room name prefix: with a status the ranked match and total pin the status index, the page has no hint`
    (with and without `mediaNode`).

  Covers: Hinted room filters, Several features, Broad room name prefix. Verify: the unit tests pass.

## 3. Backend: egress room-name search (implementer)

- [x] 3.1 In `src/egress/egress-query.ts`, make `hint` optional and drop it from the `q` branch without `room`
  (decision 8). The room, status and plain branches keep theirs. In `src/egress/egress-service.ts` and
  `src/egress/egress-repository.ts`:
  - read the `q` page without a hint through `sortedPage`;
  - run its count and ranked sort without a hint (`count` takes an optional hint).

  Verify: `./dashboard.sh check` passes, and `egress-api.test.ts` passes under `./dashboard.sh test-integration`.
- [x] 3.2 In `test/unit/egress.test.ts`, add `Room-name prefix: no hint without a room, roomSid_startedAt with one`,
  and update any test that expects `roomNameLower_startedAt` as the plan's hint. Covers: Room-name prefix. Verify:
  the unit tests pass.

## 4. Plan suite: participants and agents (implementer)

- [x] 4.1 In `test/integration/participants-query-plan.test.ts`, set up the prefixes (decision 11):
  - After `generate`, rewrite every STANDARD session with an update pipeline that prefixes `identity` and
    `identityLower` with `user-`.
  - Reload `sample`, and keep the whole rewritten identity (selective) and one agent identity as fixtures.
  - Add a `total` explain helper that runs `$match` and `$group` with the plan's hint, as `countDocuments` does.
  - Say in the header comment that identities are rewritten.

  Verify: the S run passes the untouched tests.
- [x] 4.2 Retitle the existing tests (decision 12):
  - the no-filter, room, kind and status, and summary tests become `Explain plans: …`, each asserting no `COLLSCAN`
    and no `SORT`;
  - `ranked by %s: …` becomes `Ranked sorts over 24 hours: by %s`, with its `q` cases on the selective identity
    (`identityLower_joinedAt`) and on `user` (bounded by the sessions joined in the range);
  - `publisher: …` becomes `Publisher filter: …`, adding the absence of `SORT`.

  Remove `identity prefix: identityLower_joinedAt within the prefix range`; task 4.3 replaces it. Covers: Explain
  plans, Ranked sorts over 24 hours, Publisher filter. Verify: the S run passes.
- [x] 4.3 Add one test per identity-search scenario, each explaining page, `total` and `sort=duration` over 24 hours
  where the scenario says so:
  - `Selective identity prefix: …`: `identityLower_joinedAt`, page `SORT`, at most the sessions of that identity in
    range.
  - `Broad identity prefix: …`: page on `joinedAt_id` without `SORT`, at most `2 * (LIMIT + 2)` documents; `total`
    and ranked at most the sessions in range; no `COLLSCAN`.
  - `Identity prefix with a status: …`: `q=user&status=active`, no `COLLSCAN`, at most the sessions in range plus
    the active sessions; the winning index is recorded in the label.
  - `Agents identity prefix: …`: `q=user` and one agent identity, all on `kind_status_joinedAt_id` without `SORT`, at
    most the agent sessions in range.
  - `Identity prefix of a service kind: …`: `kind=AGENT&q=user` on `kind_status_joinedAt_id` without `SORT`;
    `kind=STANDARD,AGENT` with the selective identity on `identityLower_joinedAt`.
  - `Identity prefix within a room: …`: both lists with `q` and the sample's room, on
    `roomSid_identityLower_joinedAt`, at most the sessions of that room.

  Covers the six scenarios named. Verify: the S run passes, and each test fails when its expected index is changed
  in a scratch edit that is then reverted.
- [x] 4.4 Update `Origin explain plans`. Replace the allowed set with the index of each combination:
  `roomSid_identityLower_joinedAt` for `q` and `room`, `roomSid_joinedAt_id` for `room`, and
  `kind_status_joinedAt_id` otherwise. Assert no `SORT` outside the ranked sorts and `q` with `room`. Covers: Origin
  explain plans. Verify: the S run passes.
- [x] 4.5 In the `performance budget` block:
  - Add `Identity search latency: p95 of a page and its total`. It measures, through the service, the participants
    list with the selective identity and with `q=user`, and the agents list with `q=user` and with one agent
    identity. It enforces 300 ms through `expectWithinBudgets` and appends four rows to the suite's report.
  - Remove the row "List, identity prefix" from `reports the p95 of every budgeted query`.
  - The report keeps one header whichever test runs first.

  Covers: Identity search latency. Verify: the S run passes and prints one report with the four rows.

## 5. Plan suites: rooms, egress and ingress (implementer)

- [x] 5.1 In `test/integration/rooms-query-plan.test.ts`, make `explainList` pass the plan's hint (page find, ranked
  pipeline), and add a `total` explain with the count hint. Then:
  - retitle the index tests to `Explain plans on the generated database: rooms, …`;
  - retitle the ranked test to `Ranked sorts over 7 days: rooms by %s`, adding `q=room&status=closed` on
    `status_createdAt_id`;
  - retitle the media node prefix test to `Name prefix within one node: …`, keeping its selective prefix.

  Covers: Explain plans on the generated database, Ranked sorts over 7 days, Name prefix within one node. Verify:
  the S run passes.
- [x] 5.2 Add to the rooms suite:
  - `Hinted room filters: …`: page, `total` and each ranked sort with `status=closed`, `mediaNode` and
    `features=egress`; no `status_endedAt_id`.
  - `Several features: …`: the plan of `features=egress,agent` uses both partial indexes, and the service's `items`
    and `total` equal the union counted with `countDocuments`.
  - `Selective room name prefix: …`: page, `total` and a ranked sort on `nameLower_createdAt`.
  - `Broad room name prefix: …`: `q=room` pages on a range index without `SORT` within two pages. With
    `status=closed`, the ranked sorts and `total` use `status_createdAt_id`. No plan uses `status_endedAt_id` or
    examines more than the rooms in range.
  - In the budget block, the enforced row "List, ranked by endedAt, prefix and status closed" (300 ms).

  Covers the four scenarios named. Verify: the S run passes.
- [ ] 5.3 In `test/integration/egress-query-plan.test.ts`, make the explain helper follow the plan's optional hint
  and read a `q` page with the `{ startedAt, _id }` sort. Then:
  - retitle the index tests to `Explain plans on the generated database: egress, …`;
  - retitle the ranked test to `Ranked sorts over 7 days: egress by %s`, whose `q` case asserts the bound only;
  - replace `room name prefix: …` with `Room-name prefix: …`: one room's name on `roomNameLower_startedAt`; `q=room`
    paging on `startedAt_id` without `SORT` within two pages; page, `total` and `sort=duration` at most the
    egresses in range; the room case still on `roomSid_startedAt`.
  - Add the budget row "List, room name prefix of one room" (200 ms) beside the broad one.

  Covers: Explain plans on the generated database, Ranked sorts over 7 days, Room-name prefix. Verify: the S run
  passes.
- [ ] 5.4 In `test/integration/ingress-query-plan.test.ts`:
  - retitle `lists: …` to `Activity range over 30 days: …`, and the id, detail and summary test to `Explain plans on
    the generated database: ingress, …`;
  - add `Ingress name prefix: …`, which explains, over the last hour and the last 24 hours, one ingress name minus
    its last character and `q=ingress`. It asserts no `COLLSCAN` and at most the branch counts plus the ingresses
    whose name starts with the prefix.

  Covers: Explain plans on the generated database, Activity range over 30 days, Ingress name prefix. Verify: the S
  run passes.

## 6. CHANGELOG, checks and refactor review (implementer)

- [ ] 6.1 Add the line of the proposal to `CHANGELOG.md`, `3.10.0` → `Improved` → `Data`. Verify: `git diff
  CHANGELOG.md` shows one line.
- [ ] 6.2 Run `./dashboard.sh check`, `./dashboard.sh test-integration` (Docker) and `./dashboard.sh scenarios
  list-query-plans`. Verify: all pass, and every delta scenario lists at least one passing test with no `NO TEST`.
- [ ] 6.3 Refactor review: assess whether the four suites need a shared `total` explain helper or a shared
  bound helper, and whether the rooms plan type reads clearly with `hint` and `countHint`. Apply a small refactor
  here, or record the proposal. Verify: the outcome is written in the hand-off, and task 6.2 passes again if code
  changed.

## 7. Evidence at scenario M (orchestrator)

- [ ] 7.1 After the full verification and before the archive, run each plan suite once at scenario M over 7 days,
  one at a time and alone on the machine, with the command of `backend/AGENTS.md`: participants, rooms, egress, then
  ingress (`<PREFIX>_PLAN_SCENARIO=M <PREFIX>_PLAN_DAYS=7 <PREFIX>_PLAN_REPORT=<file>`). Covers every scenario of the
  delta at M. Verify:
  - every test passes;
  - the date, load average, MongoDB version and each p95 report are recorded in the change's `operations.md`;
  - on a failed plan assertion or an enforced overrun, stop and ask the owner instead of changing a test.

## Workflow follow-up

- The orchestrator deletes `openspec/changes/agents-identity-search-plan/` in the commit of this proposal.
- Push the dashboard to `master`, wait for the `openvidu-dashboard-ci.yml` run and record it.
- Archive when the Definition of Done holds. The archive syncs `participants-api`, `rooms-api`, `egress-api` and
  `ingress-api`.
- Nothing follows in openvidu-livekit, openvidu-deployment or the PRO dashboard.
