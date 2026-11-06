# Design

## Context

- **Writer increments:**
  - `projection.Increment{Collection, Scope, Bucket, Counters, Members, Sizes}` describes one rollup update.
  - Increments of the same document in a batch are merged. `store.ApplyIncrements` renders each one with
    `projection.RenderIncrement` into an upsert keyed by `scope:bucket`.
  - Events, stats (`statsIncrements`) and reconciler closures (`RoomEndedIncrements`, closure states) all go through
    this path. The projector knows whether its server reports media statistics (`Options.WithoutMediaStats`), and
    closure states read the closed entity's document.
- **Coverage today:**
  - `AnalyticsRepository.nodesInRange` reads `nodes` documents whose heartbeat span overlaps the range.
  - `mediaStatsCoverage` folds their `mediaStats`.
  - `nodes` expire 30 days after their last heartbeat, while the summary reads `analytics_hourly` up to 90 days and
    `analytics_daily` beyond.
- **UI:**
  - `ROOM_MEDIA_STATS_NOT_REPORTED` and `RANGE_MEDIA_STATS` (`format/labels.ts`) are the CE texts.
  - The Rooms list renders "—" with a tooltip; Analytics swaps the bandwidth content for an `ovd-notice`.
  - PRO keeps its own `MEDIA_STATS_NOT_REPORTED` texts.
  - Info tips already give tiles, chart headings, Analytics cards and column headers an icon button with tooltip
    behaviour (`ui-building-blocks` "Info tips").

## Goals / Non-Goals

**Goals:**
- Coverage that stays right for as long as the rollups it describes.
- One reusable warning, and one unavailable state, that every edition places through definitions, not templates.

**Non-Goals:**
- Marking idle buckets, or deriving coverage from bytes.
- Changing what the API returns for bytes and quality of servers without media statistics: they stay as stored.

## Decisions

### D1. Marks in the rollups, read by aggregation

Each update of a rollup document adds `$max: { "mediaStats.reported": true }` or `$max: { "mediaStats.missing": true }`
to the same upsert, so the marks cost no extra write. `Increment` gains `Reported` and `Missing` booleans; merging two
increments ORs them, and `RenderIncrement` emits the `$max` for each true one.

Coverage is one aggregation on the collection and snapped range the summary already reads:
`$match { scope, bucket: { $gte, $lt } }` (index `scope_bucket`), then
`$group { _id: null, reported: { $max: "$mediaStats.reported" }, missing: { $max: "$mediaStats.missing" } }`. It runs
in parallel with the summary's counters.

Rejected:
- **Keep `nodes` and dim only when the range has no bytes.** No writer change, but the warning still disappears for
  ranges older than the node retention, and "no bytes" cannot tell mediasoup from an idle range.
- **Mark buckets from the heartbeat.** It would create rollup documents for idle buckets, which the empty states and
  `/analytics/scopes` treat as data.
- **Counters (`mediaStats.reportedRooms`, …).** Nothing needs a proportion. Booleans keep the documents small.

### D2. The mark of a closure is the entity's

The reconciler runs on any live server, often one with a different engine than the dead one. Closure states already
carry the fields read from the room or session document; they add its `mediaStats`, and the closure increments use it.
`RoomEndedIncrements` takes the mark like it takes `mediaNode`.

### D3. Unmarked documents count as reported

Rollups written before this change, including those of the legacy migration, have no `mediaStats`. Treating them as
reported keeps today's behaviour for old ranges: no warning. The schema version stays 1, since the contract is still
unreleased.

### D4. Building blocks driven by definitions

- `ovd-kpi-tile`: `warning?: string` and `unavailable?: boolean`.
- `ovd-time-series-chart`: `warning?: string` and `unavailable?: boolean`. Unavailable keeps the x-axis over
  `from`/`to`, draws the series dimmed over a hatched band, and turns off the legend, the tooltip and "Show table".
- `ovd-analytics-card`: `warning?: string` beside its info tip.
- `TableColumn`: `warning?: string`, rendered in the header and in the card label, and `warningWhen?: (row) =>
  boolean`, the rows it applies to: the card layout shows it beside the label of those rows only, so a list where
  only some rooms lack the data does not repeat it on every card. Pages render an unavailable cell with the shared
  `ovd-unavailable` element.
- A new `ovd-media-stats-warning` holds the icon button. It reuses the info tip's tooltip directive, so hover, focus,
  tap and Escape behave the same.

The value or plot takes `opacity: 0.38` with `filter: grayscale(1)`, the Material 3 disabled content treatment. The
rest of the tile or chart (label or heading, note, info tip) dims too, to 75 % of its colour, which keeps the text
contrast above the WCAG 4.5:1 minimum that the axe checks of the e2e suite enforce. The warning icon keeps full
strength to say why the data is missing.

### D5. One set of texts in CE

`MEDIA_STATS_TEXTS` (`entity`, `rangeNone`, `rangePartial`, `column`) replaces `ROOM_MEDIA_STATS_NOT_REPORTED` and
`RANGE_MEDIA_STATS` and is exported for PRO, which drops its own `MEDIA_STATS_NOT_REPORTED`. The texts name mediasoup
and Pion. Both are documented RTC engines of OpenVidu, so the public package can name them.

## Data model

- `analytics_5min`, `analytics_hourly`, `analytics_daily`: optional `mediaStats: { reported?: true, missing?: true }`.
  The validators allow only those two keys, as booleans.
- No new index: the coverage aggregation uses `scope_bucket`.
- No retention change.

## API

`GET /api/v1/analytics/summary` keeps `mediaStats?: "partial" | "none"`. Only its source changes; the OpenAPI shape is
unchanged.

## Performance budget

- **Writer:** no extra round trip. Each rollup update grows by one `$max` field.
- **Summary:** one more aggregation over the same index range the counters read, in parallel. A 400-day hourly range
  reads at most 9 600 documents per scope.
- **Verification:**
  - the analytics query plan suite explains the coverage aggregation at scenario M (`IXSCAN` on `scope_bucket`, no
    more documents examined than the summary);
  - the summary p95 test keeps its budget.

## Risks / Trade-offs

- [A range whose only buckets have no writes shows no warning] → Those buckets have no data either. Charts show
  zeros, as for any idle period.
- [A server misreports its engine] → The mark comes from the same flag that stamps `mediaStats` on rooms, so entity
  and range warnings stay consistent.
- [Editions that import the old texts break] → `MEDIA_STATS_TEXTS` is the one export from this release on; the old
  names are removed, not deprecated, since none has shipped.

## Migration Plan

1. Writer first: the marks appear on new buckets.
2. Then the dashboard: coverage reads the marks; old buckets count as reported.

Rolling back the dashboard restores the `nodes` lookup; older dashboards ignore the marks.
