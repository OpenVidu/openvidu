# Design

## Context

See proposal.md for the motivation. Current state:

- **Server aggregator** (`openvidu/analytics/aggregator.go`):
  - Every minute it counts the active rooms (hint `status_lastEventAt_active`) and the active STANDARD sessions (hint
    `status_kind`), grouped by `mediaNode`.
  - It writes them with `projection.PeakIncrements(scope, at, rooms, participants)` into the three rollup
    collections, for the global scope and for every label of an active entity or a live labelled node.
- **Egress and ingress counters:** the writer counts them (`egress.started`, `byType`, `endedByStatus`, `durationMs`,
  the 5-minute `egress.started` and `egress.ended`, `ingress.sessionsStarted`, `sessionsEnded`, `byInputType`,
  `durationMs`) through `periodIncrements` and `fiveMinuteIncrements`. Those write both into the global scope and into
  the node scope of the server that writes the event (`p.opts.MediaNode`). That server is not necessarily the media
  node running the egress or ingress, and no event says which node does.
- **Existing indexes:** `egresses.status_startedAt` (`status`, `startedAt`) and `ingress_sessions.status`.
- **What is open:**
  - The egress summary and the egress list call `starting`, `active` and `ending` "active".
  - The reconciler treats ingress sessions with status `buffering` or `publishing` as open.
- **Hourly-only metrics:** the 5-minute rollups hold only what the default 24 h view draws: bytes, quality, the
  connected gauge and the lifecycle counters (decision D13 of `analytics`, 2026-10-14). Every ingress counter, the
  egress end statuses and durations, participant minutes, tracks and API calls are hourly-only. The page requests
  them at `max(effective, 1h)` with the note "Hourly".
- **Unique identities:** they exist only per UTC day (`analytics_daily`), set by the aggregator once the day has
  closed. The API serves them only with `granularity=1d`, and the page today shows them only at `1d`, with a hint
  otherwise.
- **Analytics page:**
  - The Rooms and Participants peaks are drawn as `step` charts.
  - Most single series use the entities `rooms` or `sessions`, both in palette slot 1.
  - Card grids use `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`. The PRO Diagnostics card has its own copy of
    that grid, and the PRO Quality card stacks its two charts.
- **Unavailable rendering:** `ovd-kpi-tile` and `ovd-time-series-chart` already have an `unavailable` rendering
  (dimmed "—", plot over hatching), used for the data that a mediasoup node does not report. The breakdown chart has
  none.
- **KPI tile rows:** `ovd-tile-row` already lays tiles out in balanced rows with `balancedColumns(count, width,
  minWidth, gap)`, measured before first paint.
- **Step charts:** the PRO room page also draws a `step` chart, so the `step` kind stays.

## Goals / Non-Goals

**Goals:**
- One layout and colour rule across the four entity sections, so each card reads the same way.
- Egress and ingress peaks with the same semantics and gaps as the room and participant peaks.
- No node-scope figure for egress or ingress until their node is known.
- A grid component that CE and PRO cards share, instead of copies of a CSS rule.

**Non-Goals:**
- Changing which events count as an egress or ingress start.
- Knowing the media node that runs an egress or ingress session.
- Peaks of other entities (tracks, agents) or of other kinds of participant.
- 5-minute ingress or any other change to the hourly-only set.
- A layout preference per user, such as toggles or collapsible charts.
- Changing the colours of the other charts of the page, apart from the slots below.

## Decisions

### Peak and volume side by side, not a toggle or two axes

The owner chose the pair. The peak is a level and the volume is a flow:
- the volume grows with the bucket size and the peak does not;
- two y-axes make their crossings look meaningful when they are not.

A toggle keeps the chart count, but it hides half of each section behind a click and leaves the export out of step
with what is on screen. The pair costs four charts more in CE: from 15 (with unique identities, now always shown) to
19. Because every section follows the same order, they read quickly.

### Areas for peaks, bars for volume, lines for rates

- An area reads as load (how full the platform is), stays smooth with 6-hour and daily buckets, and does not look
  like the bars beside it.
- Bars match the volume per bucket: one bar per bucket is exactly what is counted.
- Rates (Connection success) stay lines.

Rejected alternatives:
- Bars for the peak: they look identical to the volume beside them.
- A plain line: it carries little weight next to the bars.
- The step chart: it is what the owner rejected.

The time-series chart already has `kind: 'area'`, so no new chart kind is needed.

### Volume is the start count only

The volume charts are:
- Rooms created (`roomsCreated`);
- Participant sessions (`participantsJoined`);
- Egress started (`egressStarted`);
- Ingress sessions (`ingressSessions`).

Ended counts are left out: over a bucket they mirror the starts, and the peak already shows what is open. Egress
endings keep their own chart, by status. Aborted participant sessions stay inside Connection success.

### What counts as active

- **Egress:** status `starting`, `active` or `ending`, the egress summary's `active`.
- **Ingress sessions:** status `buffering` or `publishing`, what the reconciler treats as open.

The same definitions as the rest of the product mean the Overview, the lists and the peaks agree. Entities that are
lost but not closed yet count until the reconciler closes them, as rooms and sessions already do.

### Ingress peaks are hourly-only

`ingress.peakActive` goes into the hourly and daily rollups only, and `ingressPeakActive` is hourly-only. Both
charts of the Ingress pair stay on the same bucket size and the same "Hourly" note.

The owner kept D13. Adding `ingress` to the 5-minute documents was rejected: it changes the writer, the contract,
the legacy migration and the generator for the lowest-volume entity of the page, whose 5-minute bars would be mostly
0 or 1. Moving every hourly-only metric to 5 minutes was also rejected, for larger documents.

### Egress and ingress stay in the global scope

No event says which media node runs an egress or an ingress session. The server that writes their events is only
the one that received them. So:

- **Writer:**
  - The egress and ingress rollup counters go through global-only increments, in the 5-minute, hourly and daily
    collections.
  - Neither `egresses` nor `ingress_sessions` gets a media node field.
  - Rooms and participant sessions keep theirs.
- **Aggregator:** it counts egresses and ingress sessions as totals, not grouped, and writes their peaks into the
  global documents only.
- **API:** with a `node:<label>` scope, it rejects the egress and ingress metrics (`egressStarted`, `egressEnded`,
  `egressDurationMs`, `egressPeakActive`, `ingressSessions`, `ingressDurationMs`, `ingressPeakActive`) and dimensions
  (`egressType`, `egressStatus`, `ingressInputType`):
  - The response is `400 VALIDATION_ERROR` with the message "<item> is only available for the global scope".
  - The check runs after the PRO gate, so CE still answers `403` for any node scope.
  - The summary of a node scope leaves out `egressStarted`, `egressDurationMs`, `ingressSessions` and
    `ingressDurationMs`. That follows its existing rule of omitting what it cannot derive.
  - The catalogue marks those metrics and dimensions `globalOnly`. The validation of the series, breakdowns and
    export endpoints reads that mark.
- **Participant kind:** in a node scope it keeps its EGRESS and INGRESS slices. Those are participants of the rooms
  that node hosts, attributed like every participant.

Rejected alternatives:
- Stamping the writing server's label on egresses and ingress sessions. The owner rejected it because the node figure
  would be wrong whenever another node runs them.
- The room's media node, through a `$lookup`. An egress may run on another node, and a web egress may have no room.
- Answering an empty series in a node scope. It would read as "no egress on this node" instead of "not known".

Counters that a development database already holds in node scopes stay until their rollups expire, and the API never
reads them. 3.10 is not released, so no production database has them.

### Unavailable in a node scope, not hidden

In a node scope, the Egress and Ingress KPI tiles and sections keep their places and render unavailable, as the
data a mediasoup node does not report does:
- tiles read a dimmed "—";
- time-series charts and breakdowns are drawn over hatching;
- the card heading and the tiles carry the warning "Egress and ingress are not attributed to media nodes. Select All
  nodes in Scope to see them.";
- Export CSV is disabled.

The plan of the page leaves the egress and ingress metrics and dimensions out of every request in a node scope.
Keeping the cards means the page does not reflow when the scope changes, and the warning says why the data is
missing and how to see it.

The breakdown chart gains an `unavailable` input:
- an empty ring for a donut, or an empty plot for a bar, over the same hatching;
- dimmed like the time-series chart;
- no slices, labels, legend, tooltip or table toggle.

### Unique identities at every granularity

The chart is the fifth chart of the Participants grid at every page granularity. The plan requests
`uniqueIdentities` in a request of its own with `granularity=1d`, as it already requests hourly-only metrics at
`1h`. Its points are per UTC day (`basis: "utcDay"`) and the chart keeps `tz="UTC"` and the note "per UTC day".

- A 24 h range spans one or two UTC days. The current day is a gap until the aggregator sets its value after the day
  closes.
- The "Switch to 1 d" hint goes.
- The CSV of the Participants card includes `uniqueIdentities` only when the card exports at `1d`. One file has one
  granularity, and the chart's own "Show table" covers the rest.

Rejected: keeping the hint. It was the only chart that disappeared with the granularity, unlike the hourly-only
charts.

### Section colours from fixed entity slots

| Entity or key | Slot | Light / dark |
| --- | --- | --- |
| `rooms` (Rooms series) | 1 | teal |
| `participants` (Participants series, Unique identities), kind `STANDARD` | 7 | violet |
| `egress` (Egress series), kind `EGRESS`, type `room_composite` | 2 | orange |
| `ingress` (Ingress series), kind `INGRESS`, input type `rtmp` | 6 | blue |
| `success` (Connection success) | 3 | green |
| kind `AGENT` | 5 | pink |
| type `track_composite` | 1 | teal |

Unchanged:
- egress types `track` (3), `web` (4) and `participant` (5);
- input types `whip` (2) and `url` (3);
- egress statuses (complete 3, aborted 4, limit reached 7, failed 8);
- directions (up 1, down 2);
- the client breakdown keys.

`SERIES_LABELS` gives each Analytics metric its section entity instead of `sessions`. The PRO quality series keep
slot 1 through an explicit `quality` entity: it is the brand colour for overall health, and on the page it sits far
from Rooms.

Each kind has its own slot within its chart:
- Participant kind: 7, 2, 6, 5.
- Egress type: 2, 1, 3, 4, 5.
- Input type: 6, 2, 3.

Rejected alternatives:
- Rotating colours per chart in page order: it ties colour to rank, which the palette rule forbids, and the colours
  would shift when a PRO card loads.
- Tints of the primary colour: they keep the monotony the owner pointed out.

### A balanced chart grid component

`ovd-chart-grid` (exported from the UI library) projects its charts and computes the columns with the tile row's
`balancedColumns(count, width, 420, 16)`, which gives the fewest rows spread evenly.

- **Layout:**
  - The charts sit in a flex-wrap row, each with a basis of `(100% − (columns − 1) × 16px) / columns` and
    `flex-grow: 1`.
  - So a shorter last row shares its width: three charts at two columns give 2, then 1 spanning the row.
- **Measuring:**
  - It measures itself after its first render and before paint, like `ovd-tile-row`.
  - A `ResizeObserver` follows width changes, and a content query follows charts that come and go.
- **Users:**
  - CE: Rooms (2), Participants (5), Client breakdowns (4), Egress (4) and Ingress (3).
  - PRO: Quality and Diagnostics.
  - Data transferred keeps its single chart.

Rejected: CSS container queries with `:has()` that count children. They cannot express "fewest rows, spread evenly"
for every count without one rule per count and width, and they would repeat a rule the tile row already tests.

### Fitted percentage axis

The time-series chart gains a `fitted` input, used with `format="percent"`:
- the y-axis minimum is the highest multiple of 10 % at least 5 points below the lowest value, never below 0 %;
- the maximum is 100 %;
- without values, it stays at 0–100 %.

Rejected: ECharts' `scale: true`. It starts the axis at arbitrary values such as 96.5 % and moves it with each
refresh.

### Exports follow the charts

Each entity card exports its pair plus its other series, using the existing rule: a card holding an hourly-only
metric exports at its hourly granularity.
- **Rooms:** `roomsPeakActive`, `roomsCreated`.
- **Participants:** `participantsPeakActive`, `participantsJoined`, `connectionSuccessRate`, plus `uniqueIdentities`
  at `1d`.
- **Egress:** `egressPeakActive`, `egressStarted`, `egressEnded`, at `1h` below an hour.
- **Ingress:** `ingressPeakActive`, `ingressSessions`, at `1h` below an hour.

In a node scope the Egress and Ingress exports are disabled.

## Data model

- **Rollup fields** (int32, optional, written by the aggregator into `global` documents only):
  - `egress.peakActive` in `analytics_5min`, `analytics_hourly` and `analytics_daily`;
  - `ingress.peakActive` in `analytics_hourly` and `analytics_daily`.
- **Node scopes:**
  - `node:<label>` documents no longer get `egress` or `ingress` parts.
  - The contract keeps those parts in the shared rollup schema, so old documents stay valid.
- **Entity documents:** unchanged. No media node on `egresses` or `ingress_sessions`.
- **Indexes:** none new.
  - The counts use `egresses.status_startedAt` and `ingress_sessions.status`.
  - The rollup reads use `{ scope, bucket }`.
- **Retention:** unchanged.
- **Schema version:** no change.
  - The fields are additive and optional, and the validators gain them from the contract.
  - A dashboard reading an older writer shows gaps, and an older dashboard ignores the fields.
  - An older writer that still writes node-scope egress counters during a rolling upgrade is harmless: the API does
    not read them.
- **Legacy migration:** no change. It already writes global rollups only, since legacy data has no media node label.
- **Volume:** two more int fields in global documents the aggregator already writes every minute. Node documents
  lose their egress and ingress parts.

## API

- **Series and export:**
  - `GET /api/v1/analytics/series` and `GET /api/v1/analytics/export.csv?kind=series` accept `egressPeakActive` and
    `ingressPeakActive` in `metrics`.
  - Their points are `number | null`, and the CSV writes `null` as an empty cell.
  - `ingressPeakActive` below `1h` answers `400 VALIDATION_ERROR`, like the other hourly-only metrics.
- **Node scope:**
  - Series, breakdowns and both CSV kinds answer `400 VALIDATION_ERROR` for the global-only metrics and dimensions.
    `details.issues` points at `metrics` or `dimensions`.
  - The summary omits the four egress and ingress values. Its OpenAPI already marks them optional.
- **Typings:**
  - `AnalyticsMetric` gains both peaks.
  - `ANALYTICS_METRIC_INFO`: `egressPeakActive: { unit: 'count', empty: null }` and
    `ingressPeakActive: { unit: 'count', empty: null, hourlyOnly: true }`.
  - `ANALYTICS_CE_METRICS` grows to 22.
  - The metric info gains `globalOnly: true` for the egress and ingress metrics, and the dimension list marks
    `egressType`, `egressStatus` and `ingressInputType`. The page plan uses both marks.
- **Catalogue:** `egressPeakActive: peak('egress.peakActive')` and `ingressPeakActive: peak('ingress.peakActive')`.
  Both are maximum-combined through `maximumPaths`.
- **OpenAPI:** the `metrics` enum of both operations gains the two values, and their descriptions say which items are
  global-only.
- **Index:** the same bounded `{ scope, bucket }` scan. The query plan suite adds `egressPeakActive` at `5m` and
  `ingressPeakActive` at `1h`.

## Writer

- **Store:**
  - `ActiveEgress(ctx)` counts `egresses` with `{ status: { $in: [starting, active, ending] } }`, hint
    `status_startedAt`.
  - `ActiveIngressSessions(ctx)` counts `ingress_sessions` with `{ status: { $in: [buffering, publishing] } }`, hint
    `status`.
  - Both are count-only, since no node grouping is needed.
- **Aggregator:**
  - `samplePeaks` runs the four counts.
  - The node labels still come from the room and participant counts and the live nodes.
  - `projection.PeakIncrements` takes a `Peaks{Rooms, Participants, Egress, Ingress}`:
    - the global increments carry all four, with the ingress maximum only in the hourly and daily increments;
    - node increments carry rooms and participants only.
  - A failed count fails the run, as now.
- **Projection:** the egress and ingress cases of `rollups()` use new global-only variants of `counters` and
  `fiveMinute`. Their tests assert that no `node:` increment carries an `egress` or `ingress` path.
- **Structs:** `PeakActive *int32` in `RollupEgress`, `FiveMinuteEgress` and `RollupIngress`.

## Frontend

- **Page template:**
  - Every entity card holds its tiles, then one `ovd-chart-grid` with the pair first.
  - Rooms: Active rooms (area), Rooms created (bar).
  - Participants: Active participants (area), Participant sessions (bar), Connection success (line, `fitted`),
    Participant kind, Unique identities (bar, UTC).
  - Egress: Active egress (area), Egress started (bar), Egress ended by status (stacked bar), Egress type.
  - Ingress: Active ingress (area), Ingress sessions (bar), Ingress input type.
  - Client breakdowns move to the grid unchanged.
- **Node scope:**
  - `egressIngressUnavailable = scope() !== 'global'`.
  - The plan drops the global-only metrics and dimensions.
  - The Egress and Ingress cards render their content with `unavailable` tiles and charts, `[warning]` set to the
    shared text, and `exportable` off.
  - The top Egress and Ingress tiles become `unavailable` with the same warning.
  - The cards skip their empty state while unavailable.
- **Card states:**
  - The Rooms card uses `view(['roomsPeakActive', 'roomsCreated'])`. The summary special case of `roomsView()` goes.
  - Egress and Ingress add their peaks to `view()`.
- **Page data:**
  - `PAGE_METRICS` adds `roomsCreated`, `participantsJoined`, `egressPeakActive` and `ingressPeakActive`.
  - The plan groups `ingressPeakActive` with the hourly-only metrics, and sends `uniqueIdentities` in its own `1d`
    request whatever the effective granularity.
  - `SERIES_LABELS` gets the new labels and section entities: Rooms created, Participant sessions, Active egress,
    Active ingress.
  - `charts()` gets the new series.
- **Chart options:**
  - `ENTITY_SLOTS` follows the colour table.
  - `TimeSeriesOptions` gains `fitted`, turned into a `yAxis.min` from the series.
- **Breakdown chart:** `unavailable` input, rendering as decided above.
- **Texts:**
  - Info texts: `activeEgressChart` and `activeIngressChart`. The Participant sessions chart reuses
    `participantSessions`.
  - The node-scope warning text lives in the shared texts module beside the media statistics texts.
- **PRO:**
  - The Diagnostics card replaces its local grid with `ovd-chart-grid`.
  - The Quality card wraps its two charts in it.
  - The node-scope e2e expects no egress or ingress item in the node-scope requests, and the Egress card's warning.

## Data generator

- **Peaks:** the per-minute sweep gains two global span maps:
  - egresses active from `startedAt` to `endedAt` (or open);
  - ingress sessions active from `startedAt` to `endedAt` (or open).
  Their peaks are written into the global documents: `egress.peakActive` in the three collections and
  `ingress.peakActive` in hourly and daily only.
- **Node scopes:**
  - The node scopes of `--node-rollups` get no `egress` or `ingress` counters.
  - Their room and participant counters and peaks are unchanged.
- **Sample-only documents:** global ones carry the four peaks (no ingress at 5 minutes), and node ones carry rooms
  and participants.

## Performance budget

- **Aggregator run:**
  - **Budget:** 200 ms at p95, unchanged, now with 2 000 active rooms, 20 000 active STANDARD sessions, 500 open
    egresses and 200 publishing ingress sessions, among 50 000 closed egresses and 20 000 closed ingress sessions.
  - **Verification:** the `TestAggregatorPerformanceBudget` case of `bench_integration_test.go`, and an integration
    test asserting with `explain()` that the two new counts use `status_startedAt` and `status` with no `COLLSCAN`.
- **Writes:** unchanged, three unordered bulk writes per run. The global upserts carry two more fields.
- **Dashboard:**
  - No new query, and the same keys examined. `analytics-query-plan` covers the new metrics.
  - The node-scope rejection runs before any query.
- **Frontend:**
  - Four more charts render on the page, within the existing lazy chart loading.
  - The grid lays out once per width change. A `ResizeObserver` callback costs one `balancedColumns` call per grid.

## Risks / Trade-offs

- [A node scope loses the egress and ingress figures it showed before] → Intended: they were attributed to the
  server that wrote the event, not to the node that ran the egress. The warning says where to see them.
- [Lost egresses and ingress sessions inflate the peak until the reconciler closes them] → The same value the
  Overview and the lists show live. The reconciler closes them two cleanup intervals after their room.
- [Participant kinds, egress types and input types change colour on every page that draws them] → The colours
  follow the entity, as the palette rule requires. The change lands in 3.10 with the rest of the Analytics redesign,
  before any release that shows them.
- [The Unique identities chart of a 24 h range shows one or two days, today empty] → Accepted for a uniform card. The
  note says "per UTC day", and the tile hint already says the value comes once a UTC day has closed.
- [Four more charts lengthen the page] → Each card stays at two rows on common screens, and the pair order is the
  same in every section.
- [Short egresses between two samples are missed] → Accepted, as for rooms: the charts are explained as sampled
  every minute.

## Migration Plan

1. Release the server (aggregator counts, global-only egress and ingress rollups) and the dashboard together in
   3.10. Neither requires the other:
   - a new dashboard on an older server shows the egress and ingress peaks as gaps, and never reads node-scope egress
     data;
   - an older dashboard ignores the new fields, and its node scopes show no egress or ingress once the new server
     writes.
2. Egress and ingress peaks start at the upgrade. Earlier buckets read `null`.
3. Rollback: an older server stops writing these peaks and writes node-scope egress and ingress counters again. The
   new dashboard does not read them, and the stored peaks expire with their collections.
