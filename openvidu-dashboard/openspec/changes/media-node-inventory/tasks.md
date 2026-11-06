# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 `openviduconfig.MediaNodeIP` (empty) and `RTCEngine` (`"pion"`), and `analytics.Node.IP`, `RTCEngine` and
  `Draining` set in `openvidu/openvidu.go` from them and LiveKit's local node. Verify: `go test ./openvidu/...` with
  the Dockerfile toolchain, and lint.
- [x] 1.2 Heartbeat:
  - writes `rtcEngine` always and `ip` with a label;
  - `$min drainingAt` while draining;
  - no `region`.
  Verify: writer integration tests for "Node heartbeat", "Media node IP", "RTC engine of the server" and "Drain start"
  (draining with participants, killed while draining, never drained).
- [x] 1.3 `rooms.hosted`: the processor counts the `ROOM_CREATED` events of the gated rollup step and the heartbeat
  adds them, keeping them for the next one when it fails. Verify: projection unit tests, and writer integration tests for hosted
  rooms, a retried batch and a room first touched by another server.
- [x] 1.4 `rooms.reconciled`: the reconciler's room closure increments the room's `nodeId` document. Verify:
  reconciler integration tests for a crashed server with two rooms and a late real `ROOM_ENDED`.
- [x] 1.5 Contract in the writer:
  - the `nodes` schema with the new fields and the legacy `region`;
  - `lastSeenAt_ttl` on the entities class;
  - `mediaNode_firstSeenAt`.
  Verify: `contract_integration_test.go` against the vendored contract, and a `collMod` test that restarts with
  `retention.entities: 30d`.
- [x] 1.6 `CHANGELOG-openvidu.md`: the node document line of the proposal, and `region` out of the data model line.
  Verify: reviewed in the diff.

## 2. Typings and contract (dashboard)

- [x] 2.1 `NodeDocument`: `rtcEngine`, `ip?`, `drainingAt?`, `rooms?`, without `region`. Remove `NODE_RETENTION_MS`.
  Put the TTL index on `RetentionClass.ENTITIES` and add `mediaNode_firstSeenAt` to `INDEXES`. Verify: typings
  contract tests.
- [x] 2.2 Contract schemas and fixtures of `nodes` (the system fixture with a draining and a stopped node), and the
  vendored copy in openvidu-livekit. Verify: `./dashboard.sh contract-check <openvidu-livekit>`.

## 3. Backend

- [x] 3.1 Remove every use of `region` and `NODE_RETENTION_MS`. The data generator's schema setup reads the TTL class
  from the contract. Verify: `./dashboard.sh typecheck`, and the `status` tests unchanged.
- [x] 3.2 Query plan: the servers-of-a-node read uses `mediaNode_firstSeenAt` at scenario M. Verify: an `explain()`
  test in the data model plan suite.

## 4. Frontend library

- [x] 4.1 `NavigationMeta.hiddenWithoutFeature`, honoured by the sidenav and by a `canMatch` guard that
  `composeRoutes` adds. Verify: `navigation-list.spec.ts` and `compose-routes.spec.ts` for the three "Navigation
  entries hidden without their feature" scenarios.
- [x] 4.2 Overview: the nodes card in its own full-width row before Recent rooms. Verify: `overview-page.spec.ts` for
  "Per-node card at full width" and "Recent rooms at full width".
- [x] 4.3 `MEDIA_NODE_LINK` token read by the Rooms, Participants and Agents Node cells. Verify: specs of the three
  pages with and without a provided link.

## 5. Data generator

- [x] 5.1 Five labelled media nodes with life spans:
  - rooms assigned only to alive nodes;
  - `-4` rooms closed as by the reconciler;
  - `ip`, `rtcEngine`, `drainingAt` and the counters filled;
  - `--nodes-without-media-stats` on `-3`, `-2`, `-1`.
  Verify: data-generator tests for the three "Generated media nodes" scenarios.
- [x] 5.2 `keepLive` refreshes only documents without `stoppedAt` seen within an hour of the freshest one. Verify: the keep-alive
  scenario as a test.
- [x] 5.3 README of the generator: the media node states. Verify: reviewed in the diff.

## 6. End to end

- [x] 6.1 CE e2e: no Media nodes entry in the sidenav, and the Overview unchanged without `per-node-breakdown`.
  Verify: the CE Playwright suite.

## 7. Docs and CHANGELOG

- [x] 7.1 `AGENTS.md` of the frontend library: the hidden navigation mark and `MEDIA_NODE_LINK` among the seams.
  The library README lists the seams. Verify: reviewed in the diff.
- [x] 7.2 Full check: `./dashboard.sh check`, `test-integration`, `e2e` and `contract-check`, one heavy load at a
  time. Verify: all green.
- [x] 7.3 Owner review: `SectionHeaderActions.add(template, 'start')`, so the nodes card content can put its link in
  the section header before the Columns button. Verify: the section card spec and `./dashboard.sh check`.
