# Design

## Context

- **Node identity in the writer:**
  - `analytics.Node{ID, Region, WithoutMediaStats, MediaNode}` is built in `openvidu/openvidu.go` from LiveKit's
    local node (`server.Node()`) and the `openviduconfig` variables an edition sets before `openvidu.Start`
    (`MediaStats`, `MediaNode`).
  - `store.Heartbeat` upserts the node document on every tick, and `store.Stopped` records the graceful stop after the
    final flush.
- **Drain:**
  - On the first stop signal `LivekitServer.Stop(false)` calls `router.Drain()`. It sets the local node state to
    `SHUTTING_DOWN`, which LiveKit's node selector excludes from new rooms.
  - The server then waits for its participants. `openvidu.Stop()`, which stops the analytics, runs only when
    `server.Start()` returns, so heartbeats keep running through the drain.
- **Counting once:** rollup counters from events count only when the raw insert of the event succeeds. The
  reconciler closes each entity once and leaves a later real end event to correct the fields only.
- **Retention:**
  - Entity documents carry `expiresAt`.
  - Other collections use TTL indexes. `INDEXES` in the contract gives each TTL index either a fixed
    `expireAfterSeconds` or a `retentionClass`, and `schema.Initialize` applies the configured value with `collMod`.
  - `nodes` has the fixed `NODE_RETENTION_MS` (30 days).
- **UI seams:**
  - Route configs carry `NavigationMeta`. A route with a `feature` renders the full-page lock without it.
  - The Overview renders the `OVERVIEW_NODES_CARD` component next to Recent rooms.
  - The Node cells of the Rooms, Participants and Agents tables print `mediaNode` as text.
- **Generator:** with `--media-nodes`, three labels over the three generated nodes plus one earlier stopped process.
  `keepLive` refreshes every document without `stoppedAt`.

## Goals / Non-Goals

**Goals:**
- Everything a media node view needs, in the node documents that already exist, at no extra round trip per batch.
- Node documents that live exactly as long as the rooms that reference them.
- Seams that CE does not use and that name no edition.

**Non-Goals:**
- A media node collection, or any aggregation the writer runs to fold processes into machines.
- Live load figures (CPU, memory).

## Decisions

### D1. Edition-provided `ip` and `rtcEngine`, writer defaults

`openviduconfig` gains `MediaNodeIP` (empty) and `RTCEngine` (`"pion"`). An edition sets them before
`openvidu.Start`, as it sets `MediaStats` and `MediaNode`. They reach `analytics.Node.IP` and `analytics.Node.RTCEngine`,
and the heartbeat writes them. `ip` is written only together with a label, so a stray IP never appears without the
machine name it explains.

`rtcEngine` and `mediaStats` stay separate. The engine says what runs, `mediaStats` says what the data holds. When
mediasoup gains media statistics, the edition flips `MediaStats` alone.

Rejected: deriving the IP from the label. It is lossy for anything but the label format one edition uses today.

### D2. `drainingAt` from LiveKit's node state

`analytics.Node` gains `Draining func() bool`, built in `openvidu.go` as
`server.Node().Clone().State == livekit.NodeState_SHUTTING_DOWN`. When it reports true, the heartbeat adds
`$min: { drainingAt: at }`, so the first draining tick sets it and later ticks leave it.

Rejected: setting it from the stop signal handler. `main.go` is LiveKit's, and the router is what decides that the
node takes no new rooms.

### D3. Room counters through the projection and the reconciler

- `rooms.hosted`: the processor counts the `ROOM_CREATED` events whose rollups it applied, in the same gated step, so
  a replayed event never counts twice. A node writes only the events it emits, and only the host emits a room's
  `ROOM_CREATED`. The next heartbeat adds the count with `$inc`, and puts it back for the following one if it fails.
- `rooms.reconciled`: the reconciler adds `$inc: { "rooms.reconciled": 1 }` to the room's `nodeId` document when it
  closes the room. A real `ROOM_ENDED` that arrives later goes through the closure correction path and does not touch
  it.

Rejected: counting with an aggregation over `rooms` on read. `rooms` has no `nodeId` index any more, and the PRO page
reads every server of a node.

### D4. `nodes` expire with the entities

The contract's `lastSeenAt_ttl` index takes `retentionClass: entities` instead of a fixed value, and
`NODE_RETENTION_MS` is removed. A running server keeps refreshing `lastSeenAt`, so it never expires. A dead one
expires `retention.entities` after its last heartbeat, never before the rooms it hosted, whose `expiresAt` counts from
their end. If the entities class is configured to keep data forever, the index loses its TTL as other classes do.

### D5. `region` no longer written, still allowed

The heartbeat stops writing `region` and the typings drop it.
The validator keeps it as an optional legacy field. Documents written before the change must still accept updates
such as `$inc rooms.reconciled` when the validator checks the whole document.

### D6. A partial index for one media node's servers

`mediaNode_firstSeenAt` (`{ mediaNode: 1, firstSeenAt: -1 }`, partial on `mediaNode: { $exists: true }`) serves "the
servers of `mn-a`, newest first". The collection is small. The index keeps that read independent of the other media
nodes, at no cost to unlabelled deployments.

### D7. UI seams without edition names

- `NavigationMeta.hiddenWithoutFeature?: true`:
  - The sidenav filters such entries by `FeatureService`.
  - `composeRoutes` adds a `canMatch` guard to those routes. The guard waits for the info and fails without the
    feature, so the router falls through to the catch-all.
  - No lock, no breadcrumbs, no request.
- Overview: the nodes card slot moves into its own full-width row before Recent rooms, and Recent rooms always uses the
  `.full` layout.
- `MEDIA_NODE_LINK`:
  - an `InjectionToken<((label: string) => string) | null>`, default `null`;
  - read by the three Node cell templates, which render a `routerLink` when it returns a path and plain text
    otherwise.

### D8. Generator states

With `--media-nodes`, the generator models five labels with life spans:
- `-1`: the existing restart.
- `-2`: alive.
- `-3`: alive, `drainingAt` 20 minutes before the end of the data.
- `-4`: last seen 3 hours before the end. It hosts some of the rooms that ended before then, the reconciler-closed ones
  among them counted in `rooms.reconciled`.
- `-5`: drains at 40 minutes and stops 30 minutes before the end.

Details:
- Rooms are moved to `-4` and `-5` only when they ended before those nodes went silent or drained, after their
  generation and before their events, stats and rollups are derived.
- `rooms.hosted` is the count of rooms per `nodeId`.
- `--nodes-without-media-stats N` (at most 3) applies to `-3`, `-2` and `-1` in that order, and those nodes get
  `rtcEngine: "mediasoup"`.
- `keepLive` refreshes only documents without `stoppedAt` seen within an hour of the freshest one, which leaves `-4`
  silent whatever time passed since the last tick.

## Data model

`nodes`:

| Field | Type | Notes |
| --- | --- | --- |
| `rtcEngine` | `"pion"` \| `"mediasoup"` | new; read as `pion` when missing |
| `ip` | string | new; only with `mediaNode` |
| `drainingAt` | date | new; first draining heartbeat |
| `rooms.hosted` | int32 | new; read as 0 when missing |
| `rooms.reconciled` | int32 | new; read as 0 when missing |
| `region` | string | no longer written; allowed for older documents |

Indexes:
- `lastSeenAt_ttl` with `retentionClass: entities`, updated with `collMod`;
- new `mediaNode_firstSeenAt`, partial.

The schema version stays 1, since the contract is unreleased. No migration from legacy events: the legacy migration
writes no node documents.

## API

No dashboard endpoint changes. `/status` keeps reading `nodes` for writer freshness and ignores the new fields.

## Performance budget

- **Heartbeat:** the same single upsert with three more fields.
- **Room counters:** no extra write: the hosted rooms ride on the heartbeat.
- **Reconciler:** one `$inc` per room it closes, a rare path.
- **Verification:**
  - the writer round-trip counter in the integration tests stays at its budget per batch;
  - an `explain()` of the servers-of-a-node read uses `mediaNode_firstSeenAt`.

## Risks / Trade-offs

- [`Clone()` on every heartbeat copies the node proto] → It runs once per batch interval. An accessor on the node
  state can replace it if profiling ever shows it.
- [A deployment that sets `retention.entities` very short loses node history early] → It loses the rooms just as
  early, and the PRO page states the retention.
- [The legacy `region` stays in old documents for up to the entities retention] → Nothing reads it.

## Migration Plan

1. Writer: the new fields appear on the next heartbeat of each server, and `collMod` moves the TTL to the entities
   retention at the next start.
2. Dashboard library: the seams ship unused in CE, and PRO fills them.

Rollback: an older writer writes `region` again, and its contract puts back the fixed TTL with `collMod`.
