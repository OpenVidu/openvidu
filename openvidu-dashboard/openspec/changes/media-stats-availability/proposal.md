# Proposal

## Why

A server node whose media engine does not hand RTP statistics to the telemetry sends only the signal and data
pseudo-track stats: no `track_stats`, room and rollup bytes at 0, no quality samples and no final publish or subscribe
statistics. The dashboard cannot tell that apart from a room where nothing was sent, so it shows "↑ 0 B ↓ 0 B",
empty charts and "No stats received" as if they were measurements. The same gap leaves `rooms.lastStatsAt` unset, so
the stale cue of a room never fires and the reconciler's empty-listing guard does not see those rooms.

## What Changes

- The server tells the writer whether the node reports media statistics (true unless the server says otherwise).
- The writer publishes it on the node heartbeat (`nodes.mediaStats`) and stamps `mediaStats: false` on the rooms and
  participant sessions created on a node that does not report them, so the mark outlives the node document.
- Signal and data pseudo-track stats also advance the room's `lastStatsAt`, as the stats delta requirement already
  states for every flush.
- The rooms list returns `mediaStats: false` for those rooms, and the Rooms table shows a dash with a tooltip instead
  of "↑ 0 B ↓ 0 B".
- The analytics summary returns `mediaStats: "partial" | "none"` when some or all nodes seen in the range do not
  report media statistics. The Data up / down tile and the Bandwidth section say the data is not reported (`none`) or
  covers only some servers (`partial`).

Scope excludes the following:
- Producing media statistics on such a node (a server concern).
- Views outside the rooms list and the Analytics page: they read the same marks, through the seam the Analytics page
  exposes to its extension cards (`AnalyticsPageContext.mediaStats`) and the entity documents.
- Backfilling the mark on documents written before the change.

Edition: CE and PRO (writer and the CE views every edition shows). Repositories: openvidu-livekit
(`openvidu/analytics`, `openvidu/openviduconfig`, `openvidu/openvidu.go`) and the dashboard (typings, backend, frontend,
data generator, specs).

CHANGELOG lines: none. The v2 data model, its writer and these views have not shipped in a release, and a CE server
always reports media statistics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: the node heartbeat carries `mediaStats`, rooms and sessions of such a node are stamped,
  and pseudo-track stats advance the room's `lastStatsAt`.
- `data-model`: `mediaStats` on `nodes`, `rooms` and `participants`.
- `rooms-api`: the room list item carries `mediaStats: false`.
- `rooms-ui`: the Data up / down cell of such a room reads as not reported.
- `analytics-api`: the summary carries the media statistics coverage of its range and scope.
- `analytics-ui`: the Data up / down tile and the Bandwidth section follow that coverage.

## Impact

- Writer: a `MediaStats` setting on `openviduconfig`, passed through `analytics.Node` to the heartbeat and to the
  projection options; room and participant projections; the stats projection; the contract schemas of `nodes`,
  `rooms` and `participants`. Unit and integration tests in `openvidu/analytics`.
- Dashboard: typings and their schema mirror, rooms mapper, analytics summary (one `nodes` query per summary), Rooms
  table and Analytics page, the data generator (an option for nodes without media statistics), unit and e2e tests.
- No schema version bump: the v2 schema has not shipped.
