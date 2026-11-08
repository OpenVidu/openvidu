# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 `projection.Increment` gains `Reported` and `Missing`:
  - event and stats increments set them from `Options.WithoutMediaStats`;
  - merging increments ORs them;
  - `RenderIncrement` adds `$max` on `mediaStats.reported` / `mediaStats.missing`.
  Verify: projection unit tests for a server with and without media statistics, a merged increment of both, and the
  rendered update.
- [x] 1.2 Closures: the room and session closure states carry the entity's `mediaStats`, and `RoomEndedIncrements` and
  the closure increments mark with it. Verify: reconciler integration test closing a `mediaStats: false` room from a
  server that reports media statistics (only `missing` in the rollups).
- [x] 1.3 Contract in the writer: the three rollup schemas with `mediaStats`. Verify: `contract_integration_test.go`
  against the vendored contract of task 2.2, and the writer integration tests of the "Media statistics marks of
  rollup buckets" scenarios (`-tags integration`).
- [x] 1.4 `CHANGELOG-openvidu.md`: the rollups record whether their servers report media statistics. Verify: reviewed
  in the diff; lint with the Dockerfile Go toolchain.

## 2. Typings and contract (dashboard)

- [x] 2.1 `RollupBase.mediaStats?: { reported?: true; missing?: true }` and the rollup schemas in
  `typings/contract/schemas.ts`; the fixtures carry the `reported` mark the scenario's servers write, and the
  validator tests cover both marks. Verify: typings contract tests.
- [x] 2.2 Regenerate and vendor the contract into openvidu-livekit (`vendor.sh`). Verify:
  `./dashboard.sh contract-check <openvidu-livekit>`.

## 3. Backend

- [x] 3.1 `AnalyticsRepository.mediaStatsMarks(collection, scope, from, to)`: the `$group` aggregation on
  `scope_bucket`. The service folds it into `none` / `partial` and drops `nodesInRange` and `mediaStatsCoverage`.
  Verify: unit tests of the fold, and the `analytics-api` "Media statistics coverage" scenarios as integration tests.
- [x] 3.2 Query plan: the coverage aggregation in the analytics plan suite at scenario M. Verify: the
  "Coverage query plan" scenario (`IXSCAN` on `scope_bucket`).

## 4. Frontend

- [x] 4.1 `MEDIA_STATS_TEXTS` in `format/labels.ts`, exported from the library, replacing
  `ROOM_MEDIA_STATS_NOT_REPORTED` and `RANGE_MEDIA_STATS`. Verify: the "Texts" scenario as a unit test.
- [x] 4.2 `ovd-media-stats-warning`: warning icon button on the info tip tooltip. Add `warning` icons to `icons.json`
  if missing. Verify: component spec for hover, keyboard, tap and the order after an info tip; `icons.mjs check`.
- [x] 4.3 `warning` and `unavailable` on `ovd-kpi-tile` and `ovd-time-series-chart`, `warning` on
  `ovd-analytics-card` and `TableColumn`, and the unavailable cell element. Verify: component specs for every
  "Unavailable tile and chart" scenario and the card layout of a column warning.
- [x] 4.4 Rooms list: unavailable Data up / down cell and the column warning while a row has `mediaStats: false`.
  Verify: `rooms-page.spec.ts` for both `rooms-ui` scenarios.
- [x] 4.5 Analytics: the Data up / down tile and the Data transferred section with the warnings and the unavailable
  state, without the notices. Verify: `analytics-page.spec.ts` for the three "Media statistics coverage warnings"
  scenarios.

## 5. Data generator

- [x] 5.1 The generated rollups carry the marks of the node of each counted room or session. Verify:
  `data-generator` tests for the two generated-rollup scenarios of `data-model`.

## 6. End to end

- [x] 6.1 Fixtures and specs:
  - the Analytics `none` and `partial` summaries;
  - a rooms page with a `mediaStats: false` room;
  - the warnings' tooltips, and the unavailable tile and chart at desktop and phone width.
  Verify: the CE Playwright suite.
- [x] 6.2 Visual check on `./dashboard.sh demo` with `--nodes-without-media-stats` (light, dark, phone). Verify:
  screenshots reviewed by the owner.
- [x] 6.3 Owner review of the demo: the whole unavailable tile and chart dimmed except the warning, and on phones the
  column warning only on the cards of the rows it applies to (`warningWhen`). Verify: `kpi-tile.spec.ts`,
  `charts.spec.ts`, `data-table.spec.ts` and the Rooms and Analytics e2e specs with their axe checks.

## 7. Docs and CHANGELOG

- [x] 7.1 `CHANGELOG.md`: the warning line of the proposal. Verify: reviewed in the diff.
- [x] 7.2 `AGENTS.md` of the frontend: the warning and unavailable inputs as the way to show missing media statistics.
  The library README lists the new exports. Verify: reviewed in the diff.
- [x] 7.3 Full check: `./dashboard.sh check`, `test-integration`, `e2e` and `contract-check`, one heavy load at a time.
  Verify: all green.
