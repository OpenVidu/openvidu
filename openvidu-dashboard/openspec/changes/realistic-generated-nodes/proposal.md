# Proposal

## Why

The demo (`./dashboard.sh demo`, and the PRO demo that calls the same data generator with flags) must let people test
with scenarios faithful to a real deployment. The generated node set is not: the CE demo writes three unlabelled nodes
where a single-node deployment has one machine, and the multi-node set (`--media-nodes`) has states no server writes. A
pion node reports no media statistics forever, a draining node keeps taking rooms, the silent node hosts only rooms
that ended before it went silent, every node was first seen 31 days ago and every heartbeat interval is 10 s.

## What Changes

- **Single node** (no `--media-nodes`; the CE demo and a single-node PRO deployment): one machine without label or IP
  and three servers, one `nodes` document each. The first stops at a planned upgrade halfway through the range, the
  second is lost (silent, no stop) three quarters of the way through and its open rooms are closed by the reconciler,
  and the third is alive. No room is created during the minutes when no server takes rooms. No node scope.
- **Multi-node** (`--media-nodes`, Elastic and HA alike, since the writer and the PRO dashboard treat them the same):
  seven media nodes `media-node-10-0-0-1` to `-7` and ten servers:
  - `-1`: restarted twice. Its first server (pion) stops at the upgrade. The second (mediasoup) is lost 5 h before the
    end, and the third (mediasoup) has run since then: a lost server followed by another, a restart in the last 24 h
    and an engine change.
  - `-2`: mediasoup, upgraded halfway through the range.
  - `-3`: draining for the last 20 minutes; it takes no new rooms after it starts draining.
  - `-4`: lost while draining, silent for the last 3 hours.
  - `-5`: drained and stopped 30 minutes before the end.
  - `-6`: joins three quarters of the way through the range and reports every 30 s (a slow node).
  - `-7`: silent for the last 3 days.
- **Rooms follow their server**: a room is created only on a server that is up and taking rooms. Active rooms are only
  on servers alive at the end. A room still open when its server stops cleanly ends then with `SERVER_SHUTDOWN`, on top
  of the random ~2 % that keep that reason. A room still open when its server goes silent is closed by the reconciler
  with reason `node-dead`. Every server lost inside the range has at least one such room.
- **Versions**: a cluster upgrade halfway through the range. Servers started before it run `3.10.0` and those started
  after it run `3.10.1`, and `schema_meta` names the newest server's version.
- **`--nodes-without-media-stats`** keeps its name and takes 0 or 1, rejecting larger values. With 1, the mediasoup
  machine (`-2`, or the single node, which then runs mediasoup) runs, until its upgrade, an earlier server version that
  reported no media statistics. Global summaries are then partial only for ranges reaching back before that upgrade.
  In CE every server reports media statistics.
- **Keep-alive** refreshes only the servers alive at generation time and keeps each server's own interval.
- Not written, because the writer cannot produce them: per-process rollup scopes `node:ND_…` (the writer keys node
  scopes by label only) and unlabelled rooms in a multi-node deployment (the writer writes them only when it replays the
  legacy events of an upgrade from 3.9, which the generator does not write).

Flags for PRO to follow. Single node: neither `--media-nodes` nor `--node-rollups` (`--node-rollups` stays rejected
without `--media-nodes`). Multi-node, Elastic and HA: `--media-nodes --node-rollups`. The only flag whose meaning
changes is `--nodes-without-media-stats`. The PRO demo command `--media-nodes --node-rollups
--nodes-without-media-stats 1` keeps working.

What PRO must adapt: nothing is required. The PRO demo flags keep working. `dashboard-pro/e2e/scripts/docs-screenshots.mjs`
still finds an alive media node with active rooms (`-1`, `-2`, `-6`, or `-3` while draining) and a recent room with
egress that ended on its own. The PRO query plan tests pick the freshest labelled node and the first node scope, which
still exist. `rehost()` and the fixed indices of the draining and without-statistics nodes were internal to the CE
generator and are gone. For its single-node and HA demo modes, PRO drops `--media-nodes --node-rollups` (single node)
or keeps the Elastic flags (HA). In the multi-node demo, the 30 s node widens the dashboard's freshness windows from
30 s fresh / 90 s stale to 50 s / 105 s.

Owner decisions: keep the without-statistics node as an option even though no released server writes
`mediaStats: false` (only PRO development builds of 2026-11-02 to 2026-11-18 did); two restarts of the single node;
keep the random ~2 % `SERVER_SHUTDOWN` rooms; the `3.10.0` → `3.10.1` upgrade, the pion → mediasoup switch of `-1` and
the 30 s node.

Edition: the generator serves CE and PRO; the change is made in CE only. Repository: `openvidu` (dashboard workspace)
only; no change to openvidu-livekit or openvidu-deployment. Track: lite, chosen by the owner. It covers one capability
(`data-model`), one edition and one repository, and changes no API, data contract, configuration or dependency. It has
seven new or changed scenarios, plus four unchanged ones that the modified requirements carry.

CHANGELOG: none. The data generator is test and demo tooling, so the product's observable behaviour does not change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-model`: the generated node set. "Generated media nodes" is removed and replaced by the added "Generated
  multi-node deployment", "Generated single node", "Generated server versions" and "Rooms of generated servers". The
  heartbeat interval in "Generated data follows the writer's shape" and the generated rollups of nodes without media
  statistics in "Media statistics marks of the rollups" are modified.

## Impact

- `dashboard-ce/tools/data-generator/src/` (`generator.ts`, `model.ts`, `schema.ts` keep-alive, `generate.ts` option
  validation) and its `README.md`.
- `dashboard-ce/backend/test/integration/data-generator.test.ts`; the test titles of the unchanged scenarios carried by
  the modified requirements, including one in `dashboard-ce/typings/test/contract.test.ts`.
- Every database the demos and the backend integration tests generate: rooms keep their content draws, but their host,
  some end reasons and the node documents change.
