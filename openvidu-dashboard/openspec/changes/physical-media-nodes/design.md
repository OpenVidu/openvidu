# Design

## Context

- **Node documents:**
  - `analytics.Node{ID, Region, WithoutMediaStats}` is built in `openvidu/openvidu.go`.
  - `store.Heartbeat` upserts one `nodes` document per process on every batch tick, and the document expires 30 days
    after `lastSeenAt`.
  - Node ids are generated per process.
  - An edition adjusts the analytics through `openviduconfig` package variables before `openvidu.Start`
    (`DefaultStatsDetail`, `MediaStats`).
- **Entity stamps:**
  - Rooms take `nodeId` from `ROOM_CREATED`, and from the first event of any kind while it is unknown.
  - Participant sessions take `nodeId` from their first event.
  - `mediaStats` follows the same rule (`projection/room.go`, `participant.go`).
- **Rollups:** `projection/rollup.go` writes `global` and `node:<event node id>`. The event node id is always the
  writing process's (`pkg/telemetry/analyticsservice.go`).
- **Reconciler:**
  - It adds the `participantsSum` of a room it closes to `node:<room.nodeId>`.
  - Its daily unique identities group sessions by `nodeId`.
  - It and the legacy migration project with `projectionOptions`, which carries no node fields.
- **Shutdown:** `writer.drain` writes the queues after the rooms close, within the 5 s shutdown budget.
- **Dashboard backend:**
  - The status service counts every `nodes` document (`foldWriter`).
  - The overview repository groups active rooms and sessions by `nodeId` for the edition extension
    (`OverviewInputs`).
  - The rooms list filters `nodeId` on `nodeId_status_createdAt_id`.
- **Dashboard frontend:**
  - Three seams receive edition components: `OVERVIEW_NODES_CARD`, `ROOMS_NODE_FILTER` and `ANALYTICS_SCOPE_SELECT`.
  - CE renders them locked without `per-node-breakdown`.
  - The Node columns are CE columns reading `nodeId`.
- **Index maintenance:** `schema.Initialize` creates and updates the contract's indexes and never drops an index that
  is absent from the contract.

## Goals / Non-Goals

**Goals:**
- A restart-stable machine identity on every room and session, for the whole entity retention.
- Per-node rollups that add up the restarts of one machine.
- A stopped server is distinguishable from a silent one.
- CE code and specs stay neutral: the label is an opaque string the server gives, and CE never shows per-node UI.

**Non-Goals:**
- Deciding when a label exists or what it looks like (edition).
- Labelling egress, ingress, tracks or subscriptions: views reach tracks and subscriptions through their participant.
- Using `stoppedAt` in the reconciler's liveness check.

## Decisions

### D1. An opaque label set by the server edition

`openviduconfig.MediaNode` (default empty) is the media node label. An edition sets it before the analytics start, like
`MediaStats`. `openvidu.Start` passes it as `analytics.Node.MediaNode`, and `nodeProjectionOptions` passes it to the
projector. There is no configuration key: the edition derives it from facts it already has.

Rejected:
- The dashboard joining `nodeId` to `nodes`, for the reason `media-stats-availability` gave for `mediaStats`: node
  documents expire after 30 days and entities live 90 days by default.
- A CE-defined label (hostname, IP). The hostname of a container is not the machine, and the right identity depends on
  how an edition deploys its nodes.

### D2. The stamp follows `nodeId`

The label is set with the same expressions as `mediaStats`. An entity this process writes first gets its label. The
host's `ROOM_CREATED` (or the session's first event) sets `nodeId` and `mediaNode` together. So a room touched first by
another process's egress event ends with the host's label.

### D3. Node scopes keyed by the label, none without one

`scopes()` returns `global` plus `node:<label>` when the projector has a label, and `global` alone otherwise. The
reconciler's room-close increments use the room's `mediaNode`, and its daily unique identities group by `mediaNode`.
The legacy migration has no label, so migrated data gets `global` only.

Rejected:
- Keeping `node:<nodeId>` beside the label scope. It doubles rollup upserts on every server, CE included, for scopes
  nobody reads and that split one machine into its restarts.
- Keeping `node:<nodeId>` only when there is no label. Same cost, and CE never reads it.

The effect on writes: an unlabelled server does half the rollup upserts it does today, and a labelled one the same.

### D4. `stoppedAt` after the final flush

After `drain` writes the queues, the writer upserts its node document with `$max lastSeenAt` and `$set stoppedAt`, both
the same timestamp, within the remaining shutdown budget. A crash, a kill or an unreachable database leaves no
`stoppedAt`, so the node reads as silent, which is what happened.

### D5. Status without node counts

`writer` becomes `{ lastSeenAt?, stoppedAt?, batchIntervalMs? }`. No CE view counts nodes any more. An edition that
shows machines folds `nodes` itself, since the count of process documents is not a count of machines.

A document is alive when it has no `stoppedAt` and is within its fresh window. `stoppedAt` is reported only when no
document is alive, which keeps a scale-in of one machine from reading as a stopped deployment.

### D6. Visibility follows `per-node-breakdown`

Without the feature, CE renders nothing per node: no card, select, scope selector or column, and no lock. With it, it
renders the seams' components and the Node columns (from `mediaNode`). The edition decides when it reports the
feature.

Rejected:
- A separate `multiNode` fact in `/api/v1/info`: two switches for one decision.
- Keeping the locks: nothing can be unlocked in a single-machine deployment.

### D7. `node` in the URL, `mediaNode` in the API

The value changes meaning, so the names change too. The API is unreleased, so there is no alias for `nodeId`. The Rooms
page drops `node` without the feature, as it drops `nodeId` today.

### D8. A partial index for the filter

`mediaNode_status_createdAt_id` (`{ mediaNode: 1, status: 1, createdAt: -1, _id: -1 }`,
`partialFilterExpression: { mediaNode: { $exists: true } }`) replaces `nodeId_status_createdAt_id`. An equality on
`mediaNode` implies the partial filter, so the planner can use it. CE databases, with no label, keep it empty.

## Data model

| Collection | Field | Type | Notes |
| --- | --- | --- | --- |
| `nodes` | `mediaNode` | string, 1-128 chars of `[A-Za-z0-9_.-]` | optional, present when the server has a label |
| `nodes` | `stoppedAt` | date | optional, set by a graceful stop |
| `rooms` | `mediaNode` | string, as above | optional, follows `nodeId` |
| `participants` | `mediaNode` | string, as above | optional, follows `nodeId` |
| `analytics_*` | `scope` | `global` or `node:<label>` | node scope only from labelled servers |

- **Characters:** the label's character set is the one `ANALYTICS_SCOPE_PATTERN` accepts, so every label is a valid
  scope.
- **Indexes:** `rooms.mediaNode_status_createdAt_id` (partial) is added, and `rooms.nodeId_status_createdAt_id` leaves
  the contract. `Initialize` does not drop it, so a database written before the change keeps it until someone drops it
  by hand.
- **Retention:** unchanged. `nodes` keeps its 30-day TTL and the stamped fields live with their entity.
- **Schema version:** no bump, since the v2 schema has not shipped.
- **Legacy migration:** legacy events carry no label, so migrated rooms and sessions get no `mediaNode`, and their
  rollups get only `global`.

## API

- **`GET /api/v1/status`:** `writer: { lastSeenAt?: date-time, stoppedAt?: date-time, batchIntervalMs?: integer }`.
  - It still reads `schema_meta` and `nodes` whole.
- **`GET /api/v1/rooms`:**
  - Takes `mediaNode` (string, 1-128) instead of `nodeId`.
  - Items add `mediaNode?: string`.
  - It runs on `mediaNode_status_createdAt_id`, or on `nameLower_createdAt` with `mediaNode` as a residual filter when
    `q` is a prefix.
- **`GET /api/v1/participants`, `GET /api/v1/agents`:** items add `mediaNode?: string`. Queries are unchanged.
- **`GET /api/v1/analytics/summary`:** the coverage query of a `node:<label>` scope adds `mediaNode: <label>` to the
  `nodes` filter. It still runs on `lastSeenAt_ttl`, on a collection of tens of documents.

## Performance budget

- Rooms list with `mediaNode`:
  - the existing budget of `rooms-api` applies: p95 within 300 ms for ranked sorts over 7 days at scenario M;
  - verified with explain plans on a database generated with `--media-nodes`, with `IXSCAN` on the new index and
    `totalDocsExamined` within the documented bounds.
- Status and summary:
  - no new query, and the `nodes` reads stay bounded by the process documents of 30 days;
  - verified by the existing command-monitoring and plan tests.
- Writer: one extra field per heartbeat and stamp, half the rollup upserts on unlabelled servers, and one node upsert
  at shutdown. The existing benchmarks cover it.

## Risks / Trade-offs

- [A label changes when an edition's machine identity changes, for example a new IP] → the dashboard sees a new media
  node. The edition documents its rule.
- [Shutdown budget exhausted before `stoppedAt`] → the node reads as silent. The queues have priority, and the upsert
  is one small write.
- [Pre-change databases keep `node:<nodeId>` scopes and the old index] → editions list only label scopes. The scopes
  expire with the rollup retention, and the index costs space on development databases only.
- [Rooms between a restart and the new process's first event keep the old label] → that is the same machine, so the
  label is right by design.

## Migration Plan

It ships with the v2 writer and dashboard of 3.10. On rollback, dashboards that do not know the fields ignore them and
writers that do not know them never write them.
