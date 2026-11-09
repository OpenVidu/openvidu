# Design

## Context

See proposal.md for the motivation. Current state that shapes the approach:

- **Writer (openvidu-livekit `openvidu/analytics`):** each server projects its own events into the rollups with
  `$inc`, through `projection.Increment` and `store.ApplyIncrements`. The update document is `$setOnInsert` of
  `scope` and `bucket`, plus `$inc`, plus `$max` for the media statistics marks. The rollup `_id` is
  `<scope>:<RFC 3339 bucket>`.
- **Reconciler:**
  - It runs under a Redis lock with `redislock` (`localLocker` without Redis), once at startup and then every
    `reconciler.interval`, with partial follow-ups.
  - Its loop, lease refresh and release live in `reconciler.go`. `newReconcilerRunner` in `analytics.go` returns nil
    when `reconciler.enabled` is false.
  - `dailyUniqueIdentities` runs at the end of `reconcile()`, with the store methods `DaysWithoutUniqueIdentities`,
    `UniqueIdentities` and `SetUniqueIdentities`.
- **Live counters:** the Overview counts rooms with `status: "active"` and participants with `status: "active"` and
  `kind: "STANDARD"`. Both are backed by existing indexes: rooms `status_lastEventAt_active` (partial on active) and
  participants `status_kind`. Entities of a labelled server carry `mediaNode`.
- **Dashboard backend:**
  - `foldRows` sums every numeric leaf of the projected rollup documents into each bucket.
  - `mergeCounters` adds two folds; it joins the memoised completed buckets with the fresh tail.
  - Metric values are computed from these sums by the catalogue (`sum()`, `ratio()`, `uniqueIdentities`).
- **Analytics page:**
  - The Rooms card draws `roomsCreated` and `roomsEnded` as bars.
  - The Participants card draws `participantsJoined` and `participantsAborted` as "Participant sessions".
  - A card is empty when every charted point is `null` or `0`.
  - The chart component already has a `step` kind.

## Goals / Non-Goals

**Goals:**
- One sampler for the whole deployment, so the global value is a true count and not a sum of per-server maxima.
- Peaks available at every granularity and for as long as each rollup collection is kept.
- The same definition of "active" as the Overview live tiles, for every RTC engine.
- The reconciler reduced to closing lost entities.

**Non-Goals:**
- Exact peaks between samples. A room or session that lives less than a minute between two samples may be missed.
- An average of active rooms or participants, and peaks of tracks, egress or ingress.
- Any change to the summary, the Overview, the room page or other pages.

## Decisions

### A job of its own, not the reconciler

The aggregator is a new periodic job with its own lock key, `analytics-aggregator-lock`. It owns the values that need
a view of the whole deployment: the peaks and the daily unique identities.

Alternatives rejected:
- **Sampling inside the reconciler**, next to unique identities. It is the smallest change, but it mixes
  responsibilities and makes the analytics depend on `reconciler.enabled`.
- **A per-server writer sample.** Each server only knows its own rooms. The global peak would be a sum of maxima taken
  at different moments, and an idle server writes nothing.
- **Counting overlaps at read time from `rooms` and `participants`.** It only reaches back to the entities retention
  (90 d against 400 d of hourly rollups). It is costly over long ranges, and a coarse bucket counts the rooms active
  at any time in the bucket instead of at once.
- **`participants.connected` of the 5-minute rollups.** It already exists, but it is kept 7 days, counts every kind,
  has no room equivalent and is empty on servers without media statistics.
- **The dashboard sampling.** The dashboard does not write analytics data and is not always running.

### A shared leader runner

The lease loop of the reconciler covers obtaining, refreshing and releasing the lock, the startup run, the lock error
pause and the release warnings. It becomes a small runner parameterised by the lock key, the interval and a cycle
function. The reconciler keeps its partial follow-ups inside its cycle function, and the aggregator's cycle is one run.

Alternative rejected: copying the loop. It would leave two lock implementations to keep in step.

### Fixed one-minute schedule, no configuration key

The interval is 60 s and the lock TTL 65 s, as for the reconciler at its default.
- Five samples per 5-minute bucket give a stable peak.
- One count per minute is cheap.
- A configuration key would add validation and documentation for no use case.
- A test can shorten the interval through the runner settings, as the reconciler tests do.

Alternative rejected: following `reconciler.interval`. That ties the two jobs together again.

### Peak only, written with `$max` into the three collections

Each run upserts the bucket of its run time in `analytics_5min`, `analytics_hourly` and `analytics_daily`. The
update is `$setOnInsert` of `scope` and `bucket` (the writer's shape and `_id`) plus `$max` of
`rooms.peakActive` and `participants.peakActive` (int32).
- Writing each collection directly keeps each one valid on its own retention; the 5-minute documents are gone after 7
  days.
- `$max` keeps the operation idempotent and harmless when two leaders overlap during a handover.

`projection.Increment` gains a map of maxima, rendered into the existing `$max` stage beside the marks, so
`store.ApplyIncrements` writes the samples with one unordered bulk write per collection.

Alternatives rejected:
- **Deriving hourly and daily from the 5-minute documents.** It is a second pass, and it cannot reach back beyond 7
  days.
- **Storing the sum and count of samples for an average.** It is not asked for. It can be added later beside the peak
  without touching it.

### Zero samples and `null` gaps

The global scope always gets a sample, `0` included. A node scope gets one when:
- an active room or session holds its label; or
- a `nodes` document with that `mediaNode`, without `stoppedAt`, was seen within its silent window,
  `max(60 s, 2 × batchIntervalMs + 15 s)`, the window of the `freshnessWindows` typings helper.

A bucket without any sample reads `null`. The chart then tells "nothing was active" (0) apart from "not sampled"
(before the upgrade, analytics off, no leader).

Alternative rejected: fill with `0`. It would draw a year of zeros before the upgrade.

### Sample first, then unique identities

A run takes the counts first, because they are tied to the run time. Then, within the lock budget, it computes the
unique identities exactly as the reconciler did. The store methods and their tests move with them. The only change
is the documents they meet: every UTC day now has a global daily document, written by the samples. An idle day
therefore gets `uniqueIdentities: 0`, where it had no document before. The API already reads both cases as `0` for
a closed day.

### No run record in `schema_meta`

The aggregator reports through `openvidu_analytics_aggregator_runs_total{result}`,
`openvidu_analytics_aggregator_run_duration_seconds` and its logs: debug per run, a warning per failure.
- Nothing in the dashboard reads a run record.
- The reconciler's record serves its closure counts, which the aggregator does not have.
- Leaving the record out keeps the `schema_meta` ids of the contract unchanged.

### Dashboard: the catalogue says how a metric combines

A new catalogue constructor `peak(path)` declares its path as maximum-combined. Its value is the stored peak, or
`null` without one.
- `foldRows` and `mergeCounters` take the set of maximum-combined paths and keep the larger value for them, summing
  the rest as today.
- The fold stays in Node, as for every analytics metric; no `$group` is pushed to MongoDB.
- The documents counter `#documents` is unchanged.

## Data model

- **Collections:** `analytics_5min`, `analytics_hourly`, `analytics_daily`.
- **Fields:**
  - `rooms.peakActive` (int32, optional);
  - `participants.peakActive` (int32, optional, STANDARD sessions only).
  Both are written by the aggregator only, in `global` and `node:<label>` documents.
- **Indexes:** none new. Writes go by `_id`, and reads use the existing `{ scope, bucket }` index.
- **Retention:** the retention of each rollup collection (TTL on `bucket`; daily kept forever by default).
- **Schema version:** no change. The fields are additive and optional. The contract schemas gain them, and the daily
  `uniqueIdentities` description names the aggregator.
- **Legacy migration:** no mapping. Legacy events are not replayed into peaks, so migrated buckets read `null`.
- **Volume:** an idle deployment now gets one document per bucket and per live labelled node: 288 + 24 + 1 a day per
  scope, each under 150 bytes.

## API

- **No new path or parameter.** `GET /api/v1/analytics/series` and `GET /api/v1/analytics/export.csv?kind=series`
  accept `roomsPeakActive` and `participantsPeakActive` in `metrics`. They are not gated, valid at every granularity,
  and their points are `number | null`. The CSV writes an empty cell for `null`, as for `connectionSuccessRate`.
- **Index:** the same bounded `{ scope, bucket }` scan; the query plan suite covers a peaks request.
- **OpenAPI:** the `metrics` enum of both operations gains the two values. The typings `AnalyticsMetric`,
  `ANALYTICS_METRIC_INFO` (`unit: 'count'`, `empty: null`) and `ANALYTICS_CE_METRICS` gain them too.

## Frontend

- **Rooms card:**
  - It draws `roomsPeakActive` as the `step` chart "Active rooms", with the existing tiles.
  - It is empty only when no peak is above 0 and `summary.roomsCreated` is `0`.
  - Its CSV exports `roomsPeakActive`.
- **Participants card:**
  - It draws `participantsPeakActive` as the `step` chart "Active participants", next to "Connection success".
  - Its CSV exports `participantsPeakActive`, `connectionSuccessRate` and `uniqueIdentities`.
- **Page metrics:** `PAGE_METRICS` replaces `roomsCreated`, `roomsEnded`, `participantsJoined` and
  `participantsAborted` with the two peaks.
- **Info texts:** the `INFO_TEXTS` entry `sessionsChart` is replaced by `activeRoomsChart` and
  `activeParticipantsChart`.

## Data generator

The generator samples each minute of every rollup bucket it writes:
- the generated rooms active at that minute (`createdAt ≤ t < endedAt`, or still open);
- the STANDARD sessions active at that minute (`activeAt ≤ t < leftAt`, or still open).

It writes the maximum per bucket and scope with a sweep over the sorted start and end times. Buckets without
activity get global documents with both peaks at `0`. Node scopes get the samples of their label while that node is
alive, as the generated `nodes` documents describe.

## Performance budget

- **Aggregator run:**
  - **Budget:** at most 200 ms at p95 with 2 000 active rooms and 20 000 active STANDARD sessions on the test
    MongoDB, unique identities excluded. Those keep their current cost.
  - **Verification:** a case of the writer's integration benchmark (`bench_integration_test.go`), and an
    integration test asserting with `explain()` that both counts use `status_lastEventAt_active` and `status_kind`,
    with no `COLLSCAN`.
- **Writes:** three unordered bulk writes per run, of `1 + live labelled nodes` upserts each.
- **Dashboard:** no new query, and the same keys examined. `analytics-query-plan` asserts a `roomsPeakActive`
  request at `5m`, `1h` and `1d`.

## Risks / Trade-offs

- [Short rooms between samples are missed] → Accepted. The charts are labelled and explained as the most active at
  once, sampled every minute.
- [Lost entities inflate the peak until the reconciler closes them] → The same value the Overview shows live. The
  reconciler closes lost participants within about 2 minutes.
- [Lock handover leaves a minute or two without samples] → A 5-minute bucket still has the other samples. A bucket
  without any sample shows a gap instead of a wrong value.
- [Readers that treat a rollup document as a sign of activity] → The analytics readers sum absent counters as 0 and
  read the media statistics marks, which the aggregator never sets.
- [Rolling upgrade: an old server's reconciler and a new aggregator both compute unique identities] → Same values
  from the same sessions; the later `$set` writes the same number.

## Migration Plan

1. Release the server (aggregator, reconciler without unique identities) and the dashboard together in 3.10.
   Neither depends on the other: an older dashboard ignores the new fields, and the new dashboard shows gaps on an
   older server.
2. Peaks start at the upgrade; earlier buckets stay `null`.
3. Rollback: an older server stops writing peaks and computes unique identities in its reconciler again. The peaks
   already stored expire with their collections.
