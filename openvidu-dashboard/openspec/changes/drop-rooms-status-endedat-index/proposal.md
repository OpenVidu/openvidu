# Proposal: drop the rooms index `status_endedAt_id`

## Why

No rooms query needs `status_endedAt_id` (`{ status: 1, endedAt: -1, _id: -1 }`): the room lists and counts read the
creation range and rank by the end time in memory. The index has no `createdAt` key, so where the planner can choose it
(a ranked sort or a count with a status) it reads every closed room of the retention, and at scenario S it tied with
`status_createdAt_id`, which made CI flaky until the dashboard pinned its plans. Every room write still maintains it.

## What Changes

- The shared contract (`dashboard-ce/typings/contract/indexes.ts`, generated `schema/indexes.json`) no longer lists
  `status_endedAt_id`, so a new database never gets it.
- The writer drops `status_endedAt_id` from `rooms` at every start when it finds it, and reports it in the
  `droppedIndexes` field of its initialization log. Only that named index is dropped; any other index outside the
  contract, such as one an operator created, stays.
- The contract version stays 2: version 2 has not shipped in a release (3.10.0 is unreleased) and neither side needs to
  know about the removal. The version constants, the `schema_meta` fixture and the dashboard's supported range do not
  change.
- The rooms list plans no longer mention `status_endedAt_id`; the dashboard keeps pinning its rooms queries to the same
  indexes as today.

Observable behaviour: on a database written by a server built from `main` before this change, the next server start
removes the index, and the rooms storage shown in Settings → Data shrinks by its size. A 3.9 database never had it.
Nothing changes in the API or the UI otherwise.

CHANGELOG: none. The index never shipped in a release, so nothing changes against 3.9.

## Decisions

1. **Contract version 2 kept** (owner's answer). The typings README asks for a bump once a version has shipped in a
   release; version 2 has not. A bump to 3 was rejected: it would only show "Update the dashboard" on deployments
   built from `main` whose server is updated before its dashboard, and the drop does not need the version.
2. **Drop at every start, whatever version is recorded.** It is idempotent, needs no version gate, and also removes the
   index again if a server built before this change starts later and recreates it.
3. **Only the named index.** Rejected: dropping every index outside the contract, which would remove indexes operators
   add.
4. **The retired name lives in the writer**, next to the upgrade of the frame counts, not in a new contract file: the
   dashboard and the data generator never need it (generated databases are always new).
5. **Pins kept.** The rooms list with `q` and a status keeps running its ranked sorts and `total` on the status index:
   it still guards dashboards that read a database the server has not upgraded yet, and keeps the plan tests
   deterministic. Relaxing it would need a new measurement at scenario M.

## Track

Lite, chosen by the owner over full: one index leaves the contract, with one drop step in the writer and no version,
API, configuration or dependency change. It does touch the shared contract and two repositories.

## Scope

- Edition: CE and PRO for the server; CE for the dashboard. Both editions read the same contract.
- Repositories: the dashboard (`openvidu-dashboard/` of the openvidu repository) and openvidu-livekit
  (`openvidu/main`). openvidu-pro-livekit takes the writer change with its next merge of `openvidu/main`, and the PRO
  dashboard with its next move to a CE commit.
- Not in scope: other indexes, the version constants, the data generator and the demo, openvidu-deployment and the
  documentation (none names the index).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: initialization drops the retired rooms index.
- `data-model`: the contract defines no rooms index on the end time.
- `rooms-api`: "Room list plans" scenarios no longer name `status_endedAt_id`.

## Impact

- Data model: `rooms` loses `status_endedAt_id`. No field, retention, validator or schema version change, and no
  mapping from legacy events (3.9 data never had the index).
- Writer: `openvidu/analytics/schema` (vendored contract, a drop step separate from the upgrade of the frame counts)
  and its integration tests.
- Dashboard: typings contract and its tests; the backend's rooms plan tests and the comment of the rooms query plan.
- Rollout: the CE CI `contract` job checks the writer's `openvidu/main`, so the writer and the dashboard are pushed
  together.
