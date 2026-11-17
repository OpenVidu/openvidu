# Proposal

## Why

The list queries pin indexes inconsistently. Measured at scenario M over 7 days, some pins make common searches slow,
and some unpinned queries let the query planner tie between indexes or pick one that the time range does not bound:

- The participants identity search pins `identityLower_joinedAt`. A prefix most identities share reads and sorts
  every match: 222 ms instead of 57 ms over 7 days. Over 24 hours it costs 334 ms with 4 weeks of history, because
  the cost grows with retention, not with the range.
- The agents identity search reads every STANDARD match of a prefix that no agent has: 231 ms instead of 2 ms.
- Unpinned, the agents search ties at scenario S between two indexes. That tie is the CI failure of "Origin explain
  plans".
- The egress room-name search pins its name index and sorts every match: 17.4 ms instead of 9.0 ms, and 15.6 ms
  instead of 3.9 ms over 24 hours.
- The rooms list pins nothing. Its status filter with a ranked sort ties with `status_endedAt_id`, which would read
  every closed room of the retention.
- The specs say no list query sorts in memory except the ranked sorts. That is false for the identity and name
  searches of participants, rooms and egress.

The owner chose to give each list query the plan that measures fastest at scenario M, rather than the minimum a spec
or a test allows.

This change supersedes the open change `agents-identity-search-plan`. That change corrected the spec, left the
identity searches to the query planner and kept every other query as it is. The measurements show where the planner
loses or ties: the agents search and the rooms ranked sorts. They also show where a pin loses: the participants and
egress searches. The orchestrator deletes the `agents-identity-search-plan` folder in the commit of this proposal.

## What Changes

Edition: CE (the PRO edition inherits the CE queries). Repository: dashboard (`openvidu/openvidu-dashboard`) only.
Track: full. The change touches four list capabilities and their plan suites, and it rests on measurements at
scenario M.

Observable behaviour: the same rows, cursors and totals. Only the speed of searches and filtered lists changes. There
is no API, data contract, index, configuration or UI change.

- **Participants list**:
  - An identity search without a room leaves the index to the query planner, for the page, the ranked sorts and
    `total`. The planner reads the identity index for a selective prefix and the time index for a broad one.
  - When the `kind` filter lists only service kinds (no `STANDARD`), the search runs as the agents list does.
- **Agents list**: an identity search without a room runs on the kind and status index, merged in join order, with no
  in-memory sort. It reads at most the agent sessions of the range.
- **Branches with a room** keep their pinned indexes, and so does the kind and status branch.
- **Rooms list**:
  - The status, media node and single-feature filters pin their index for the page, the ranked sorts and `total`.
  - A name prefix stays with the planner. When it comes with a status, its ranked sorts and `total` pin the status
    index of the range, so the planner can never choose the end-time index.
  - Several features stay with the planner, because a pin would silently drop rows.
- **Egress list**: a room-name search without a room leaves the index to the planner. The room, status and plain
  branches keep their pins.
- **Ingress list**: no query change. Its spec now states the true bound of a name search: it can examine the
  ingresses whose name starts with the prefix even when they are outside the range.
- **Specs**:
  - The four "Index-backed … queries" requirements allow in-memory sorts for the searches that the planner serves
    and bound what those searches examine.
  - Two new requirements state the plan of each participants, agents and rooms case.
  - "Origin explain plans" names the exact index of each combination.
  - "Name prefix within one node" (rooms) and "Room-name prefix" (egress) state the plan for a selective and for a
    broad prefix.
- **Tests**:
  - The plan suites assert the plan of each case on purpose-built prefixes, with a bound on documents examined, in
    place of an allowed set of indexes.
  - The participants suite rewrites every STANDARD identity of its own database to `user-<identity>`. This gives a
    selective prefix, a prefix most identities share, and an agents prefix that matches no agent.
  - Identity searches get an enforced budget: 300 ms p95 for the page plus `total`.
  - CI runs scenario S. The orchestrator runs the four suites once at scenario M over 7 days before the archive.

CHANGELOG line (`Improved`, `Data`): "Searches and filters of the participants, agents, rooms and egress lists run on
the index that reads the fewest documents for each case, so a search for a common identity or room-name prefix no
longer reads and sorts every match."

Not in scope:

- New or removed indexes. `status_endedAt_id` is used by no dashboard query, but removing it is a contract and writer
  change for another change.
- The data contract, the writer (openvidu-livekit), openvidu-deployment, the PRO dashboard and the UI.
- The plan of the ingress list, and the summary, detail and export queries beyond the list plans they reuse.
- The data generator: the test prefixes are built inside the suites.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `participants-api`:
  - "Index-backed participant queries" allows the in-memory sort of the identity searches that the planner serves.
  - New "Identity search plans" sets the plan of each identity search.
  - "Origin filter of the agents list" names the index of each combination in "Origin explain plans".
- `rooms-api`:
  - "Index-backed room queries" bounds the name searches by the rooms of the range and narrows "Name prefix within
    one node" to a selective prefix.
  - New "Room list plans" sets the index of each filter.
- `egress-api`: "Index-backed egress queries" leaves the room-name search to the planner and bounds it by the
  egresses of the range.
- `ingress-api`: "Index-backed ingress queries" adds the name prefix matches to the bound of the list and adds a
  name-prefix scenario.

## Impact

- `dashboard-ce/backend/src/participants/participants-query.ts`, `rooms/rooms-query.ts`, `rooms/rooms-service.ts`,
  `rooms/rooms-repository.ts`, `egress/egress-query.ts`, `egress/egress-service.ts` and `egress/egress-repository.ts`.
- Unit tests `participants.test.ts`, `rooms-query.test.ts` and `egress.test.ts`, and the integration plan suites of
  participants, rooms, egress and ingress.
- `CHANGELOG.md`: one line. `README.md` and the `AGENTS.md` files do not change: no command, path or convention
  changes.
- At the archive: `openspec/specs/participants-api`, `rooms-api`, `egress-api` and `ingress-api`.
