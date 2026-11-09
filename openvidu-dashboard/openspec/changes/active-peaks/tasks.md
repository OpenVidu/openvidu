# Tasks

## 1. Contract and typings

- [x] 1.1 Add `rooms.peakActive` and `participants.peakActive` (int, optional) to the hourly, daily and 5-minute rollup
      schemas of `typings/contract/schemas.ts`. Change the daily `uniqueIdentities` description to "Set by the server
      aggregator once the UTC day has closed". Regenerate the contract artifacts and fixtures. Verify:
      `pnpm --filter @openvidu-dashboard/typings test`.
- [x] 1.2 Add `roomsPeakActive` and `participantsPeakActive` to `AnalyticsMetric`, `ANALYTICS_METRIC_INFO`
      (`unit: 'count'`, `empty: null`, at every granularity) and `ANALYTICS_CE_METRICS`. Verify: typings contract
      tests and `./dashboard.sh check` typecheck.

## 2. Writer: aggregator (openvidu-livekit `openvidu/analytics`)

- [x] 2.1 Vendor the updated contract. Add `PeakActive *int32` to the rooms and participants parts of the rollup
      document structs, hourly, daily and 5-minute. Verify: `writer-check.sh` against the branch, and the contract
      fixture test.
- [x] 2.2 Give `projection.Increment` a map of maxima, rendered into the `$max` stage beside the media statistics
      marks, without a mark when the increment carries none. Verify: unit test of `RenderIncrement` with maxima only,
      and with maxima and marks.
- [x] 2.3 Extract the leader runner from the reconciler loop: obtain, refresh, release, startup run, lock error pause,
      parameterised by key, interval and cycle. Move the reconciler onto it with its partial follow-ups unchanged.
      Verify: the existing `reconciler_test.go` and `reconciler_integration_test.go` pass unchanged.
- [x] 2.4 Add the store queries: active rooms and active STANDARD sessions grouped by `mediaNode`, and the live
      labelled nodes within their silent window. Verify: integration test of the counts, and `explain()` showing
      `status_lastEventAt_active` and `status_kind` without `COLLSCAN`.
- [x] 2.5 Add the aggregator:
      - a run samples the counts and upserts the peaks with `$max` into the bucket of the run time in the three
        collections, global always and node scopes as specified;
      - then it computes the daily unique identities, moved from the reconciler with their store methods and tests;
      - lock `analytics-aggregator-lock` (local mutex without Redis), 60 s interval, 65 s TTL, startup run;
      - metrics `openvidu_analytics_aggregator_runs_total{result}` and
        `openvidu_analytics_aggregator_run_duration_seconds`.
      Verify: unit tests with a fake store for every `server-aggregator` scenario (busy minute, peak kept, idle
      deployment, marks untouched, two media nodes, idle live node, stopped node, unlabelled server, unique
      identities scenarios, repeated run, database error, metrics).
- [x] 2.6 Wire the aggregator in `analytics.go`: started whenever analytics is enabled, whatever
      `reconciler.enabled`, and stopped with the writer. Remove `dailyUniqueIdentities` from the reconciler and its
      store interface. Verify: integration tests "Two nodes", "Startup run", "Redis restart" and "Reconciler disabled";
      the writer's Redis keys test lists both locks.
- [x] 2.7 Add a benchmark case: one run with 2 000 active rooms and 20 000 active STANDARD sessions, under 200 ms at
      p95 without unique identities. Verify: `bench_integration_test.go` result recorded in the PR.
- [x] 2.8 Run the whole writer suite: `go test ./openvidu/...`, plus the integration suites with Redis and MongoDB.
      Run `golangci-lint` with the Go toolchain of the Dockerfile.

## 3. Dashboard backend

- [x] 3.1 Add `peak(path)` to the analytics catalogue (maximum-combined path, value `null` without a sample). Map
      `roomsPeakActive` to `rooms.peakActive` and `participantsPeakActive` to `participants.peakActive`. Verify: unit
      tests of the catalogue values.
- [x] 3.2 Make `foldRows` and `mergeCounters` keep the maximum for the catalogue's maximum-combined paths and sum the
      rest. Keep the Overview's today fold working. Verify: unit tests "Fifteen-minute peak", a merge of a memoised
      and a fresh fold over the same bucket, and the existing fold tests.
- [x] 3.3 Integration tests on the series and CSV endpoints:
      - "Peaks at five minutes", with `null` before the samples;
      - "Daily peak in a time zone";
      - "CE metrics", listing the twenty metrics;
      - a series CSV with the peaks, `null` as an empty cell;
      - the OpenAPI `metrics` enum.
      Verify: `./dashboard.sh test-integration`.
- [x] 3.4 Query plan: add a `roomsPeakActive` request at `5m`, `1h` and `1d` to `analytics-query-plan.test.ts`.
      Verify: `explain()` reports the `{ scope, bucket }` index with no extra keys examined.

## 4. Data generator

- [x] 4.1 Derive the peaks in `tools/data-generator/src/derive.ts`:
      - a per-minute sweep of the rooms and STANDARD sessions active, maximum per bucket and scope, on every rollup
        document the generator writes;
      - global documents with both peaks at `0` for buckets without activity;
      - node scopes while their node is alive.
      Verify: unit tests "Generated peaks" and "Idle generated hour"; `data-generator.test.ts` validates the
      documents against the contract.
- [x] 4.2 Update `tools/data-generator/README.md` ("What it writes") with the peaks.

## 5. Dashboard frontend

- [x] 5.1 Rooms card:
      - `roomsPeakActive` as the `step` chart "Active rooms", with its info tip;
      - empty only when no peak is above 0 and `summary.roomsCreated` is `0`;
      - its CSV exports `roomsPeakActive`.
      Verify: `analytics-page.spec.ts` "Rooms over 24 hours", "Range partly before the samples" and "Range without
      rooms".
- [x] 5.2 Participants card:
      - `participantsPeakActive` as the `step` chart "Active participants", with its info tip, replacing
        "Participant sessions";
      - its CSV exports `participantsPeakActive`, `connectionSuccessRate` and `uniqueIdentities`.
      Verify: `analytics-page.spec.ts` "Active participants over 24 hours" and the existing unique identities
      scenarios.
- [x] 5.3 Update `PAGE_METRICS`, the series colours and labels map of the page, and `INFO_TEXTS` (`sessionsChart` out,
      `activeRoomsChart` and `activeParticipantsChart` in, with the texts of `ui-info-tips`). Verify: unit tests and
      `./dashboard.sh check`.
- [x] 5.4 e2e: give the analytics fixtures peak series. Update `analytics.spec.ts` (charts, CSV metrics, chart notes)
      and `info-tips.spec.ts` (Active rooms and Active participants texts). Verify: `./dashboard.sh e2e` with the axe
      checks.

## 6. Documentation and CHANGELOG

- [x] 6.1 openvidu-livekit `README-openvidu.md`:
      - an aggregator section (lock, schedule, peaks, unique identities, metrics, independence from
        `reconciler.enabled`);
      - remove unique identities from the reconciler section;
      - say "computed by the aggregator" in the `retention.entities` row.
      Verify: read-through.
- [x] 6.2 openvidu-livekit `CHANGELOG-openvidu.md`: the new **Analytics aggregator** line of the proposal. Verify:
      read-through.
- [x] 6.3 Dashboard `CHANGELOG.md`: amend the 3.10.0 Analytics line as the proposal says. Verify: read-through.
- [x] 6.4 Update the `AGENTS.md` files whose notes name the analytics catalogue, the fold or the data generator
      outputs, if any of them changes. Verify: `./dashboard.sh check` and a grep for `sessionsChart`,
      `Rooms created and ended` and `Participant sessions` chart references.

## 7. Final verification

- [x] 7.1 `./dashboard.sh check`, `./dashboard.sh test-integration` and `./dashboard.sh e2e` green;
      `openspec validate active-peaks --strict` green.
- [x] 7.2 Manual check on `./dashboard.sh demo ce`: the Rooms and Participants cards over 24 h, 7 d and 90 d, light
      and dark, and the CSV of both cards.
- [x] 7.3 Manual check against a local deployment with the new server: peaks appear within a minute of joining a room,
      they stay after it ends, and `reconciler.enabled: false` keeps them and the unique identities.

## Workflow follow-up

- Owner review of the change, then archive it when asked: sync the specs, delete the change folder, commit "archive
  active-peaks, keep only the specs".
