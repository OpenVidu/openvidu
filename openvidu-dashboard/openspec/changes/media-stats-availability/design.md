# Design

## Context

- Telemetry stats reach the writer from two sources: per-track media stats, built from the RTP buffers of the server's
  media path, and the signal (`TR_SG…`) and data (`TR_DT…`) pseudo-tracks, built from WebSocket and data channel byte
  counters. A media engine that does not move RTP through those buffers produces only the second kind.
- `projection/stats.go` adds every stat to the participant (bytes, `lastStatsAt`) and skips pseudo-tracks before the
  room delta, so the room gets `lastStatsAt`, bytes and quality only from media stats.
- `nodes` documents are written by `store.Heartbeat` on every batch tick and expire 30 days after `lastSeenAt`. Node ids
  are generated per process, so a restarted node writes a new document and the old one expires on its own.
- Rooms take `nodeId` from `ROOM_CREATED` (and from the first event of any kind while it is unknown); participant
  sessions take it from their first event. Entities are kept for `retention.entities` (90 days by default).
- `analytics.Node{ID, Region}` is built in `openvidu/openvidu.go`; the projection options in `analytics.go`. A server
  edition adjusts analytics defaults through `openviduconfig` package variables before the analytics start
  (`DefaultStatsDetail`).

## Goals / Non-Goals

**Goals:**
- Every view that shows bytes or quality can tell "not reported" apart from "zero", for the whole entity retention.
- The CE code and specs stay engine-agnostic: the server states a capability, not an engine name.

**Non-Goals:**
- Hiding views or features: only the values and charts that depend on media statistics change.
- Marking track or subscription documents: views reach them through their participant.

## Decisions

### D1. A capability flag set by the server

`openviduconfig.MediaStats` (default `true`) says whether this server's media engine reports media statistics. A server
whose engine does not sets it to `false` before the analytics start, like `DefaultStatsDetail`. `openvidu.Start` passes
it as `analytics.Node.MediaStats`. There is no configuration key: the value is a fact of the build and the engine, not
an operator choice.

Rejected: the engine name in the data (`rtcEngine: "…"`). It ties the CE contract to an edition's engines and must be
reinterpreted when an engine gains statistics; the capability flips by itself.

### D2. Mark both the node and the entities

The heartbeat `$set`s `mediaStats` (true or false) on every tick. Rooms and participant sessions created by a node with
`MediaStats: false` get `mediaStats: false`; others get no field. Views of rooms and sessions read the entity, so the
mark lives as long as the entity; analytics read the nodes, since rollups have no per-engine dimension.

Rejected: nodes only, with the dashboard joining `nodeId`. Node documents expire 30 days after their last heartbeat and
every restart creates a new node id, so rooms between 30 and 90 days old would fall back to "0 B".
Rejected: entities only. A range or scope of the Analytics page has no entity to read the mark from.

### D3. Only `false` is stored on entities

Absent means "reports media statistics", which is also what every document written before the change says. No
backfill, no extra bytes on the common case, and the API omits the property unless it is `false`.

### D4. The mark follows `nodeId`

The mark is computed where `nodeId` is: `ROOM_CREATED` sets `nodeId` and sets `mediaStats: false` or removes it
(`$$REMOVE`); the touch of other events sets `mediaStats` only when the document has no `nodeId` yet, in the same stage,
so the first writer of the room decides until `ROOM_CREATED` arrives. Participants follow their own `nodeId` rule. The
legacy migration replays with `MediaStats: true`: the engine of legacy nodes is unknown.

### D5. Pseudo-track stats advance the room's `lastStatsAt`

A pseudo-track stat creates the room delta with `statsAt` and zero bytes and quality, exactly as a media stat of zero
bytes would. Every connected participant flushes signal stats every 30 s, so the room's `lastStatsAt` becomes a
liveness signal under any engine: the room stale flag, the stale hints of the overview and the reconciler's
empty-listing guard (`Untrusted live listing`) cover these rooms. With media stats nothing changes, since the room
already gets the same flush time from them.

### D6. Analytics coverage from heartbeat spans, on the summary only

The summary reads `nodes` documents whose span overlaps the range (`firstSeenAt <= to`, `lastSeenAt >= from`, plus
`_id` for a node scope) with a `mediaStats` projection and folds them into `none`, `partial` or nothing. The page
applies the summary's coverage to the Data up / down tile and the Bandwidth section, and exposes it to the cards of the
page's extension slots as `AnalyticsPageContext.mediaStats` (a signal of `'partial' | 'none' | undefined`), so the
series and breakdown responses do not change.

Rejected: a coverage field on every series response (the page already holds the summary of the same range and scope).
Rejected: inferring coverage from rollup bytes at 0 (a quiet range reads the same).

### D7. Values stay as stored

The rooms list keeps `bytes` next to `mediaStats: false`, and the summary keeps `bytesUp` and `bytesDown`; only the UI
replaces them. API clients see the same shapes plus one optional property.

### D8. A generator option for nodes without media statistics

`--nodes-without-media-stats <n>` (default 0) marks the last `n` generated nodes: their node documents carry
`mediaStats: false`, their rooms and sessions are stamped and get no media `track_stats`, room bytes or quality, and their
rollup contributions lose bytes and quality. The other nodes get `mediaStats: true`. The keep-alive preserves the flag.

## Data model

- `nodes.mediaStats`: bool, written on every heartbeat. `rooms.mediaStats` and `participants.mediaStats`: bool, only
  `false`, set by the projections. Contract schemas of the three collections gain the optional property; the dashboard
  mirror and its typings follow.
- No index, retention or schema version change (the v2 schema has not shipped). No mapping from legacy events (D4).

## API

- `RoomListItem.mediaStats?: false` (`GET /api/v1/rooms`).
- `AnalyticsSummary.mediaStats?: "partial" | "none"` (`GET /api/v1/analytics/summary`).
- The coverage query runs on `nodes`, backed by the `lastSeenAt` TTL index; the collection holds one document per node
  process of the last 30 days.

## Performance budget

One extra query per summary on a collection of tens of documents: under 5 ms, verified by an integration test with an
`explain()` plan (`IXSCAN` on `lastSeenAt`) next to the existing analytics plan tests. The summary p95 budget (150 ms at
scenario L) is unchanged. The pseudo-track room delta adds at most one room update per room and batch, and only for
rooms whose flush carries no media stat; the writer benchmark of the batch path checks it stays within its budget.

## Risks / Trade-offs

- [A room touched first by an egress or ingress event of another node] → it takes that node's mark until its
  `ROOM_CREATED` is applied, which then sets the host's mark (D4).
- [Coverage misses nodes whose documents expired] → ranges older than 30 days may read as fully reported; the entity
  marks keep rooms and sessions right.
- [A pseudo-track-only room delta on a room not written yet] → the same upsert as a media stat delta today.

## Migration Plan

Ships with the v2 writer and dashboard. Rollback: dashboards ignore the property and writers without it never write it.
