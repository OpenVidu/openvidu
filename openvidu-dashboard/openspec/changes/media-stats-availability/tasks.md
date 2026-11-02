# Tasks

## 1. Contract and typings

- [x] 1.1 Add the optional `mediaStats` bool to the `nodes`, `rooms` and `participants` schemas of
      `dashboard-ce/typings/contract/`, the document types of `src/data-model/` and the fixtures, then regenerate
      `schema/` and `fixtures/`. Verify with the typings contract tests and the typecheck.
- [x] 1.2 Add `mediaStats?: false` to `RoomListItem` and `mediaStats?: 'partial' | 'none'` to `AnalyticsSummary` in
      `src/api/`. Verify with the typecheck of every package.

## 2. Writer (openvidu-livekit)

- [x] 2.1 Vendor the contract into `openvidu/analytics/schema/contract/` with `contract/vendor.sh`. Verify with the
      writer's contract tests and `./dashboard.sh contract-check`.
- [x] 2.2 Add `openviduconfig.MediaStats` (default true) and `analytics.Node.MediaStats`, set from it in
      `openvidu/openvidu.go`, and write `mediaStats` on every heartbeat. Verify with a store integration test of the
      heartbeat for both values.
- [x] 2.3 Stamp `mediaStats: false` on rooms and participant sessions created by a node without media statistics,
      following `nodeId` (`ROOM_CREATED` sets or removes it; other events only while `nodeId` is unknown), and keep the
      legacy migration at `MediaStats: true`. Verify with projection unit tests and writer integration tests of the three
      scenarios of "Nodes without media statistics".
- [x] 2.4 Make signal and data pseudo-track stats advance the room's `lastStatsAt` without bytes or quality. Verify with
      a projection unit test of the signal-only flush, the writer integration tests and the batch benchmark.
- [x] 2.5 Lint the fork with the Dockerfile Go toolchain and run its unit and integration tests. Verify that both pass.

## 3. Backend

- [x] 3.1 Return `mediaStats: false` on rooms list items of stamped rooms. Verify with a mapper unit test and a rooms
      route integration test.
- [x] 3.2 Compute the summary's `mediaStats` coverage from the `nodes` documents whose span overlaps the range, for the
      `global` and `node:<id>` scopes, and declare it in the OpenAPI document. Verify with unit tests of the fold, an
      integration test of the four "Media statistics coverage" scenarios with an `explain()` assertion on the `nodes`
      query, and the OpenAPI test.

## 4. Frontend

- [x] 4.1 Render "—" with the tooltip in the Data up / down cell of stamped rooms in the Rooms table. Verify with a
      component test and an e2e test against the mocked API.
- [x] 4.2 Apply the summary coverage to the Data up / down tile and the Bandwidth section (notice for `none`, note for
      `partial`), and expose it to the extension cards as `AnalyticsPageContext.mediaStats`. Verify with component tests,
      a test of the context signal and an e2e test of the three "Media statistics coverage notes" scenarios.

## 5. Data generator

- [x] 5.1 Add `--nodes-without-media-stats <n>` (default 0) to the data generator and keep the flag in the keep-alive,
      let a calling demo pass extra generator options (`GENERATOR_ARGS` of `demo-lib.sh`), and update the README. Verify with a generator test that the marked node's rooms and sessions are stamped and have no
      media `track_stats`, room bytes or quality, and that the other nodes report `mediaStats: true`.

## 6. Docs and CHANGELOG

- [x] 6.1 No CHANGELOG line: unreleased, and a CE server always reports media statistics. Update the `AGENTS.md` notes
      that list the node heartbeat fields or the generator options, if any. Verify by reading the change against the
      CHANGELOG and the `AGENTS.md` files.

## 7. Integration check

- [x] 7.1 Run `./dashboard.sh check` and `./dashboard.sh contract-check ../openvidu-livekit`. Verify that both pass.
- [ ] 7.2 Run the analytics writer suite of `openvidu-test-integration` against a local deployment with the new
      server image. Verify that the node document has `mediaStats: true` and that rooms of signal-only participants get
      `lastStatsAt`.
