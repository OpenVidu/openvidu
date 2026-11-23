# Tasks

## 1. Data generator node set and its tests (implementer)

- [ ] 1.1 Build the server timeline table of design.md in `dashboard-ce/tools/data-generator/src/generator.ts`, for
  single-node mode and for `--media-nodes`. It replaces `NODE_COUNT`, `restart`, `departed`, `MEDIASOUP_MEDIA_NODE` and
  `rehost()`, and draws node ids from a stream of their own. Write the node documents from it, with `serverVersion`,
  `rtcEngine`, `mediaStats`, `batchIntervalMs`, `drainingAt`, `stoppedAt` and `rooms`, and set `schema` `writerVersion`
  to the newest server's version. Verify with the tests "Generated single node", "Generated media node servers",
  "Generated server versions" and "Generated node heartbeats" in
  `dashboard-ce/backend/test/integration/data-generator.test.ts`.
- [ ] 1.2 Host rooms on the servers that take rooms at their creation, with one draw from `rng`; give active rooms only
  servers alive at the end; skip rooms planned while no single-node server takes rooms. In `generateRoom`, end a room
  that is still open at its server's end: at a `stoppedAt` with `SERVER_SHUTDOWN`, at a silence closed by the reconciler
  with `node-dead`. Keep the random `SERVER_SHUTDOWN` share. Add the room pinned to each server lost inside the range,
  and take the engine of the samples from the room's server. Verify with the test "Rooms of generated servers", plus
  "Generated single node: no room in the restart gaps".
- [ ] 1.3 Limit `--nodes-without-media-stats` to 0 or 1 in both modes: with 1, the servers of the mediasoup machine
  before the upgrade (server a of `-2`, or server 1 of the single node, which then runs mediasoup) report no media
  statistics. Reject 2 in `generate()` (the CLI passes it through). Verify with the tests "Generated server versions"
  (including its single-node and rejection cases) and "Generated rollups of nodes without media statistics".
- [ ] 1.4 Change `keepLive` in `src/schema.ts` to refresh only the unstopped servers within one minute of the freshest
  one, setting `lastSeenAt` alone. Verify with the tests "Keep-alive of generated servers" and "Generated node
  heartbeats".
- [ ] 1.5 Update the tests that relied on the old set in `data-generator.test.ts`: the five-label test, "generates a node
  without media statistics on request", the `batchIntervalMs` 10 000 check, and "Media statistics of mediasoup servers"
  (now with `-3` as the pion reference). Retitle the tests of the carried scenarios: "Generated event payload" and
  "Lower-cased search fields" in `data-generator.test.ts`, split out of the first test if needed; "Generated rollups of
  servers reporting media statistics" (today "marks every rollup as reported…"); and "Validator: …" in
  `dashboard-ce/typings/test/contract.test.ts`. Verify that `./dashboard.sh scenarios realistic-generated-nodes` finds a
  test for every scenario of the change.
- [ ] 1.6 Update `dashboard-ce/tools/data-generator/README.md`: the option table (`--media-nodes`,
  `--nodes-without-media-stats`, `--node-rollups`), the `nodes` output with both modes and the timeline, the room-end
  rules at stops and silences, and the keep-alive. Also update the `GenerateOptions` doc comments. Verify by reading
  that the README matches the specs of this change. No CHANGELOG line, since this is tooling.
- [ ] 1.7 Run `./dashboard.sh check` and `./dashboard.sh test-integration`. Every backend integration test that
  generates data passes, including the query-plan tests with `mediaNodes: true`.
- [ ] 1.8 Review for refactors: `generator.ts` and `model.ts` free of the old node constants, and the timeline table
  the single source for documents, hosts, engines and peak lifetimes. Apply small fixes or record the rest in the
  verification report.

## Workflow follow-up

- PRO (another workspace, after the CE push): move `ce.ref`. The demo flags need no change. For its single-node mode,
  drop `--media-nodes --node-rollups`; HA uses the Elastic flags.
