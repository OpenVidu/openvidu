# Proposal

## Why

The node the analytics know is the server process: its id changes on every restart, and a `nodes` document lives 30
days after its last batch. The dashboard therefore lists one "node" per restart, warns "1 of 4 nodes reporting" on a
single machine that restarted three times, and can tell no one which machine hosts a room. A node that stopped on
purpose (scale-in, maintenance) looks the same as one that crashed. Single-machine deployments, the only ones CE runs
in, have nothing to show per node at all, yet CE renders node columns, filters and a locked per-node card.

## What Changes

- The server can give the writer a **media node label**: a name of the machine that stays the same across restarts.
  The CE server sets none; an edition that runs several media nodes sets it. With a label, the writer:
  - publishes it as `mediaNode` on the node heartbeat;
  - stamps `mediaNode` on the rooms and participant sessions the node hosts, following `nodeId` as `mediaStats` does,
    so the label lives as long as the entity;
  - keys the node scope of the rollups by it (`node:<label>`), and the reconciler's per-node daily unique identities
    too.
- **BREAKING** (unreleased contract): the rollups get no node scope from a server without a label. Today every server
  writes `node:<nodeId>` beside `global`.
- On a graceful stop, after the final flush, the writer records `stoppedAt` on its node document, so a stopped server
  reads as stopped instead of silent.
- **BREAKING** (unreleased API): `GET /api/v1/status` reports the writer as `{ lastSeenAt?, stoppedAt?,
  batchIntervalMs? }`, without `nodes` and `aliveNodes`. `stoppedAt` is present when no node is alive and the newest
  one stopped.
- The rooms list filters by `mediaNode` (exact match) instead of `nodeId`, backed by a `mediaNode` index that replaces
  the `nodeId` one. Room, participant and agent list items add `mediaNode`.
- The Analytics media statistics coverage of a node scope reads the node documents of that media node.
- CE dashboard: nothing about nodes is rendered without `per-node-breakdown`, not even locked:
  - Overview: no "N of M nodes reporting" line and no "By node" card, so Recent rooms takes the full width. The writer
    line reads "Server stopped at hh:mm:ss" with a neutral icon when the server stopped.
  - Rooms: no Node select. The URL parameter `node` replaces `nodeId` and CE ignores it.
  - Analytics: no scope selector.
  - The Node columns of the Rooms, Participants, Agents and participant sessions tables exist only with the feature,
    and show `mediaNode`.
- The data generator gains `--media-nodes`: it labels its nodes, keys node scopes by the labels and adds the earlier,
  stopped process of one of them, so a restart shows up.

Scope excludes the following:
- Which editions set a label, its format and the per-node views: the edition that unlocks `per-node-breakdown` owns
  them.
- The node an egress or ingress process runs on (only rooms and participant sessions are labelled).
- Reconciler liveness: it keeps judging the process (`nodeId` and the node registry), since a room lives in one
  process, whatever machine it ran on.
- Backfilling labels on documents written before the change.

Edition: CE and PRO. The writer behaviour applies to every edition, and the views are CE views that every edition
shows. Repositories:
- openvidu-livekit: `openvidu/analytics`, `openvidu/openviduconfig`, `openvidu/openvidu.go`;
- the dashboard: typings and contract, backend, frontend, data generator, demo, specs.

CHANGELOG lines:
- `CHANGELOG.md`: the Overview line drops "and nodes reporting", and the graceful shutdown line adds that the node
  records when it stopped.
- `CHANGELOG-openvidu.md` (openvidu-livekit): the data model line mentions that the heartbeat records a graceful stop.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`:
  - adds the media node label (heartbeat, entity stamp, node scopes);
  - the graceful shutdown records `stoppedAt`;
  - stats deltas go to the labelled node scope.
- `server-reconciler`: daily unique identities per media node label.
- `data-model`:
  - `mediaNode` on `nodes`, `rooms` and `participants`, and `stoppedAt` on `nodes`;
  - node scopes keyed by the label;
  - the generator's `--media-nodes`.
- `status-api`: the writer object without node counts, with `stoppedAt`.
- `overview-ui`: no node line or card without `per-node-breakdown`, the full-width recent rooms, and the stopped
  writer line.
- `ui-info-tips`: the Data pipeline tip no longer mentions nodes.
- `rooms-api`:
  - the `mediaNode` filter and index replace `nodeId`;
  - the item carries `mediaNode`.
- `rooms-ui`:
  - the `node` URL parameter;
  - no Node select or column without the feature.
- `participants-api`: list items carry `mediaNode`.
- `participants-ui`: the Node column only with the feature, showing `mediaNode`.
- `agents-ui`: the Node column only with the feature, showing `mediaNode`.
- `analytics-api`: the coverage of a node scope follows `mediaNode`.
- `analytics-ui`: no scope selector without the feature.
- `ui-shell`: `node` replaces `nodeId` among the URL parameters.

## Impact

- Writer:
  - an `openviduconfig.MediaNode` setting passed through `analytics.Node` to the heartbeat, the projection options
    and the rollup scopes;
  - the shutdown path writes `stoppedAt`;
  - the reconciler's daily unique identities group by `mediaNode`;
  - the contract schemas of `nodes`, `rooms` and `participants`, and the rooms index;
  - unit and integration tests in `openvidu/analytics`.
- Dashboard:
  - typings and their schema mirror;
  - status service;
  - rooms query, mappers and index;
  - participant and agent mappers;
  - overview repository (groups by `mediaNode`, for editions);
  - analytics coverage;
  - Overview, Rooms, Participants, Agents and Analytics pages;
  - the lock catalogue;
  - the data generator and demo;
  - unit, integration, contract and e2e tests.
- Editions that extend the per-node seams (Overview card, Rooms node select, Analytics scope select) read `mediaNode`
  and the `node` URL parameter.
- No schema version bump: the v2 schema has not shipped.
