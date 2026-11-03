# Design

## Context

- **Charts:** `charts/chart-options.ts` builds every time-series option.
  - The x-axis is an ECharts `time` axis whose labels are `HH:mm`, `MM-dd HH:mm` or `MM-dd` by span, with no minimum
    interval, so a 3-minute range ticks every 20–30 s.
  - The y-axis has no minimum interval either.
  - Step series use `step: 'end'`: each value is drawn from its bucket start to the next point, so the last point has no
    segment.
- **Skeletons:** `ovd-skeleton` paints its bars at once and is removed on the first response, which flashes when the
  response takes tens of milliseconds.
- **Durations:** `formatDuration()` truncates at every unit. `ovd-duration` formats both running and stored durations
  with it.
- **About storage:** `InfoService.storageEntry()` lists each collection's indexes and dates it only when an index leads
  with `ts`, `bucket` or `createdAt`. The analytics indexes of the time fields are:
  - `rooms.createdAt`, `ingresses.createdAt`;
  - `participants { joinedAt: -1, _id: -1 }`;
  - `egresses { startedAt: -1, _id: -1 }` and `ingress_sessions { startedAt: -1, _id: -1 }`;
  - `events.ts`, `analytics_5min.bucket`, `analytics_hourly.bucket`;
  - `analytics_daily { scope, bucket }`;
  - the `track_stats` time series, indexed on its metadata before `ts`;
  - `nodes`, with no time index and one document per node;
  - `tracks` and `track_subscriptions`, with their time field only behind `participantSid`, `roomSid`, `subscriberSid`
    or `trackSid`.
- **Global search:** `exactIdTarget()` recognises `TR_` through `entityIdKind()` but drops it, because no route takes
  a track ID.
- **Browser and OS labels:** the rollups key browsers by family, and an empty browser falls into `other` until the
  writer change adds `none`. Pages that show a client's OS print the reported string (`linux` from the Go SDK, `Linux`
  from the JS SDK).

## Goals / Non-Goals

**Goals:**
- One rule per chart property, applied in `timeSeriesOption()` for every chart of every edition.
- No new inputs on the chart, the skeleton or the duration components.

**Non-Goals:**
- Changing the label formats of the axes or the retention notices.
- New indexes for tracks and subscriptions.

## Decisions

### D1. The x-axis interval follows the label unit

`minInterval` is 60 000 ms when the labels show minutes (`HH:mm`, `MM-dd HH:mm`) and 86 400 000 ms when they show days.
It comes from the same span rule as the label format.

Rejected: passing the bucket width from every chart. The labels are the constraint, and the granularity is already in
the chart note.

### D2. Integer data gets integer ticks

`yAxis.minInterval` is 1 when every non-null value of every series is an integer.

Rejected: an `integer` input on the chart, which every count chart of every edition would have to set.

### D3. A step series is extended to `to`

When the last point of a step series is not null and starts before `to`, `timeSeriesOption()` appends `[to, value]`, so
`step: 'end'` draws the last bucket up to the end of the range. A dense series always ends in the bucket that holds
`to`.

Rejected: `step: 'start'`, which would draw every value one bucket early.

### D4. The skeleton fades in after 300 ms

Every loading placeholder keeps its height from the start and carries the global class `ovd-skeleton-reveal`, whose CSS
animation keeps its opacity at 0 for 300 ms and then shows it: `ovd-skeleton`, the skeleton rows of `ovd-data-table`
and the KPI tile skeleton. Pages keep their loading logic. Under `prefers-reduced-motion` the global rule shortens the
fade and the delay stays.

Rejected:
- delaying the loading flag in every loader, which touches every page and both loaders;
- keeping the previous content, which does not exist on a first load.

### D5. Stored durations are rounded, running ones are not

`formatDuration(ms, { mode })` rounds to the smallest unit it will show by default:
- it picks the unit from the magnitude, rounds, and formats again when rounding crosses a unit (59 600 ms → 60 s →
  "1 m 00 s");
- `mode: 'floor'` keeps the current truncation;
- `ovd-duration` passes `floor` while `running` is true, both for `liveDurationMs` and for `liveTotalMs`.

Rejected: rounding live durations, which would make a counter jump to the next second halfway through.

### D6. A fixed time field per collection

`InfoService` holds one map from collection to field, and optional filter, and reads `find(filter).sort({ field: 1 })
.limit(1)` with a projection of the field. This replaces the index discovery and saves a `listIndexes` per collection.

| Collection | Field |
| --- | --- |
| `rooms`, `ingresses` | `createdAt` |
| `participants` | `joinedAt` |
| `egresses`, `ingress_sessions` | `startedAt` |
| `events` | `ts` |
| `analytics_5min`, `analytics_hourly` | `bucket` |
| `analytics_daily` | `bucket` with `{ scope: 'global' }` |
| `nodes` | `firstSeenAt` (one document per node, no index needed) |

`tracks`, `track_subscriptions` and `track_stats` have no entry, and About explains the "—". The `track_stats` query
was explained on a generated dataset: the time series has no index on its time alone, so the plan is a bounded sort
over a scan of the buckets.

Rejected:
- new `{ publishedAt }` and `{ subscribedAt }` indexes, two more indexes on the most written collections for one About
  cell;
- a sort without an index, a collection scan every 60 s.

### D7. Plain version text

`sidenav-footer.ts` renders the version in a `span`.

### D8. The room averages say why they are missing

`missingHint()` takes the reason: `roomsEnded === 0` gives "No room ended in this range", anything else "Not provided by
this server version".

### D9. Total duration tile

The Egress page tile is labelled "Total duration", with `INFO_TEXTS.egressTotalDuration`.

### D10. Browser labels and the OS label

`format/labels.ts` gains:
- `BROWSER_LABELS` for `chrome`, `firefox`, `safari`, `edge`, `none` ("No browser") and `other`, used by the browser
  donut, which today prints the key;
- `clientOsLabel(os)`, which compares the reported string, case-insensitively and trimmed, with the family names
  (`windows`, `macos`, `mac os`, `linux`, `android`, `ios`) and returns the `OS_LABELS` entry, or the string as
  reported.

The library exports both for the detail pages of every edition.

Rejected: mapping by substring as the writer does, which would turn "Chrome OS" into "Linux" on a page meant to show
what the client reported.

### D11. A locked track route

`routes.ts` adds `tracks/:trackSid`:
- with no navigation entry and `page.feature: 'participant-detail'`;
- with the breadcrumb param `trackSid`, which titles the lock, as the route has no list above it;
- opening a locked page that reuses the participant lock.

`exactIdTarget()` maps `track` to `/tracks`. An edition with the feature replaces the route by path, as it does for
the other detail routes.

## API

No shape change: `storage.<collection>.oldest` exists and only covers more collections.

## Performance budget

About reads at most eleven point queries every 60 s, with the existing cache. Each is verified in the info integration
test with `explain()`: an `IXSCAN` with one document examined, and a `COLLSCAN` only on `nodes`.

`track_stats` has no entry: its plan scans the buckets of the time series.

## Risks / Trade-offs

- [Rounding changes durations across the UI, by up to half a unit] → Unit tests of the formatter for both modes, and
  updated fixtures where a duration reads differently.
- [A running duration that ends shows one second more than it last counted] → Accepted: the stored value is the
  measured one.
- [The `none` browser key only appears in rollups written after the writer change] → Older rollups keep those sessions
  under `other`, which still reads "Other".

## Migration Plan

Ships with the 3.10 dashboard. The browser label of `none` relies on the typings of `writer-review-fixes`, applied
first.
