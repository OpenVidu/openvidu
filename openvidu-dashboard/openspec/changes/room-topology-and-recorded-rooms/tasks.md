# Tasks

## 1. Contract and typings

- [x] 1.1 Contract (`typings/contract/schemas.ts`):
      - the room schema gains the optional `participants.peakPublishers` (int), `topology` (the six class keys) and
        `features.recording` (bool);
      - the hourly and daily rollup schemas gain `rooms.byTopology` (the six class keys), `rooms.recorded` and
        `rooms.bySize` (the six range keys, from `0-5`), all optional ints;
      - the fixtures (`fixtures/rooms.ts`, `fixtures/stats-and-rollups.ts`) get a classified, recorded room and its
        counters;
      - the contract artifacts are regenerated.
      Verify: `pnpm --filter @openvidu-dashboard/typings test`, and the validator rejecting a rollup with an unknown
      class key.
- [x] 1.2 Data model typings: a `RoomTopology` enum and a `RoomSizeRange` enum (`0-5` to `101+`), `peakPublishers?`,
      `topology?` and `recording?` on the room types, and `byTopology?`, `recorded?` and `bySize?` on `RollupRooms`. Verify:
      `./dashboard.sh check` typecheck.
- [x] 1.3 API typings:
      - `recordedRoomsRate` (`percent`, `null`, `hourlyOnly`) in `AnalyticsMetric`, `ANALYTICS_METRIC_INFO` and
        `ANALYTICS_CE_METRICS` (23 metrics);
      - `roomTopology` and `roomSize` in `AnalyticsDimension` and `ANALYTICS_CE_DIMENSIONS`;
      - `roomsRecorded?` and `recordedRoomsRate?` on the summary type.
      Verify: `api-contract.test.ts` with the new members and their fill rules.

## 2. Writer (openvidu-livekit `openvidu/analytics`)

- [x] 2.1 Vendor the updated contract. Add the room fields to `RoomDocument` and the three counters to the hourly and
      daily rollup structs in `schema/documents.go`, and the class and range vocabulary to `projection/vocabulary.go`.
      Verify: `writer-check.sh` against the branch, and the contract fixture test.
- [x] 2.2 Publisher peak (D2):
      - `internal.senderSids` on a `TRACK_PUBLISHED` with `muted: false` and on a `TRACK_UNMUTED`, which now also
        updates its room;
      - `participants.peakPublishers` raised on those events and on a STANDARD `PARTICIPANT_ACTIVE` or
        `PARTICIPANT_RESUMED`;
      - `roomTouch` sets `participants.peakPublishers: keep(0)`.
      Verify: projection unit tests for every "Publisher peak" scenario. The batch scenario goes through the merged
      updates against MongoDB in `writer_integration_test.go`.
- [x] 2.3 `deriveRoom` (D3):
      - `topology` with the class `$switch`, only when `participants.peakPublishers` exists;
      - `features.recording` from `internal.recordingEgressIds`.
      Verify: integration tests for "Classes from the peaks", "Active room" (the class follows the room while active)
      and "Room written by an earlier writer".
- [x] 2.4 Recording egresses (D4): factor the request output kinds out of `egressRequest`, and add the egress ID to
      `internal.recordingEgressIds` for a `file` or `segments` output with a status of `active`, `ending`,
      `complete` or `limit_reached`. Verify: unit and integration tests for "Recording that completes", "Recording
      that fails before starting", "Live stream" and an HLS participant egress.
- [x] 2.5 Room-close counters (D5):
      - `Store.ParticipantSessions` becomes `Store.ClosedRooms` (sessions, `peakActive`, `topology`, `recording`);
      - `RoomEndedIncrements` takes a `ClosedRoom` and adds `rooms.byTopology`, `rooms.recorded` and `rooms.bySize`
        for every classified room;
      - both callers, `batch.go` and `reconciler_close.go`, are updated.
      Verify:
      - `rollup_test.go` for the range bounds of "Range bounds";
      - integration tests for "Ended rooms", "Events of the last batch" and "Replayed batch";
      - reconciler integration tests for "Room of a dead node", "Late real end" and "Room of an earlier writer".
- [x] 2.6 Benchmark: the batch of `TestBatchPerformanceBudget` gains unmute events and recording egresses. Verify:
      the same round trips and p95 within `benchMaxP95`, recorded in the commit body.
- [x] 2.7 `README-openvidu.md`, "What is written": the room topology (N, P, classes), the recording flag, and the
      class, recording and size counters added to the hourly and daily rollups at room close. Verify: read-through.
- [x] 2.8 `CHANGELOG-openvidu.md`: the **New analytics data model** line of the proposal. Verify: read-through.
- [x] 2.9 Run the whole writer suite (`go test ./openvidu/...`, plus the integration suites with Redis and MongoDB)
      and `golangci-lint` with the Go toolchain of the Dockerfile. Verify: all green.

## 3. Dashboard backend

- [x] 3.1 Catalogue (D7, D8, D9):
      - a table of expanded metrics (`egressEnded`) replaces the `egressEnded` special case in `metricFields`, the
        series expansion and the CSV;
      - `recordedRoomsRate` over `rooms.recorded` and the six `rooms.byTopology.<class>` paths;
      - the dimensions `roomTopology` over `rooms.byTopology` and `roomSize` over `rooms.bySize`.
      Verify: `analytics.test.ts` unit tests for "Rate per bucket", "Hour of the upgrade" and the `egressEnded`
      expansion unchanged.
- [x] 3.2 Summary: `SUMMARY_FIELDS` gains `rooms.recorded` and the class paths; `roomsRecorded` and
      `recordedRoomsRate` are set only when the classes add up to more than 0. The OpenAPI schemas and descriptions
      gain the new metric, dimensions and summary values. Verify: unit tests for "Recorded rooms" and
      "No classified room in the range".
- [x] 3.3 Integration tests in `analytics-api.test.ts`:
      - "Recorded rooms rate at five minutes" (`400`);
      - "CE metrics" with the 23 metrics;
      - "Classes of the range", "Sizes of the range" and "Range before the writer classified rooms";
      - the summary scenarios;
      - a breakdowns CSV with `roomTopology` and `roomSize`.
      The "Node scope" scenario of the dimensions runs in the PRO suite (6.2). Verify:
      `./dashboard.sh test-integration`.
- [x] 3.4 Query plan: `recordedRoomsRate` at `1h` and `1d`, and the `roomTopology` and `roomSize` dimensions, in
      `analytics-query-plan.test.ts`. Verify: `explain()` reports the `{ scope, bucket }` index with no extra keys
      examined.

## 4. Data generator

- [x] 4.1 Room shapes (D12): each room draws a class from the mix and its sessions and tracks are generated to match.
      Senders publish unmuted tracks; the others publish nothing or tracks muted for good, with `muted: true` in the
      track and its `TRACK_PUBLISHED`. `participants.peakPublishers` and `topology` are derived from the overlaps.
      Verify: `data-generator.test.ts` "Generated classes".
- [x] 4.2 Recordings: about a quarter of the rooms get a room composite or track egress with a `file` or `segments`
      output, and `features.recording` follows the writer's rule. Verify: a `data-generator.test.ts` check that
      `features.recording` matches the generated egresses.
- [x] 4.3 Rollups: `rooms.byTopology`, `rooms.recorded` and `rooms.bySize` at each room's end bucket, in the
      hourly and daily documents of its scopes. Verify: `data-generator.test.ts` "Generated rollups match the rooms",
      with and without `--node-rollups`, and the contract validation of the generated documents.
- [x] 4.4 `tools/data-generator/README.md`: the room shapes, the recordings and the new counters. Verify:
      read-through.

## 5. Dashboard frontend (CE)

- [x] 5.1 Chart palette and labels:
      - `ENTITY_SLOTS` gains `topology_<class>` as in D11;
      - the shared enum labels gain the classes (Empty, Single participant, No publishers, 1:1, 1:N, N:M); the size
        ranges read as their keys, from `0-5`.
      Verify: `charts.spec.ts` "Topology classes" and the enum label tests.
- [x] 5.2 Ordered breakdown (D10): `ovd-breakdown-chart` gains an ordered mode (given order in the chart and the
      table, every entry shown, no "Other", the shared empty state when every value is 0); `ovd-stacked-category-chart`,
      `stackedCategoryOption` and `CategorySeries` are removed with their tests and exports. Verify:
      - `charts.spec.ts` "Nine SDKs", "Ordered bars" and "Ordered breakdown without data";
      - an axe check;
      - the public API test of the library exports.
- [x] 5.3 Analytics page data:
      - the plan requests `recordedRoomsRate` at `max(effective, 1h)`, and `roomTopology` and `roomSize` with the
        breakdowns;
      - the class entries in the order of D10 with their class entities, and the six ranges with the `rooms` entity;
      - the Rooms card empty state is unchanged.
      Verify: `analytics-page.spec.ts` plan tests at `auto` over 24 h and 7 d and at `1d`.
- [x] 5.4 Template (D13):
      - the Recorded rooms tile after Average room duration, with its hint and n/a rules;
      - Rooms: "Active rooms" and "Rooms created" in a first `ovd-chart-grid`, and "Room topology" and "Room size"
        (ordered bars) and "Recorded rooms" (fitted percentage line in the Rooms colour) in a second;
      - Participants: "Active participants" and "Participant sessions" in a first grid, and "Unique identities",
        "Participant kind" and "Connection success" in a second.
      Verify: `analytics-page.spec.ts` for the "Rooms section", "Participants and unique identities section",
      "Recorded rooms tile", "Room topology chart", "Room size chart" and "Recorded rooms chart" scenarios, and
      "Analytics section colours".
- [x] 5.5 CSV export of the Rooms card as in "Entity section exports". Verify: `analytics-page.spec.ts` export test
      at `auto` and at `1d`.
- [x] 5.6 `INFO_TEXTS`: the Recorded rooms tile and the three charts, with the texts of `ui-info-tips`. Verify:
      `analytics-page.spec.ts` info tip test.
- [x] 5.7 e2e:
      - the analytics fixtures gain a rate series and the class and size breakdowns;
      - `analytics.spec.ts` checks the Rooms headings, notes, the tile, the CSV metrics, the Rooms and Participants
        rows at 1920 px (two and three) and one chart per row on a phone;
      - `info-tips.spec.ts` checks the new texts.
      Verify: `./dashboard.sh e2e` with the axe checks.
- [x] 5.8 `dashboard-ce/frontend/AGENTS.md`: the ordered breakdown next to the breakdown chart, no stacked category
      chart, and the two grids of an entity section in the chart grid notes. Verify: read-through and `./dashboard.sh check`.
- [x] 5.9 `CHANGELOG.md`: amend the 3.10.0 Analytics line as the proposal says. Verify: read-through.

## 6. PRO edition

- [ ] 6.1 Move `ce.ref` to the CE commit of this change. Verify: PRO `./dashboard.sh check`, and the PRO Analytics
      card tests with the Rooms section of five charts in two grids.
- [ ] 6.2 PRO integration test for the "Node scope" scenario of the room topology and size dimensions, and the
      node-scope series of `recordedRoomsRate`. Verify: PRO `./dashboard.sh test-integration` and
      `./dashboard.sh e2e`.

## 7. Final verification

- [x] 7.1 CE: `./dashboard.sh check`, `./dashboard.sh test-integration`, `./dashboard.sh e2e` and
      `./dashboard.sh contract-check` against the writer branch, all green; `openspec validate
      room-topology-and-recorded-rooms --strict` green.
- [ ] 7.2 Manual check on `./dashboard.sh demo both`:
      - CE and PRO over 24 h, 7 d at 6 h and 30 d at 1 d, in light and dark, at 1440 px and 1920 px;
      - the Recorded rooms tile, the three charts, their colours, order and notes, and the Rooms and Participants rows;
      - the CSV of the Rooms card;
      - a PRO node scope.
- [x] 7.3 Manual check against a local CE server built from the writer branch:
      - an OpenVidu Meet meeting of three in which one speaks reads 1:N;
      - once a second participant unmutes, it reads N:M;
      - after ending it with a recording, the hourly rollup counts it once as recorded;
      - a room left without a recording is not counted as recorded.
- [x] 7.4 PRO fork (openvidu-pro-livekit), after merging the writer change: its analytics tests pass. Verify: the
      fork's analytics unit and integration tests.

## Workflow follow-up

- Owner review of the change, then archive it when asked: sync the specs, delete the change folder, commit "archive
  room-topology-and-recorded-rooms, keep only the specs", and move the PRO `ce.ref`.
- The PRO room detail (class with P and N, Recorded chip) follows as a PRO change once this one is applied.
