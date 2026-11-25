# Design

## Context

See proposal.md for the motivation. The data generator (`dashboard-ce/tools/data-generator`) writes a deterministic
scenario over a range that ends at the generation instant:

- `planRooms()` and `hostRooms()` (`generator.ts`) plan the rooms and their servers, using the server timeline
  (`serverTimeline()`), whose instants are relative to the middle (M), three quarters (Q) and end (E) of the range.
- `generateRoom()` (`model.ts`) draws a room from a shared stream (`ctx.rng` and its siblings), in creation order.
- `applyStats()`, `deriveEvents()`, `deriveStats()` and `Rollups` (`samples.ts`, `derive.ts`) build stats, events and
  rollups from the documents of a room. Each stat is already a pure function of session, track and instant, and
  `RoomMedia` takes the instant at which open entities end.
- The keep-alive (`keep-alive.ts`, `keepLive()` in `schema.ts`) moves `lastSeenAt` and `lastStatsAt` every 15 s.

An active room is not a timeline. It is drawn "as of now": `plan.active` forces the last participant to stay past now,
adds a session that joined seconds ago, picks `starting`, `ending` or stopped egresses and buffering ingresses as fixed
states, and some draws depend on `now`. Event ids come from one stream shared by every room (`eventsRng`), so they
shift as soon as a room has more events.

The writer behaviour the live writer imitates is in `server-analytics-writer` (10 s batches, 30 s stats, increments,
heartbeats), `server-aggregator` (peaks every 60 s, unique identities after 00:05 UTC) and `server-reconciler`
(candidates after 90 s without stats, runs every 60 s, closures dated at the last signal, node-dead cascades).

## Goals / Non-Goals

**Goals:**

- One world per seed, generator options and start instant: complete room lives drawn once, then written at any
  instant.
- In `live` mode, writes that look like the writer's: the same documents, within 10 s of their instant, as updates and
  increments.
- Data in `frozen` mode as close to today's as the model allows.

**Non-Goals:**

- Writing live into a database that a real writer also writes.
- Simulating writer failures (retries, queue overflows), the legacy migration or schema upgrades.
- Changing the shares of the generation (egress 30 % of rooms, ingress 2 %, agents 5 %, SIP 1 %): only the rooms the
  live writer creates take other egress and ingress shares (decision 4).

## Decisions

### 1. Complete lives, cut at an instant

`generateRoom()` draws each room's whole life: every session's join, connection, mutes, resumes and leave, every
publication, subscription, egress status history and ingress session, and the room's end. It draws as if nothing were
open. A pure function `cutRoom(life, t)` then gives the `RoomBundle` at instant `t`:

- entities that start after `t` are dropped;
- entities open at `t` get their open state back: `leftAt`, `unpublishedAt`, `endedAt`, `durationMs`, `closedBy`,
  `disconnectReason`, `expiresAt` and the final stats return to `null`, and the status comes from the history at `t`
  (`joining` before `activeAt`, an egress status from `statusHistory`, an ingress session from its buffering and
  publishing instants);
- `muteChanges` and `resumedAt` keep the entries up to `t`;
- bytes, quality and `lastStatsAt` come from the samples up to `t` (`RoomMedia(bundle, engine, t)`);
- the room's derived fields (counters, peaks, topology, features, id arrays, `lastEventAt`) come from the cut sessions,
  through the derivation that `generateRoom()` runs today, moved into a function of its own.

`deriveEvents()`, `deriveStats()` and `Rollups.add()` need no change: they already build their output from the
documents, skipping what has no instant.

A room planned active at the generation instant (`plan.active`) is drawn with a natural end after it: its remaining life
is drawn between 10 minutes and 5 hours, or a server stop or loss ends it earlier. To keep today's snapshot, its life
places transient states around the instant:

- 15 % of these rooms have a participant who started connecting in the last minute;
- egresses that today come out `starting`, `ending` or stopped get histories that are in that status at the instant;
- the buffering ingress of an active room started buffering seconds before it.

The generation writes `cutRoom(life, now)`. A room that ended before `now` cuts to its full life, identical to today's
document.

- Rejected: a separate simulator that mutates the stored documents. It would duplicate the writer semantics that the
  generator already models, with two sources of truth for the same documents.
- Rejected: drawing a room again at each tick with `now = t`. The draws depend on `now`, so the room would change
  identities and figures from one tick to the next.

### 2. Random streams and ids

- The generation keeps its shared streams in creation order. Rooms created before the first room open at the end draw
  exactly what they draw today. The rooms of the last hour of the range (with `--active-window`), or the last 10 % of
  them without it, take other values, because the rooms open at the end draw complete lives.
- Rooms created by the live writer draw from streams seeded by (seed, world start, room number), so a room does not
  depend on how many rooms came before it in the tick.
- Event `_id` values become a hash of (type, entity id, instant, layer) through `hashRng()`. They are stable whatever
  the cut, so the live writer inserts each event exactly once. This changes every event `_id` of a seed, which no test
  or reader depends on.

### 3. The live writer

`LiveWriter` (`src/live.ts`) holds the world: the server timeline extended by the operations of decision 6, the planned
rooms within a horizon of one hour ahead, and the lives of the rooms that overlap the last tick. `tick(t)`:

1. Plans rooms up to `t + 1 h` (decision 4) and drops from memory the rooms whose end, and the end of every entity
   they hold, was written by an earlier tick.
2. For each room in the live set, cuts its life at the previous tick and at `t`, and diffs the two:
   - inserts the events and `track_stats` dated in `(previous, t]`;
   - `$set`s the fields that changed on each entity, and upserts the new ones;
   - `$inc`s the rollups by `Rollups(cut t) − Rollups(cut previous)`, per bucket and scope, so the hour that contains
     the generation instant continues from the document the generation wrote.
3. At the first tick of each minute, writes the active peaks with `$max` into the global (and node) 5-minute, hourly
   and daily documents. They are counted from the database, as the aggregator counts them.
4. At the first tick after 00:05 UTC, writes the `uniqueIdentities` of the closed day, aggregated from `participants`.
5. Writes the heartbeats of the servers alive at `t` (`lastSeenAt`, at each server's own interval), and the
   `drainingAt`, `stoppedAt` and new `nodes` documents of the server timeline due by `t`.

Everything goes through `toStored()`, and the collections keep the contract validators with `validationAction: error`,
so a document that drifts fails the run. Ticks run every 10 s, the writer's default batch interval. `SIGINT` and
`SIGTERM` stop the loop after the current tick.

The first tick after the generation is the generation's own instant, so the live writer continues in the same process
with the lives already in memory: `generate --live`. The `live` script only serves the restart on kept data
(decision 7).

### 4. Live planner and room floor

- Arrivals follow the scenario's pace and `HOUR_WEIGHTS`, drawn per UTC hour from (seed, world start, hour).
- For each minute of the horizon where fewer than 10 rooms would be in progress, rooms created in that minute are added
  on the servers that take rooms, up to 10. With 10 rooms of about 45 minutes and the S curve on top, there are about
  10 to 13 rooms in progress around 14:00 UTC, with about 40 to 60 participants.
- The floor is waived for 10 minutes after a live start on kept data and after a single-node server starts. During
  those 10 minutes the planner reaches the floor by spreading the missing rooms over them, as people coming back would.
- Room names continue after the highest stored `room-NNNNNN`.
- Live rooms draw an egress with probability 0.5 and an ingress with 0.1, through a share parameter of the room draw
  (default 0.3 and 0.02, which the generation keeps). A recording starting and a buffering ingress are therefore on
  screen often. The live day's egress and ingress counts sit above the history's, which the owner accepted.

### 5. Short-lived states and reconciler timing

- **Connecting participants.** Room lives get slow connections at a rate that keeps about one room in seven in progress
  with a participant `joining`. Each slow connection lasts 60 to 180 s; two thirds become `active`, one third abort.
- **Egresses.** They spend 20 to 60 s `starting`, and 20 to 60 s `ending` when stopped while active.
- **Ingress sessions.** They spend 60 to 120 s `buffering` before they publish.
- **Stale room each hour.** One room per UTC hour is drawn to end as an `absent-live` reconciler closure.
- **Reconciler timing.** Every reconciler closure (those rooms, the 3 % share, a lost server's rooms) is written 3 to 4
  minutes after the last signal it is dated at, as candidate detection (90 s), a 60 s run and confirmation make it.
  The cut shows the room `active` with its old `lastStatsAt` until that write time. The stale flag (90 s window)
  therefore shows for about 2 minutes. The synthetic events, the counters and the rollups of the closure go into the
  buckets of its end time, as the reconciler writes them.

### 6. Server operations

The server timeline gets a rolling schedule from the world start. It reuses the hosting and room-end rules
(`takesRooms()`, `hostRooms()`, `SERVER_SHUTDOWN` at a stop, `node-dead` at a loss), so it needs no new mechanism.

- **Elastic and HA.** At each even UTC hour, the next machine in the order `-1` … `-6` that is reporting and in no other
  operation drains. It stops 20 minutes later and has a new server 10 minutes after that. At 15:00 UTC the reporting
  machine after the last one drained is lost, and it has a new server 6 hours later.
- **Servers at the generation instant.** `-3`, draining, stops 20 minutes after the start and returns 10 minutes later.
  `-4`, lost, returns 6 hours after its loss. `-5`, stopped, returns at its turn. `-7` stays silent, as a retired
  machine.
- **Single node.** At 04:00 UTC the server drains; it stops at 04:02, and a new server starts at 04:03.
- **New servers.** They run `3.10.1` with the engine and the heartbeat interval of the machine's previous server, and
  `mediaStats: true`.

Cost estimate of rolling operations: about 150 to 200 lines (schedule, node cut, rotation), four scenarios and their
tests, about 10 to 15 % of the change. They fit the timeline-and-cut model. The frozen node snapshot that was the
alternative would cost about 3 %: moving the node ages forward each tick, one scenario.

### 7. Restart on kept data

- **`live` restart.** The `live` script reads the last heartbeat (the freshest `lastSeenAt`), the open entities and
  the alive servers (unstopped, within a minute of that heartbeat, as `keepLive()` picks them). Then:
  - it closes every open room, session, track, subscription, egress and ingress session as the reconciler does after a
    `node-dead` confirmation, at the last signal (`max(lastStatsAt, lastEventAt)`, never after the heartbeat), with the
    synthetic events, `rooms.reconciled` on the server and the rollups of each closure in its end buckets;
  - it starts a new server on each of those machines at the restart;
  - it draws a new world from (seed, restart instant).
  Nothing is dated in the gap.
- **`frozen` restart.** The `frozen` mode only runs the keep-alive, whatever wrote the data.
- **Consequences of switching modes**, which follow from those two rules:
  - a `live` restart after a `frozen` run closes the rooms that the frozen run kept in progress, at its last heartbeat,
    so those rooms last as long as the frozen run did;
  - a `frozen` restart after a `live` run freezes the data as it was, with no outage: rooms stay in progress, a draining
    node stays draining.

### 8. Demo wiring

- `demo-lib.sh` gets `demo_data_mode`, which reads `DASHBOARD_DEMO_DATA` (default `frozen`) and fails on any other
  value. `prepare_data` calls it first, before Docker.
- `frozen`: `generate` (unless kept), then `keep-alive`, as today.
- `live`: `generate --live` with the same options, or `live` with those options when the data is kept.
- `GENERATOR_ARGS` and `STATS_MODE` go to both. The PRO demo needs no change.
- The variable is documented in the header of `demo-lib.sh`, the comment of `demo.sh`, the `demo` line of
  `./dashboard.sh help`, the CE `AGENTS.md` Commands section, the CE `README.md` command block and the generator README.

### 9. Increments, never rewrites

Entities change through `$set` of the fields that changed, and rollups through `$inc` and `$max`. An entity whose end a
tick wrote is never written again; an egress or ingress session that outlives its room stays in the live set until its
own end. A Settings deletion therefore meets what it meets on a deployment:

- the rooms in progress and the last 5 minutes are kept, and the live writer goes on updating them;
- what was deleted is never written again;
- a deleted current bucket starts again from the next increments.

### 10. Determinism and testing

- `generate()` takes an optional `now`, so a test fixes the generation instant.
- `LiveWriter.tick(at)` takes explicit instants. The state at an instant depends only on the world, so tests may tick
  every 60 s to simulate a day, and the cadence scenario compares 10 s and 60 s ticks.
- Tests use scenario S over 1 or 2 days, to keep the integration suite's time.

### 11. Retention and growth

- The live writer sets `expiresAt` as the writer does, and the TTL monitor removes expired documents.
- Storage levels off:
  - stats, events, tracks and 5-minute rollups stay within 7 days;
  - entities grow for 60 more days, up to their 90-day retention;
  - hourly rollups add 24 small documents a day.
- A simulated live day is measured in both stats modes (documents per collection, and storage size from `dbStats`).
  The measurement goes in the generator README.

### Performance budget

A tick cuts at most about 30 rooms (the floor, plus rooms ending and egresses outliving their rooms) and writes a few
hundred documents. The target is under 1 s per tick at scenario S, measured and logged by the 24-hour test with no
wall-clock assertion. The demo writes no index of its own, and its queries (peaks, unique identities, restart reads)
use the contract indexes on `status` and the time fields.

### Test strategy

| Scenario | Test file | Level |
| --- | --- | --- |
| Demo data mode selection, Unknown demo data mode | `test/demo-data-mode.test.mjs` | tooling (`node --test`) |
| Frozen keep-alive writes nothing new, Frozen restart on kept live data | `dashboard-ce/backend/test/integration/data-generator-live.test.ts` | integration |
| Live room lifecycle, Rooms in progress at generation end, Nothing written ahead of time | same file | integration |
| Live room floor, Live daily curve, Live egress and ingress shares | same file (24 h at 60 s ticks) | integration |
| Live stats per mode, No live stats while muted or after leaving | same file | integration |
| Live rollups match the entities, Live active peaks, Live unique identities at day close | same file | integration |
| Live connecting participants, Live egress and ingress transitions, Live stale room | same file | integration |
| Live rolling restart, Live lost server, Live single node restart, Live servers of the generation instant | same file | integration |
| Live restart after a stop | same file | integration |
| Live writing after a deletion | same file | integration |
| Same live data at any tick cadence | same file | integration |

The existing `data-generator.test.ts` keeps covering the generation and its keep-alive scenarios. Its tests that read
the rooms open at the end (joining sessions, egress and ingress statuses) must keep passing with the lives of
decision 1.

## Risks / Trade-offs

- [The refactor of `model.ts` around complete lives breaks generator scenarios] → `data-generator.test.ts` and the
  query-plan suites run unchanged against the new model before any live code lands (tasks group 1).
- [Rooms open at the end take other values, which the CE and PRO query-plan suites generate] → they check plans and
  bounds, not values. CE `test-integration` runs in this change, and PRO `test-integration` runs at the `ce.ref` move.
- [Increments diverge from the cut when a tick fails halfway] → the demo stops on a write error instead of retrying, as
  the generation does. The restart on kept data then closes what was open.
- [The 24-hour scenarios make the integration suite slower] → 60 s ticks over scenario S at 1 day. Measured; if they
  pass 2 minutes, they move to a suite of their own.
- [The track mode writes more stats per day than the history holds] → measured and recorded (decision 11). The demo
  container keeps its data in its own file system and is removed by `docker rm`.

## Migration Plan

Nothing to migrate. `frozen` stays the default, so `./dashboard.sh demo` behaves as before unless
`DASHBOARD_DEMO_DATA=live` is set. Rollback is the revert of the commits.
