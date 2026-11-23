# Design

## Context

See proposal.md for the motivation. The data generator (`dashboard-ce/tools/data-generator`) picks a node for each room
with one draw (`rng.pick(ctx.nodeIds)`). It then moves some closed rooms onto the departed nodes (`rehost()` in
`generator.ts`) and writes fixed node documents at the end. Node ids come from the main random stream. The engine,
which decides padding and jitter in the samples, follows the label (`media-node-10-0-0-2` is mediasoup). The keep-alive
(`keepLive` in `schema.ts`) refreshes every unstopped node within an hour of the freshest one and forces
`batchIntervalMs` to 10 000.

What the writer does, checked in `openvidu-livekit/openvidu/analytics` and `openvidu-pro-livekit`:

- Every process start gets a new random node id (`guid.New(NodePrefix)`), so each restart is a new `nodes` document.
  `firstSeenAt` is set on insert.
- `drainingAt` is the first heartbeat that saw the drain. `stoppedAt` is written only by a graceful stop, after the
  final batch; a second signal closes the open rooms with `SERVER_SHUTDOWN`. A server killed while draining keeps
  `drainingAt` and has no `stoppedAt`.
- The reconciler closes the sessions and rooms of a dead node (no heartbeat for two batch intervals and absent from the
  registry) with reason `node-dead`, at their last signal. It counts them in that server's `rooms.reconciled`. Their
  egresses are failed later with `room-closed-node-dead`.
- Node scopes are `node:<label>` only (`projection/rollup.go`), so there are no per-process scopes. Labels come from
  `ApplyNodeDefaults` for Elastic and HA alike. In a labelled deployment, the writer writes unlabelled rooms only when it
  replays the legacy events of an upgrade from 3.9.
- `mediaStats: false` came only from PRO mediasoup builds between commits 171d0b3c (2026-11-02) and 32b29866
  (2026-11-18), both after 3.9.0 and before any 3.10 release. The owner keeps it as an option.

## Goals / Non-Goals

**Goals:** server timelines (start, drain, stop or silence) that hold for any `--days` from 1 to 30; rooms that follow
their server; the same data for the same seed and mode. Room content is not kept across modes or across this change:
a seed's rooms differ between single-node and multi-node data, and from what the seed produced before this change.

**Non-Goals:** room migration on node death (LiveKit may recreate the room on another node; here it ends with its
server). Refusing joins to rooms of a draining server: the CE writer spec says a draining server takes no new
participants, LiveKit was not checked, and the owner asked only for "no new rooms". The drain rule therefore applies to
room creation only. Sessions share their room's `nodeId` and `mediaNode` and join at or after the server's
`firstSeenAt`, and they may still join a room after its server starts draining. Per-process scopes and unlabelled
rooms in multi-node data, which the writer cannot produce. No contract, typings or writer change.

## Decisions

**Owner decisions.**

- Keep `--nodes-without-media-stats` for a server version without media statistics, upgraded halfway through the range.
- Restart the single node twice: a planned upgrade and a crash.
- Keep the random ~2 % `SERVER_SHUTDOWN` share (`pickEndReason` is unchanged). Rooms open at a graceful stop also end
  that way, on top of that share.
- Run a cluster upgrade from `3.10.0` to `3.10.1` at the middle of the range.
- Switch `-1` from pion to mediasoup at that upgrade.
- Give `-6` a 30 s interval, accepting the wider freshness windows (fresh 50 s, stale 105 s) in multi-node data.

**Server timeline table.** One table, built in `generator.ts` from `now`, `windowStart`, the mode and the option, lists
each server: `nodeId`, label, `firstSeenAt`, `drainingAt?`, end (`stoppedAt` or silence, or none when alive),
`rtcEngine`, `serverVersion`, `mediaStats` and `batchIntervalMs`. The node documents, the host choice, the room ends,
the engine of the samples and the peak lifetimes all read it, which replaces `NODE_COUNT`, `restart`, `departed`,
`MEDIASOUP_MEDIA_NODE` and `rehost()`. Instants are relative: M is the middle of the range, Q is three quarters of it,
E is `now`. All are floored to the minute.

| Machine | Server | firstSeenAt | drainingAt | End | Engine | Version |
| --- | --- | --- | --- | --- | --- | --- |
| single | 1 | before range | M − 2 min | stopped at M | pion (mediasoup with the option) | 3.10.0 |
| single | 2 | M + 1 min | — | silent at Q | same | 3.10.1 |
| single | 3 | Q + 2 min | — | alive | same | 3.10.1 |
| `-1` | a | before range | M − 10 min | stopped at M | pion | 3.10.0 |
| `-1` | b | M + 1 min | — | silent at E − 5 h 2 min | mediasoup | 3.10.1 |
| `-1` | c | E − 5 h | — | alive | mediasoup | 3.10.1 |
| `-2` | a | before range | M + 20 min | stopped at M + 30 min | mediasoup | 3.10.0 |
| `-2` | b | M + 31 min | — | alive | mediasoup | 3.10.1 |
| `-3` | | before range | E − 20 min | alive | pion | 3.10.0 |
| `-4` | | before range | E − 3 h 10 min | silent at E − 3 h | pion | 3.10.0 |
| `-5` | | before range | E − 40 min | stopped at E − 30 min | pion | 3.10.0 |
| `-6` | | Q | — | alive, 30 s interval | pion | 3.10.1 |
| `-7` | | before range | — | silent at E − 3 d | pion | 3.10.0 |

"Before range" is one day before the earlier of `windowStart` and the server's end, so `-7` stays coherent when the
range is shorter than 3 days. With the option, server 1 of the single node and server a of `-2` have
`mediaStats: false`. A server's version comes from its `firstSeenAt` (before M or not), so the rule covers both modes.
`schema_meta.schema.writerVersion` is the newest server's version. The legacy `migration` document keeps `3.10.0` and
names the server running at the start of the range.

**Host choice: one draw per room.** A room still takes exactly one draw from `rng` for its host, now an index into the
machines that take rooms at its `createdAt` (from `firstSeenAt` to before `drainingAt` and the end). For an active
room, the list is limited to servers alive at E. Node ids come from a stream of their own (`seed + 11_000_027`), so the
number of servers draws nothing from the room streams. Rooms still draw from shared streams in plan order, though. The
rooms `hostRooms` adds (one pinned room per lost server, below) or drops (the single-node gaps, below) shift the draws,
and so the content, of every later room. In single-node mode, a room planned while no
server takes rooms (the drain and the restart gaps, a few minutes) is not generated. Nor is an active room planned
before the third single-node server started (Q + 2 min), since no server alive at E took rooms then. This happens only
on short ranges where the latest 10 % of the rooms, which stay active, reach back past Q (for example `--days 1` early
in the morning).
Alternative rejected: shifting those rooms to the next server's start, which changes `createdAt` and the plan order.

**The end of a room follows its server.** `generateRoom` receives its server and closes the room at the server's end
when the room is still open then. At a `stoppedAt` it closes with `SERVER_SHUTDOWN` and `closedBy: event`. At a silence
it closes with `RECONCILED`, `closedBy: reconciler` and `reconcilerReason: node-dead`, the existing synthetic event path
of `derive.ts`, with `endedAt` at the last signal no later than the silence. The existing `closeSessions` and
late-session rules apply unchanged. Rooms that draw `RECONCILED` at random (3 %) keep `absent-live`; only rooms closed
by a silence carry `node-dead`.

**A room on every lost server.** At night the scenario S creates about one room an hour, so a crash may find none open.
`planRooms` adds one closed room on each server that goes silent inside the range, 10 minutes before the server stops
taking rooms (its `drainingAt` or its silence). The room is pinned to that server. Its first participant's first session lasts until the
silence and the room's end is forced to the silence, so the reconciler closes it with `node-dead`. Its empty-room draw
is skipped, so the room always has that session. This adds one or two rooms per database. Alternative rejected: forcing an
existing room, which changes its draws and may pick an empty room.

**Engine per server.** `applyStats` and `deriveStats` take the engine of the room's server (by `nodeId`), since `-1`
changes engine.

**Option bounds.** Any `nodesWithoutMediaStats` other than 0 or 1 throws with a message naming that bound, in both
modes. With 1 in single-node mode, all three servers run mediasoup and server 1 reports no media statistics.

**Keep-alive.** `keepLive` refreshes only the unstopped servers whose `lastSeenAt` is within one minute of the freshest one. All
alive servers share E at generation and are refreshed together, so they stay together. It sets `lastSeenAt` only, so
each server keeps its `batchIntervalMs`. This also fixes a server lost a few minutes ago coming back to life under the
current one-hour threshold.

**Tests renamed, not added, for the carried scenarios.** The modified requirements carry four unchanged scenarios
without tests under those titles. The tests that already check them are retitled ("Generated event payload",
"Lower-cased search fields", "Validator", "Generated rollups of servers reporting media statistics"), and split out of
the large first test when needed.

**Performance.** No query or index change. The generator's cost per room does not change (one table lookup per room),
so its time is checked by the existing integration test runs only.

## Test strategy

| Scenario | Test file | Level |
| --- | --- | --- |
| Generated single node | `dashboard-ce/backend/test/integration/data-generator.test.ts` | integration |
| Generated media node servers | same | integration |
| Keep-alive of generated servers | same | integration |
| Generated server versions | same | integration |
| Rooms of generated servers | same | integration |
| Generated node heartbeats | same | integration |
| Generated rollups of nodes without media statistics | same | integration |
| Generated rollups of servers reporting media statistics | same (retitled) | integration |
| Generated event payload, Lower-cased search fields | same (retitled) | integration |
| Validator | `dashboard-ce/typings/test/contract.test.ts` (retitled) | unit |

## Risks / Trade-offs

- [Tests that relied on the old set: five labels, `-2` mediasoup and `-1` pion with padding, `-3` without statistics] →
  The implementer updates them to pick nodes by state or engine. For the padding test, `-3` is the pion reference.
- [Short ranges (1–2 days): `-7` hosts no room in the range, and `-3` may hold no active room while draining] →
  Accepted. The scenarios check `-7` only through its document.
- [The 30 s node widens the freshness windows of the multi-node data] → Accepted by the owner.
- [The label `3.10.0` on a server without media statistics does not match the real 3.10.0, which reports them] →
  Accepted: the option stays generic. The README says it stands for an earlier version.

## Migration Plan

Nothing to migrate: every demo and test database is regenerated. PRO keeps its demo flags and moves `ce.ref` after
this change is pushed. The proposal lists what PRO may adapt.
