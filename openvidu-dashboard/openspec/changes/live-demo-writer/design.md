# Design

## Context

See proposal.md for the motivation. Before this change the data generator (`dashboard-ce/tools/data-generator`) wrote a
deterministic scenario over a range ending at the generation instant:

- `planRooms()` and `hostRooms()` (`generator.ts`) plan the rooms and their servers on a server timeline whose instants
  are relative to the middle (M), three quarters (Q) and end (E) of the range.
- `generateRoom()` (`model.ts`) draws each room from shared streams, in creation order.
- `applyStats()`, `deriveEvents()`, `deriveStats()` and `Rollups` (`samples.ts`, `derive.ts`) build stats, events and
  rollups from the documents of a room.
- The keep-alive (`keep-alive.ts`, `keepLive()`) moved `lastSeenAt` and `lastStatsAt` every 15 s.

An active room was drawn "as of now": `plan.active` forced its last participant to stay past now and fixed its
transient states, some draws depended on `now`, and event ids came from one stream shared by every room.

The live writer imitates the writer behaviour of `server-analytics-writer` (10 s batches, 30 s stats, increments,
heartbeats), `server-aggregator` (peaks every 60 s, unique identities after 00:05 UTC) and `server-reconciler`
(candidates after 90 s without stats, runs every 60 s, closures dated at the last signal).

## Goals / Non-Goals

**Goals:**

- One world per seed, generator options and start instant: complete room lives drawn once, then written at any
  instant.
- In `live` mode, writes that look like the writer's: the same documents, within 10 s of their instant, as updates and
  increments.
- Data in `frozen` mode as close to the earlier data as the model allows.

**Non-Goals:**

- Writing live into a database that a real writer also writes.
- Simulating writer failures (retries, queue overflows), the legacy migration or schema upgrades.
- Changing the shares of the generation (egress 30 % of rooms, ingress 2 %, agents 5 %, SIP 1 %): only the rooms the
  live writer creates take other egress and ingress shares (decision 4).

## Decisions

### 1. Complete lives, cut at an instant

`generateRoom()` draws each room's whole life as if nothing were open: every session's join, connection, mutes,
resumes and leave, every publication, subscription, egress status history and ingress session, and the room's end.
`roomLife()` (`src/cut.ts`) wraps a life with its engine and stats mode, and the pure function `cutRoom(life, t)` gives
the `RoomBundle` at `t`:

- entities that start after `t` are dropped;
- entities open at `t` get their open state back: end fields, `closedBy`, `disconnectReason`, `expiresAt` and final
  stats return to `null`, and the status comes from the history at `t`;
- `muteChanges` and `resumedAt` keep the entries up to `t`;
- bytes, quality and `lastStatsAt` of open entities come from the samples up to `t`. Closed tracks and subscriptions
  keep the final stats of their life, which their samples already summed;
- the room's derived fields come from the cut sessions, through one derivation function shared with `generateRoom()`.

`deriveEvents()`, `deriveStats()` and `Rollups.add()` take the cut bundle unchanged. Track info in `TRACK_PUBLISHED` and
`TRACK_SUBSCRIBED` carries the state at publication, not at the cut.

Rules the model now follows:

- `peakPublishers` counts a session from its first track published unmuted. `features.agent` and `features.sip` come
  from the sessions present.
- An EGRESS participant joins at `max(request + 1 s, active − 5 s)`.
- Ingress sessions carry a model-only `publishedAt` that is never stored. `INGRESS_STARTED` is dated at it: 500 ms after
  `startedAt`, except for the backup. The rollups count an ingress session at `startedAt`.
- A closed ingress session that never left `buffering` keeps that status when the rollups count it. It counts as ended,
  not as started, and gets no `INGRESS_STARTED`.

**Rooms planned active at the generation instant.** Their natural end is 10 minutes to 5 hours after the instant,
earlier at a server stop or loss. They end with `IDLE_TIMEOUT`, a departure timeout after the later of their last
participant's leave and the drawn end; when that last participant aborted, a departure timeout after the instant.
Their lives keep the earlier snapshot shares at the instant: 15 % with a participant connecting for the last minute,
egresses `starting`, `ending` or stopped, the buffering ingress. A track still published and muted at the instant may
have one `TRACK_MUTED` more than `TRACK_UNMUTED` (owner decision O1).

The generation writes `cutRoom(life, now)`. A room that ended before `now` cuts to its full life.

- Rejected: a separate simulator that mutates the stored documents. It would be a second source of truth for the
  writer semantics the generator already models.
- Rejected: drawing a room again at each tick with `now = t`. Its identities and figures would change from tick to
  tick.

### 2. Random streams and ids

- The generation keeps its shared streams in creation order. Only the rooms from the first room open at the end onward
  take other values.
- Rooms created by the live writer draw from streams keyed by (seed, world start, room number) through `KeyedRng`
  (`random.ts`). Room numbers follow planning order: an hour's arrivals, then the floor rooms minute by minute.
- The ids of live rooms and their entities come from `hashId()`: SHA-256 of the key and an ordinal. The streams stay
  FNV-seeded, so every other draw is unchanged.
- Rejected: seeding the streams from SHA-256 as well. It moved the day's statistics out of their bands.
- Event `_id` values are a SHA-256 hash (`hashId()` in `random.ts`) of (type, entity id, instant, layer).
  `hashRng()`'s 32-bit state would collide. The layer is the event's position among the entity's resumes or mute
  toggles. Every event `_id` of a seed changes; no test or reader depends on them.
- The package also exports `./cut`, `./model`, `./random` and `./restart`.

### 3. The live writer

`LiveWriter` (`src/live.ts`) holds the world: the server schedule (decision 6), the rooms planned within one hour ahead,
and the lives of the rooms that overlap the last tick. `generate()` returns that world, so `generate --live` goes on in
the same process. `tick(t)`:

1. Plans rooms up to `t + 1 h` (decision 4). Drops the rooms whose end, and the end of every entity they hold, was
   written by an earlier tick.
2. For each room in the live set, cuts its life at the previous tick and at `t`, and diffs the two:
   - inserts the events and `track_stats` dated in `(previous, t]`;
   - `$set`s the changed entity fields and upserts the new entities;
   - `$inc`s the rollups by the difference of the two cuts per bucket and scope (`liveRollupIncrement()`). The hour
     that contains the generation instant continues the document the generation wrote. An ingress session counted at
     `startedAt` is incremented when it publishes, in its start bucket.
3. At the first tick of each minute, writes the active peaks with `$max`, counted from the database as the aggregator
   counts them.
4. At the first tick after 00:05 UTC, writes the closed day's `uniqueIdentities`, aggregated from `participants`.
5. Writes the heartbeats of the servers alive at `t`, at each server's interval, and the `drainingAt`, `stoppedAt` and
   new `nodes` documents due by `t`. `nodeUpdates()` skips the servers whose end it has already written, and drops
   them.

Every document goes through `toStored()` against collections with the contract validators (`validationAction: error`).
`generate --live` and the `live` script share their options and their 10 s loop in `src/cli.ts`, and stop after the
current tick on `SIGINT` or `SIGTERM`.

### 4. Live planner, room floor and shares

- Arrivals follow the scenario's pace and `HOUR_WEIGHTS`, drawn per UTC hour from (seed, world start, hour).
- In each minute of the horizon with fewer than 10 rooms in progress, rooms are created in that minute on the servers
  that take rooms, up to 10.
- The floor is waived:
  - for 10 minutes after a live start on kept data;
  - in Single Node, from the 04:00 UTC drain until 10 minutes after the new server starts at 04:03, the floor rising
    linearly over those 10 minutes.
- Room names continue after the highest stored `room-NNNNNN`.
- Live rooms draw an egress with probability 0.5 and an ingress with 0.1, through a share parameter of the room draw
  (default 0.3 and 0.02, which the generation keeps).
- Live ingresses (main and standby) are created with their room, never ahead of it.
- A live egress requested less than 2 minutes before its room ends never starts. Failed and aborted egresses end at
  least 5 s after recording, so every live egress spends 20 to 60 s `starting` and 20 to 60 s `ending`.

### 5. Short-lived states and reconciler timing

- **Slow connections (owner decision O2).** Half of the live STANDARD sessions take 60 to 179 s to connect, and a third
  of those abort. They are existing sessions converted, not extra joiners. About one room in eleven in progress holds a
  connecting session, and someone is connecting somewhere in about two minutes of three.
- **Ingress sessions.** They buffer 60 to 120 s before they publish.
- **Stale room each hour.** The first arrival of each UTC hour, created in its first 15 minutes, stops reporting 5 to 25
  minutes after its creation.
- **Reconciler timing.** Every live reconciler closure is written 3 to 4 minutes after the last signal it is dated at.
  The delay is hashed from the room id. This covers the stale rooms, the 3 % reconciled share, a lost server's rooms,
  and the `node-dead` closures of rooms in progress at the generation instant; closures inside the history keep their
  timing. Until that write the cut shows the room `active` with its old `lastStatsAt`; the view of a pending closure
  cuts at the last signal itself. The stale flag (90 s window) shows for about 2 minutes. The synthetic events,
  counters and rollups of the closure go to the buckets of its end time.

### 6. Server operations

`ServerSchedule` (`src/operations.ts`) extends the server timeline from the world start. It takes the last heartbeat,
which for a generation is its start. The generation decides operations 12 hours ahead (`SCHEDULE_AHEAD`). The schedule
reuses the hosting and room-end rules (`SERVER_SHUTDOWN` at a stop, `node-dead` at a loss).

- **Elastic and HA.** At each even UTC hour, the next machine in the order `-1` … `-6` that is reporting and in no other
  operation drains. It stops 20 minutes later and has a new server 10 minutes after that. At 15:00 UTC the reporting
  machine after the last one drained is lost, and it has a new server 6 hours later.
- **Servers at the generation instant.** `-3`, draining, stops 20 minutes after the start and returns 10 minutes later.
  `-4` returns 6 hours after its loss. `-5`, stopped, returns at its turn with a new server 30 minutes after that even
  hour; no other machine drains in that hour. `-7` stays silent.
- **Single node.** It drains at 04:00 UTC, stops at 04:02, and a new server starts at 04:03.
- **New servers.** They run `3.10.1` with the engine and heartbeat interval of the machine's previous server, and
  `mediaStats: true`.

This took about 10 to 15 % of the change, as estimated, with no new mechanism.

### 7. Restart on kept data

- **`live` restart.** `restartLive()` (`src/restart.ts`, `pnpm live`, `src/live-cli.ts`) works from the stored
  documents, since the data may come from a `frozen` run. It reads three things:
  - the last heartbeat: the freshest `lastSeenAt` of any server, running or not. A single-node history with an old lost
    server therefore never takes that server's days-old `lastSeenAt`. The restart throws only when the database has no
    server.
  - the open entities;
  - the alive servers: unstopped, within a minute of that heartbeat.

  The restart instant is `max(requested restart, the minute after the last heartbeat)`. When the restart falls in the
  heartbeat's minute, the new servers' `firstSeenAt` can be up to 60 s ahead of the wall clock; the ticks still wait
  for the wall clock. Then:
  - it closes every open room, session, track, subscription, egress and ingress session as the reconciler does after a
    `node-dead` confirmation, at the last signal: never after the heartbeat, never before the entity's own start;
  - the synthetic events come from the builders that `derive.ts` exports (`syntheticEventId`, the reconciled ended and
    closed events, `RECONCILED`, `NODE_DEAD`), with the entity field closures written separately, `rooms.reconciled` on
    the server and the rollups of each closure in its end buckets;
  - it starts a new server on each of those machines at the restart. A single node caught stopped in its daily restart
    at the start of the timeline also gets a new server at the restart;
  - the schedule takes the last heartbeat. A machine lost in the 6 hours before it returns at
    `max(loss + 6 h, restart)`, and one lost earlier stays silent. `restartLive()` writes the `nodes` document of every
    server that starts at the restart, the ones the timeline returns then included;
  - it draws a new world from (seed, restart instant) and ticks.

  Nothing is dated in the gap.
- **Restart queries.** The highest stored room name comes from the `nameLower` index (prefix regex, reverse sort). Open
  ingress sessions are read by `status` in `buffering` or `publishing`, both here and in the peaks. Subscriptions are
  read by the `trackSid` of the room's tracks (index `trackSid_subscribedAt`).
- **`frozen` restart.** It runs the keep-alive, whatever wrote the data.
- **Switching modes.** A `live` restart after a `frozen` run closes the rooms the frozen run kept in progress at its
  last heartbeat, which the owner confirmed. A `frozen` restart after a `live` run freezes the data as it was.

### 8. Demo wiring

- `demo-lib.sh` defines `demo_data_mode`, which reads `DASHBOARD_DEMO_DATA` (default `frozen`) and fails on other
  values. It runs when the library is sourced, so an unknown value stops the demo before the port check and Docker, and
  again in `prepare_data`.
- `frozen`: `generate` (unless kept), then `keep-alive`.
- `live`: `generate --live` runs in the background, and `prepare_data` waits for its "Writing live" line. With kept
  data, `live` runs instead.
- `run_live_writer` in `demo-lib.sh` starts the live writer in both cases (`generate --live`, and `live` on kept data).
  When the writer exits with a code from 1 to 127, it prints the last 20 lines of the writer's log and sends `TERM` to
  the demo. Codes of 128 and up come from signals and are ignored.
- `dev-lib.sh` `start_frontend` runs the development server in the background, in `PIDS`, so the cleanup stops it too.
- `GENERATOR_ARGS` and `STATS_MODE` go to every mode; the PRO demo needs no change.
- Documented in `demo-lib.sh`, `demo.sh`, `./dashboard.sh help`, the CE `AGENTS.md`, the CE `README.md` and the
  generator README.

### 9. Increments, never rewrites

Entities change through `$set` of the fields that changed, and rollups through `$inc` and `$max`. An entity whose end a
tick wrote is never written again; an egress or ingress session that outlives its room stays in the live set until its
own end. A Settings deletion keeps the rooms in progress, the last 5 minutes, and the current and previous rollup
buckets, and the live writer goes on updating those. What was deleted is never written again. A bucket removed by other
means starts again from the next increments.

### 10. Determinism and testing

- `generate()` takes an optional `now`. `LiveWriter.tick(at)` takes explicit instants. The state at an instant depends
  only on the world, so tests tick every 60 s to simulate a day, and the cadence scenario compares 10 s and 60 s ticks.
- **Separate suite (owner decision O3).** The live scenarios live in
  `dashboard-ce/backend/test/integration/data-generator-live.test.ts`, run by the vitest project `integration-live`
  through `./dashboard.sh test-live`. They are outside `test-integration` and outside CI: no workflow or `ci` spec
  change.
  - The root `AGENTS.md` Definition of Done says "Data generator changes: `test-live` passes too".
  - The implementer and verifier agent definitions run `test-live` when the data generator changes, and the verifier
    guard allows it.

### 11. Retention, growth and measurements

The live writer sets `expiresAt` as the writer does, and the TTL monitor removes expired documents. Measured per live
day with the CE options, after one generated day, at 60 s ticks (recorded in the generator README):

| Stats mode | `track_stats` | `events` | `rooms` | Storage of both days |
| --- | --- | --- | --- | --- |
| participant | 110 242 | 77 978 | 535 | 15 MiB |
| track | 328 296 | 77 978 | 535 | 27 MiB |

The stats, events, tracks and 5-minute rollups stay within their 7 days, so a demo left running for weeks stays in the
low hundreds of MiB.

### Performance budget

The median tick takes 63 to 73 ms at scenario S, with one 2.4 s spike seen once, against a target of 1 s. The 24-hour
test logs it without a wall-clock assertion. The live writer adds no index. Its queries use the contract indexes:
- peaks and unique identities: `status` and the time fields;
- restart: `nameLower` for the highest room name and `trackSid_subscribedAt` for subscriptions.

### Test strategy

| Scenario | Test file | Level |
| --- | --- | --- |
| Demo data mode selection, Unknown demo data mode | `test/demo-data-mode.test.mjs` | tooling (`node --test`) |
| Every other scenario of the change | `dashboard-ce/backend/test/integration/data-generator-live.test.ts` | integration (`integration-live`, `test-live`) |

`data-generator.test.ts` (in `test-integration`) keeps covering the generation and its keep-alive scenarios, and the
unit tests of `cutRoom` cover the cut. "Live rolling restart" keeps its 02:00 checks. It also checks the drain rule at
every rotation turn of the day that stops inside the run, with at least one room open at a stop: no room is created
after the drain, and the rooms open at the stop end then with `SERVER_SHUTDOWN`.

## Risks / Trade-offs

- [The refactor of `model.ts` breaks generator scenarios] → group 1 kept `data-generator.test.ts` and the query-plan
  suites passing before the live code landed.
- [Rooms open at the end take other values in the CE and PRO query-plan suites] → those suites check plans and bounds;
  CE `test-integration` passes, and PRO `test-integration` runs at the `ce.ref` move.
- [Increments diverge from the cut when a tick fails halfway] → the writer exits on a write error. `run_live_writer`
  shows the last lines of its log and stops the demo. The restart on kept data then closes what was open.
- [The live suite is not in CI, so a regression is caught only when it runs] → the Definition of Done, the implementer
  and the verifier run `test-live` on every data generator change.

## Migration Plan

Nothing to migrate. `frozen` stays the default. Rollback is the revert of the commits.
