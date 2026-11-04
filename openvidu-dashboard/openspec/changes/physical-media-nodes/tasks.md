# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 Add `openviduconfig.MediaNode` (string, default empty) and `analytics.Node.MediaNode`, set in
  `openvidu/openvidu.go`, and pass it through `nodeProjectionOptions` to the projector. Verify: `go test ./openvidu/...`
  with the Dockerfile toolchain, and lint.
- [x] 1.2 Projection:
  - stamp `mediaNode` on rooms and participant sessions with the `mediaStats` expressions (first writer, and the
    host's `ROOM_CREATED`);
  - make `scopes()` return `node:<label>` only with a label, and the reconciler's room-close increments use the room's
    `mediaNode`.
  Verify: projection unit tests for a labelled room, an unlabelled room, a room first touched by another process's
  egress event, and the rollup increments of both kinds of server.
- [x] 1.3 Heartbeat and shutdown:
  - the heartbeat writes `mediaNode` when set;
  - after `drain` the writer upserts the node document with `stoppedAt` and `$max lastSeenAt` within the shutdown
    budget, and not when the queues could not be written.
  Verify: writer integration tests (graceful stop leaves `stoppedAt`, an unreachable database exits within 5 s
  without it, a labelled node's document has `mediaNode`).
- [x] 1.4 Reconciler daily unique identities group by `mediaNode` and write only label scopes. Verify: reconciler
  integration test with two labels and with unlabelled sessions (global only).
- [x] 1.5 Contract in the writer: `nodes`, `rooms` and `participants` schemas with the new fields, and the rooms
  index replaced. Verify: `contract_integration_test.go` against the vendored contract from task 2.2.
- [x] 1.6 `CHANGELOG-openvidu.md`: the data model line says the heartbeat records a graceful stop. Verify: reviewed
  in the diff.

## 2. Typings and contract (dashboard)

- [x] 2.1 Data model types: `NodeDocument.mediaNode?`, `stoppedAt?`, and `RoomDocument.mediaNode?`,
  `ParticipantDocument.mediaNode?`; JSON schemas with the label pattern; `indexes.ts` with
  `mediaNode_status_createdAt_id` (partial) instead of `nodeId_status_createdAt_id`; fixtures with a labelled node, a
  stopped earlier process and labelled entities. Verify: typings tests and `contract/generate.ts` output committed.
- [x] 2.2 API types:
  - `StatusWriter` without `nodes` and `aliveNodes`, with `stoppedAt?`;
  - `RoomListItem.mediaNode?`, the participant and agent item `mediaNode?`, and the rooms query `mediaNode` replacing
    `nodeId`.
  Verify: `api-contract.test.ts`, and `./dashboard.sh check`.
- [x] 2.3 Run `contract/writer-check.sh` against the openvidu-livekit branch of task 1. Verify: the check passes.

## 3. Data generator and demo

- [x] 3.1 `--media-nodes`:
  - labels the three nodes `media-node-10-0-0-1` to `-3` and stamps their rooms and sessions;
  - keys `--node-rollups` scopes by the label;
  - adds an earlier stopped process of the first label that hosted some older rooms;
  - rejects `--node-rollups` without it.
  The keep-alive refreshes only the current processes. Verify: generator unit tests for the four node documents, the
  stamps and the scopes, and the "Generated media nodes" scenarios against a generated database.
- [x] 3.2 `demo-lib.sh` stops passing `--node-rollups` by default; the generator README documents `--media-nodes`
  and the new `--node-rollups` rule. Verify: `./dashboard.sh demo ce` starts and its database has no node scope.

## 4. Backend

- [x] 4.1 Status service: the writer fold with the alive rule (no `stoppedAt`, within the fresh window) and
  `stoppedAt` only when no document is alive. Verify: `status-api` scenarios as unit tests of the fold and an
  integration test of the route.
- [x] 4.2 Rooms: `mediaNode` param, mapper, query on the new index, OpenAPI. Verify: `rooms-api` scenarios and the
  explain-plan tests with `mediaNode` (with and without `q`) on a database generated with `--media-nodes`.
- [x] 4.3 Participants and agents: `mediaNode` in the projection, mapper and OpenAPI. Verify: `participants-api`
  scenario "Session of a labelled node".
- [x] 4.4 Overview inputs for editions group active rooms and sessions by `mediaNode`. Verify: overview repository
  unit test, and `overview-api` tests unchanged.
- [x] 4.5 Analytics coverage of a `node:<label>` scope reads the documents with that `mediaNode`. Verify:
  `analytics-api` coverage scenarios, including "Restarts of one media node", and the existing `explain()` test.

## 5. Frontend

- [x] 5.1 Overview:
  - remove the nodes line;
  - show the "Server stopped at hh:mm:ss" writer line with the neutral icon;
  - render the "By node" card only with `per-node-breakdown` and a provided component, without any lock;
  - Recent rooms at full width otherwise;
  - the Data pipeline info text.
  Verify: `overview-page.spec.ts` for the scenarios of `overview-ui` and `ui-info-tips`.
- [x] 5.2 Rooms:
  - `node` URL parameter (dropped without the feature) sent as `mediaNode`;
  - no Node select or lock without the feature;
  - the Node column only with the feature, reading `mediaNode`;
  - "Clear filters" removes `node`.
  Verify: rooms page and filter specs for the `rooms-ui` scenarios.
- [x] 5.3 Participants, agents and participant sessions tables: the Node column only with the feature, reading
  `mediaNode`. Verify: their table specs.
- [x] 5.4 Analytics: no scope selector or lock without the feature. Verify: `analytics-page.spec.ts` for "Nothing per
  node in CE".
- [x] 5.5 No CE view renders the `per-node-breakdown` lock (its copy stays in `FEATURE_COPY`, which covers every
  `FeatureKey`), and the URL state key is `node`. Verify: `./dashboard.sh check` and the specs of 5.1 to 5.4.

## 6. End to end, docs and CHANGELOG

- [x] 6.1 e2e: the CE Overview, Rooms and Analytics pages show nothing about nodes, and Recent rooms is full width.
  Verify: Playwright specs on the CE demo.
- [x] 6.2 `CHANGELOG.md`: the Overview line without "and nodes reporting", and the graceful shutdown line with the
  recorded stop. Verify: reviewed in the diff.
- [x] 6.3 `AGENTS.md` files: the data generator options and any seam whose contract changed (`OVERVIEW_NODES_CARD`,
  `ROOMS_NODE_FILTER`, `ANALYTICS_SCOPE_SELECT` render only with the feature, the `node` URL key). Verify: reviewed in
  the diff.
- [x] 6.4 Full check: `./dashboard.sh check`, `./dashboard.sh test-integration` and the openvidu-livekit suites, one
  heavy load at a time. Verify: all green.

## Workflow follow-up

- The PRO change in `dashboard-pro/openspec` builds on the seams and fields of this one; `ce.ref` moves once this
  change lands in `OpenVidu/openvidu`.
- Archive after the owner's review, as usual.
