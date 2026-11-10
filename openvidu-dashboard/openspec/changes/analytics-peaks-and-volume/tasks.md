# Tasks

## 1. Contract and typings

- [x] 1.1 Add `egress.peakActive` (int, optional) to the hourly, daily and 5-minute rollup schemas of
      `typings/contract/schemas.ts`, and `ingress.peakActive` to the hourly and daily ones, described as sampled
      every minute by the server aggregator in the global scope. Update the fixtures in
      `fixtures/stats-and-rollups.ts`:
      - the 10:34:20 sample counts the open egresses and ingress sessions of the scenario into the global documents;
      - the node documents lose their egress and ingress counters.
      Regenerate the contract artifacts. Verify: `pnpm --filter @openvidu-dashboard/typings test`.
- [x] 1.2 Add `peakActive?` to the egress and ingress rollup types and the 5-minute egress type in
      `typings/src/data-model`. Verify: `./dashboard.sh check` typecheck.
- [x] 1.3 Add `egressPeakActive` (`unit: 'count'`, `empty: null`) and `ingressPeakActive` (`unit: 'count'`,
      `empty: null`, `hourlyOnly: true`) to `AnalyticsMetric`, `ANALYTICS_METRIC_INFO` and `ANALYTICS_CE_METRICS`
      (22 metrics). Mark the egress and ingress metrics `globalOnly`, and export the global-only dimensions
      (`egressType`, `egressStatus`, `ingressInputType`). Verify: `api-contract.test.ts` with the peak `null` rule and
      the global-only marks.

## 2. Writer (openvidu-livekit `openvidu/analytics`)

- [x] 2.1 Vendor the updated contract. Add `PeakActive *int32` to `RollupEgress`, `FiveMinuteEgress` and
      `RollupIngress`. Verify: `writer-check.sh` against the branch, and the contract fixture test.
- [x] 2.2 Write the egress and ingress rollup counters (5-minute, hourly and daily) through global-only increments.
      Rooms, participants and the other counters keep their node scope. Verify: projection unit tests for "Egress
      counted globally" and "Ingress counted globally", asserting no `node:` increment carries an `egress` or
      `ingress` path; the existing rollup tests updated.
- [x] 2.3 Add the store counts `ActiveEgress` (status `starting`, `active`, `ending`, hint `status_startedAt`) and
      `ActiveIngressSessions` (status `buffering`, `publishing`, hint `status`). Verify: integration test "What
      counts as active" and `explain()` showing both indexes without `COLLSCAN`.
- [x] 2.4 Extend the aggregator:
      - `samplePeaks` runs the four counts;
      - `PeakIncrements` takes `Peaks{Rooms, Participants, Egress, Ingress}`: global increments with all four
        (ingress hourly and daily only), node increments with rooms and participants only.
      Verify: aggregator unit tests "Busy minute", "Idle deployment", "No ingress in the 5-minute rollups", "Two media
      nodes", "Egress and ingress stay global", "Idle live node" and "Server without a label"; `rollup_test.go` for
      the increments; the integration test of the peaks in the rollups.
- [x] 2.5 Benchmark: add 500 open egresses and 200 publishing ingress sessions, among 50 000 closed egresses and
      20 000 closed ingress sessions, to `TestAggregatorPerformanceBudget`, keeping 200 ms at p95. Verify: the
      benchmark result, recorded in the commit body.
- [x] 2.6 Run the whole writer suite (`go test ./openvidu/...`, plus the integration suites with Redis and MongoDB)
      and `golangci-lint` with the Go toolchain of the Dockerfile.

## 3. Dashboard backend

- [x] 3.1 Map `egressPeakActive` to `peak('egress.peakActive')` and `ingressPeakActive` to
      `peak('ingress.peakActive')` in the analytics catalogue. Verify: unit tests of the catalogue values and of
      `maximumPaths`.
- [x] 3.2 Node scope:
      - the series, breakdowns and both CSV kinds reject the global-only metrics and dimensions with `400
        VALIDATION_ERROR` ("… is only available for the global scope"), after the PRO gate;
      - the summary omits `egressStarted`, `egressDurationMs`, `ingressSessions` and `ingressDurationMs`;
      - the OpenAPI descriptions name the global-only items.
      Verify: unit tests of the validation and the summary with an `AnalyticsFeatureGate` that enables
      `per-node-breakdown`; the CE integration test "Global scope"; the node-scope scenarios run in the PRO
      integration suite (6.2), since CE answers `403` to any node scope.
- [x] 3.3 Integration tests on the series and CSV endpoints:
      - "Egress and ingress peaks";
      - "Ingress peak at five minutes" (`400`);
      - "CE metrics" with the 22 metrics;
      - the OpenAPI `metrics` enum;
      - a CSV with `null` peaks as empty cells.
      Verify: `./dashboard.sh test-integration`.
- [x] 3.4 Query plan: add `egressPeakActive` at `5m` and `ingressPeakActive` at `1h` to
      `analytics-query-plan.test.ts`. Verify: `explain()` reports the `{ scope, bucket }` index with no extra keys
      examined.

## 4. Data generator

- [x] 4.1 Extend the peaks sweep in `derive.ts` with global egress and ingress session spans: `egress.peakActive`
      into the three collections, `ingress.peakActive` into hourly and daily only, and idle buckets at `0`. Verify:
      `data-generator-peaks.test.ts` "Generated egress and ingress peaks" and "Idle generated hour", and
      `data-generator.test.ts` against the contract.
- [x] 4.2 Keep the egress and ingress counters out of the node scopes (`--node-rollups`). Verify:
      `data-generator.test.ts` "Labelled generated database" of "Generated egress and ingress rollups stay global".
- [x] 4.3 Update `tools/data-generator/README.md` with the egress and ingress peaks and the global-only egress and
      ingress rollups. Verify: read-through.

## 5. Dashboard frontend (CE)

- [x] 5.1 Chart palette:
      - `ENTITY_SLOTS` follows the colour table of design.md;
      - new keys `participants`, `success` and `quality`;
      - `STANDARD` → 7, `AGENT` → 5, `INGRESS`/`ingress` → 6, `room_composite` → 2, `track_composite` → 1, `rtmp` → 6.
      Verify: `charts.spec.ts` "Entity slots" and "Kinds of one chart stay distinct", and the existing palette tests.
- [x] 5.2 Add `ovd-chart-grid` to the UI library, exported for the editions:
      - columns from `balancedColumns(count, width, 420, 16)`;
      - a flex-wrap layout whose shorter last row shares its width;
      - laid out before first paint, then on resize and when its content changes.
      Verify: component tests for every `Balanced chart grid` scenario, and the public API test of the library
      exports.
- [x] 5.3 Fitted y-axis: a `fitted` input on the time-series chart, a `fitted` option in `timeSeriesOption` for
      percentage series. Verify: `charts.spec.ts` "High rates", "One low bucket", "Very low rate" and "No values".
- [x] 5.4 Breakdown chart `unavailable` input: an empty ring or plot over hatching, dimmed, with no slices, labels,
      legend, tooltip or table toggle. Verify: `charts.spec.ts` "Unavailable donut" and an axe check of the
      unavailable state.
- [x] 5.5 Analytics page data:
      - `PAGE_METRICS` with `roomsCreated`, `participantsJoined`, `egressPeakActive` and `ingressPeakActive`;
      - `uniqueIdentities` in its own `1d` request at every granularity;
      - in a node scope, the plan drops the global-only metrics and dimensions;
      - `SERIES_LABELS` with the section entities and the new labels;
      - `charts()` with the new series;
      - the Rooms card empty state from `view(['roomsPeakActive', 'roomsCreated'])`, with the `roomsView()` special
        case removed.
      Verify: `analytics-page.spec.ts` plan tests (requests per granularity, `ingressPeakActive` hourly,
      `uniqueIdentities` at `1d` from `auto` over 24 h and 7 d, a node scope without egress or ingress items).
- [x] 5.6 Template:
      - each entity card has its tiles, then `ovd-chart-grid` with the peak (area) and volume (bar) pair first;
      - Connection success is `fitted`;
      - Unique identities is always the fifth Participants chart, and the hint and the "Switch to 1 d" action go;
      - Client breakdowns use the grid;
      - the page `.grid` and `.identities-hint` styles are removed.
      Verify: `analytics-page.spec.ts` for the Rooms, Participants, Egress and Ingress section scenarios and "Analytics
      section colours".
- [x] 5.7 Node scope: the Egress and Ingress KPI tiles and cards render unavailable with the warning "Egress and
      ingress are not attributed to media nodes. Select All nodes in Scope to see them." (shared texts module), and
      their Export CSV is off; Participant kind keeps its Egress and Ingress slices. Verify: `analytics-page.spec.ts`
      "Node scope", "Participant kind of a node" and "Back to all nodes".
- [x] 5.8 CSV exports per card as in "Entity section exports". Verify: `analytics-page.spec.ts` export test at `auto`
      and at `1d`.
- [x] 5.9 `INFO_TEXTS`: `activeEgressChart` and `activeIngressChart` with the texts of `ui-info-tips`. The
      Participant sessions chart uses `participantSessions`. Verify: `analytics-page.spec.ts` info tip test.
- [x] 5.10 e2e:
      - egress and ingress peak series and a daily unique identities series in the analytics fixtures;
      - `analytics.spec.ts`: headings, notes, the CSV metrics, the Participants rows at 1920 px, one chart per row
        on a phone;
      - `info-tips.spec.ts`: the new texts.
      Verify: `./dashboard.sh e2e` with the axe checks.

## 6. PRO edition

- [ ] 6.1 Move `ce.ref` to the CE commit of this change. The Diagnostics card uses `ovd-chart-grid` instead of its
      local grid, and the Quality card wraps its two charts in it. Verify: PRO `./dashboard.sh check` and the PRO
      analytics card tests.
- [ ] 6.2 Node-scope e2e of `dashboard-pro/e2e/tests/analytics.spec.ts`:
      - no node-scope request names an egress or ingress metric or dimension;
      - the Egress card shows the warning and its unavailable charts;
      - All nodes brings them back.
      PRO integration tests for "Egress series of a node", "Ingress breakdown of a node" and "Summary of a node".
      Verify: PRO `./dashboard.sh e2e` and `./dashboard.sh test-integration`.

## 7. Documentation and CHANGELOG

- [x] 7.1 openvidu-livekit `README-openvidu.md`:
      - the Aggregator section gains the egress and ingress counts, their statuses and the global-only peaks
        (`ingress.peakActive` hourly and daily only);
      - the rollups section says the egress and ingress counters are global-only.
      Verify: read-through.
- [x] 7.2 openvidu-livekit `CHANGELOG-openvidu.md`: the **Analytics aggregator** and **New analytics data model** lines
      of the proposal. Verify: read-through.
- [x] 7.3 Dashboard `CHANGELOG.md`: amend the 3.10.0 Analytics line as the proposal says. Verify: read-through.
- [x] 7.4 Update the `AGENTS.md` files whose notes name the analytics page layout, the chart palette, the node scopes
      or the generator outputs, if any. Verify: `./dashboard.sh check` and a grep for `.identities-hint`, `kind="step"`
      in the Analytics page and `sessions` series entities.

## 8. Final verification

- [x] 8.1 CE: `./dashboard.sh check`, `./dashboard.sh test-integration`, `./dashboard.sh e2e` and
      `./dashboard.sh contract-check` against the writer branch, all green; `openspec validate
      analytics-peaks-and-volume --strict` green.
- [ ] 8.2 Manual check on `./dashboard.sh demo both`:
      - CE and PRO over 24 h, 7 d at 6 h and 30 d at 1 d, in light and dark, at 1440 px and 1920 px;
      - the pairs, the section colours, the balanced rows, the fitted Connection success, Unique identities at every
        granularity;
      - the CSV of the four entity cards;
      - a PRO node scope with Egress and Ingress unavailable and their warning.
- [ ] 8.3 Manual check against a local CE server built from the writer branch: start an egress and an ingress
      session, see `egress.peakActive` and `ingress.peakActive` in the global rollups within a minute and see them
      stay after they end.
- [ ] 8.4 PRO fork (openvidu-pro-livekit), after merging the writer change: its analytics tests pass, and a labelled
      server writes no `egress` or `ingress` field into its `node:` rollups. Verify: the fork's analytics unit and
      integration tests.

## Workflow follow-up

- Owner review of the change, then archive it when asked: sync the specs, delete the change folder, commit "archive
  analytics-peaks-and-volume, keep only the specs", and move the PRO `ce.ref`.
