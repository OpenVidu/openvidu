# Proposal

## Why

Servers running the mediasoup RTC engine generate no media statistics, so their rooms have no data transferred,
bitrate or quality. Today the dashboard hides what it cannot fill: a room's Data up / down cell reads "—", and the
Analytics bandwidth section is replaced by a notice. Owners asked for the opposite: keep every tile and chart in place,
mark the missing data with a warning icon that explains it, and dim only what has no real data at all.

Dimming exposes a flaw in how Analytics decides coverage. It reads the `nodes` documents seen in the range, but those
live 30 days (`entities` retention once `media-node-inventory` lands) while hourly rollups live 400 days and daily ones
forever. For a long range, the servers that did report media statistics may already be gone, so the range reads as
"none" and its real data would be dimmed. The rollups must record their own coverage.

## What Changes

- **Coverage in the rollups:**
  - Every write of a rollup bucket marks it with the media statistics of the server that wrote it:
    - `mediaStats.reported: true` from a server that reports them;
    - `mediaStats.missing: true` from one that does not.
    - It applies to `analytics_5min`, `analytics_hourly` and `analytics_daily`, in both the `global` and the node scope.
  - The reconciler marks with the room's own `mediaStats`, not with the server that runs it.
- **Coverage from the rollups:** the Analytics summary computes `mediaStats` (`none` | `partial`) from the marks of the
  rollup documents of its scope and range. It stops reading `nodes`. Buckets without a mark count as reported.
- **Warning building blocks:**
  - A media statistics warning: a warning icon that shows its text like an info tip. It goes on KPI tiles, chart
    headings, Analytics card headings and data table column headers.
  - An unavailable state for KPI tiles and time-series charts:
    - tiles read "—" dimmed;
    - charts keep their axes over the range, with a dimmed, hatched plot and no legend or "Show table".
- **One set of texts for every edition.** They name mediasoup and Pion:
  - entity: "This data is not available when using mediasoup as RTC engine. It will be available soon."
  - range `none`: "The servers of this range use mediasoup as RTC engine, which does not generate media statistics
    yet. This data will be available soon."
  - range `partial`: "This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate
    media statistics yet. They will be available soon."
  - column: "Rooms on servers using mediasoup as RTC engine show no value here yet. This data will be available soon."
- **CE pages:**
  - Rooms list: a room with `mediaStats: false` shows an unavailable "—" in Data up / down. The column header carries
    the warning while any row on the page has that mark.
  - Analytics, Data up / down tile and Data transferred section:
    - `none`: the warning, an unavailable tile, and the section's tiles and chart kept but unavailable. The notice that
      replaced them is gone.
    - `partial`: the warning only, with the values as they are.
- **Data generator:** the generated rollups carry the marks of their nodes, so `--nodes-without-media-stats` produces
  `none` and `partial` ranges.

Scope excludes the following:
- The pages of other editions (room, participant and track details, extra Analytics cards), which adopt the
  building blocks on their own.
- Media statistics for mediasoup itself.
- Marking buckets that receive no write. A bucket with no document has no data to dim or warn about.
- Backfilling marks on rollups written before the change, including the legacy migration's.

Edition: CE and PRO. The writer behaviour and the building blocks apply to every edition; the texts are shared.
Repositories:
- openvidu-livekit: `openvidu/analytics` (projection, store, schema contract);
- the dashboard: typings and contract, backend, frontend, data generator, specs.

CHANGELOG lines:
- `CHANGELOG.md`: "Data that servers running mediasoup do not generate shows a warning icon that explains why. Its
  tiles and charts stay in place, dimmed when the range or entity has no media statistics at all."
- `CHANGELOG-openvidu.md` (openvidu-livekit): "The analytics rollups record whether the servers that wrote them report
  media statistics."

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: adds the media statistics marks of rollup buckets.
- `data-model`: the rollup documents gain `mediaStats.reported` and `mediaStats.missing`, and generated rollups carry
  them.
- `analytics-api`: media statistics coverage comes from the rollup marks.
- `analytics-ui`: warnings and the unavailable state replace the coverage notices.
- `rooms-ui`: the Data up / down cell and header of rooms without media statistics.
- `ui-building-blocks`: the media statistics warning, the unavailable tile and chart, and the shared texts.

## Impact

- openvidu-livekit:
  - `projection` (rollup increments carry the mark, closures take the room's);
  - `store` (`$max` on the mark);
  - `schema/contract` (vendored).
- Typings:
  - `RollupBase.mediaStats?`;
  - the contract schemas and fixtures of the three rollup collections.
- Backend: `analytics-repository.ts` (coverage aggregation on `scope_bucket`), `analytics-service.ts`.
- Frontend:
  - `ovd-kpi-tile`, `ovd-time-series-chart`, `ovd-analytics-card`, the data table column definition;
  - a new warning component;
  - `format/labels.ts` (`MEDIA_STATS_TEXTS` replaces `ROOM_MEDIA_STATS_NOT_REPORTED` and `RANGE_MEDIA_STATS`);
  - the Rooms and Analytics pages.
- Editions that import the old texts switch to `MEDIA_STATS_TEXTS` and the building blocks.
