# Proposal

## Why

Editions that run several media nodes need to show each one: its IP, its RTC engine, whether it is draining, how many
rooms each of its server processes hosted and how many the reconciler had to close after a crash. Today the node
document has none of that.

The node document also expires 30 days after its last batch, while the rooms it hosted live 90. It carries a `region`
that OpenVidu deployments never set: it is a LiveKit field for its SaaS.

On the UI side, the shell can only lock a page an edition lacks, not hide it. The Overview places the per-node card in
half the width, too narrow for a table. And the Node cells of the lists cannot link anywhere.

## What Changes

- **Writer, node document:**
  - `ip`: the machine's IP, which a server edition can give together with the media node label.
  - `rtcEngine`: `pion` or `mediasoup`. A server edition can set it; it is `pion` when not set, which is the CE server.
  - `drainingAt`: set on the first heartbeat after LiveKit starts draining the node (`SHUTTING_DOWN`), when it takes
    no new rooms.
  - `rooms.hosted`: the rooms whose `ROOM_CREATED` the server wrote as their host, counted once per room.
  - `rooms.reconciled`: the rooms of that server closed by the reconciler, counted once per closure, whichever server
    runs the reconciler.
  - **BREAKING** (unreleased contract): `region` is no longer written.
- **Retention:** `nodes` expire `retention.entities` after their last heartbeat, like the entities they describe.
  `NODE_RETENTION_MS` (30 days, fixed) goes away; the writer updates the TTL with `collMod` as for other classes.
- **Index:** a partial `mediaNode_firstSeenAt` index on `nodes` serves the servers of one media node, newest first.
- **UI library seams:**
  - **Hidden navigation entries.** A route can mark its navigation entry as hidden without its feature. The sidenav
    then leaves it out and the route behaves as an unknown path, instead of the full-page lock.
  - **Per-node card at full width.** The Overview places the edition's per-node card at full width, between the today
    and server status row and the recent rooms table. Recent rooms always takes the full width.
  - **Media node links.** The Node cells of the Rooms, Participants and Agents tables render the label as a link when
    the edition provides one for media nodes, and as plain text otherwise.
- **Data generator:** with `--media-nodes`, five labelled media nodes cover every state an edition can show:
  - `-1` restarted;
  - `-2` alive;
  - `-3` draining;
  - `-4` not reporting, with rooms closed by the reconciler;
  - `-5` stopped after draining.
  Each node carries `ip`, `rtcEngine` and the room counters. The nodes chosen by `--nodes-without-media-stats` are
  `mediasoup`.

Scope excludes the following:
- The pages and API that show media nodes, which belong to the edition that unlocks `per-node-breakdown`.
- CPU, memory or public IP of the node (left out by the owner).
- The node an egress or ingress process runs on.
- Backfilling `ip`, `rtcEngine` or the counters on node documents written before the change.

Edition: CE and PRO. The writer fields apply to every edition, and the CE server writes `rtcEngine: "pion"`, no `ip`
and no label. The seams are generic and CE shows nothing new. Repositories:
- openvidu-livekit: `openvidu/analytics`, `openvidu/openviduconfig`, `openvidu/openvidu.go`;
- the dashboard: typings and contract, frontend library, data generator, specs.

CHANGELOG lines:
- `CHANGELOG.md`: none. CE shows nothing new.
- `CHANGELOG-openvidu.md` (openvidu-livekit):
  - "Analytics node documents record the RTC engine, the machine's IP, when the server started draining and the rooms
    each server hosted and lost, and expire with the entities retention."
  - the data model line drops `region`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`:
  - the node heartbeat writes `rtcEngine`, `ip` and `drainingAt`, and no `region`;
  - new requirements for the media node IP, the RTC engine, the drain start and the rooms per server.
- `data-model`:
  - the node document fields, its retention and its media node index;
  - the generated media nodes in every state.
- `overview-ui`: the per-node card at full width above the recent rooms.
- `ui-shell`: navigation entries hidden without their feature.
- `ui-building-blocks`: media node links in the Node cells.

## Impact

- openvidu-livekit:
  - `openviduconfig`: `MediaNodeIP`, `RTCEngine`;
  - `analytics.Node`, set from `openvidu/openvidu.go`, plus a draining probe on LiveKit's local node;
  - `store.Heartbeat`, and the `$inc` of the room counters in the projection and the reconciler;
  - `schema` (indexes, TTL class) and the vendored contract.
- Typings: `NodeDocument`, the `nodes` TTL index with `retentionClass: entities`, the new index in `INDEXES`, the
  `nodes` schema and fixtures.
- Backend: `status` reads `nodes` but none of the new fields. Nothing reads `region`.
- Frontend library:
  - `NavigationMeta.hiddenWithoutFeature`, honoured by the sidenav and the route guard;
  - the Overview layout;
  - the `MEDIA_NODE_LINK` injection token, read by the three Node cells.
- Data generator: node states, counters, `ip`, `rtcEngine`, and a keep-alive that leaves the not reporting and stopped
  nodes alone.
- An edition that shows media nodes fills the seams and reads the new fields.
