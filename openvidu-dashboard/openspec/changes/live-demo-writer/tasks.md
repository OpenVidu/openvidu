# Tasks

## 1. Complete room lives cut at an instant (implementer)

- [x] 1.1 In `dashboard-ce/tools/data-generator/src/model.ts`, draw each room's whole life (design decision 1): no
  `now`-dependent draw inside a life. A room planned active gets a natural end 10 to 30 minutes after the generation
  instant (task 1.4), earlier at its server's stop or loss, and keeps today's transient states at that instant (15 %
  with a participant connecting for the last minute, egresses `starting`, `ending` or stopped, the buffering ingress).
  Move the room's derived fields (counters, peaks, topology, features, id arrays, `lastEventAt`, bytes, quality,
  `lastStatsAt`) into a function of the sessions. Verify with `./dashboard.sh check`.
- [x] 1.2 Add the pure function `cutRoom(life, t)` (design decision 1), with `RoomMedia` at `t` for the samples, and make
  `generate()` write `cutRoom(life, now)`. Take an optional `now` in `GenerateOptions`. Give events `_id` values hashed
  from (type, entity id, instant, layer) (decision 2). Verify that `./dashboard.sh test-integration` passes with
  `data-generator.test.ts` and every CE query-plan suite unchanged, the tests of joining sessions, egress and ingress
  statuses in active rooms included.
- [x] 1.3 Unit tests of `cutRoom` in `dashboard-ce/backend/test/unit/`: a closed room cut after its end equals its life;
  cut inside it, open sessions, tracks, egresses and ingress sessions take their state at the instant, with mutes,
  resumes, bytes and `lastStatsAt` up to it, and nothing after it. Verify with `./dashboard.sh check`.
- [x] 1.4 Shorten the stretch of a room in progress at the generation instant, as the owner decided (design decision 1).
  Draw it with `rng.int(10 * MINUTE, 30 * MINUTE)` instead of `rng.int(10 * MINUTE, 5 * HOUR)`, keeping the number of
  draws. It stretches only the last identity's last session; every other session keeps its drawn length. Change the
  code and comments at `dashboard-ce/tools/data-generator/src/model.ts:504` (doc comment) and `:531-532` (comment and
  draw), and line 218 of `dashboard-ce/tools/data-generator/README.md`. Cover "Generated rooms in progress stretched 30
  minutes at most" in `dashboard-ce/backend/test/integration/data-generator-live.test.ts`, ticking until T + 100
  minutes and reading each session's drawn length from the generated world:
  - every STANDARD session that joined before T left by the later of T + 30 minutes and the end of its drawn length;
  - each room closed by its departure timeout after the later of T and the last leave of its non-EGRESS sessions.

  Verify with `./dashboard.sh check`, `./dashboard.sh test-integration`, `./dashboard.sh test-live` and
  `./dashboard.sh scenarios live-demo-writer`.

## 2. Live writer: rooms, stats, rollups and short-lived states (implementer)

- [x] 2.1 Add `src/live.ts` with `LiveWriter` and `tick(at)` (design decisions 3 and 9). Per room in the live set: insert
  the events and `track_stats` dated since the previous tick, `$set` the changed entity fields (upsert new entities),
  `$inc` the rollup differences per bucket and scope, and never write an entity again after the tick that wrote its end.
  Write peaks every minute with `$max`, and `uniqueIdentities` after 00:05 UTC. Add `--live` to `generate` (generation,
  then 10 s ticks until `SIGINT` or `SIGTERM`). Cover "Live room lifecycle", "Rooms in progress at generation end",
  "Nothing written ahead of time", "Live stats per mode", "No live stats while muted or after leaving", "Live rollups
  match the entities", "Live active peaks", "Live unique identities at day close", "Live writing after a deletion" and
  "Same live data at any tick cadence" in `dashboard-ce/backend/test/integration/data-generator-live.test.ts`, verified
  by `./dashboard.sh test-live`.
- [x] 2.2 Add the live planner (decision 4): arrivals per UTC hour from (seed, world start, hour) on the daily curve,
  the floor of 10 rooms in progress with its 10-minute exceptions, room names after the highest stored one, and the
  live egress and ingress shares (0.5 and 0.1, with the generation keeping 0.3 and 0.02). Cover "Live room floor",
  "Live daily curve" and "Live egress and ingress shares" (24 hours at 60 s ticks) in `data-generator-live.test.ts`,
  and log the time per tick. Verify with `./dashboard.sh test-live`.
- [x] 2.3 Add the short-lived states and the reconciler timing of decision 5 to the lives of live rooms: slow
  connections, egress `starting` and `ending`, ingress buffering, one stale room per UTC hour, and every reconciler
  closure written 3 to 4 minutes after its last signal. Cover "Live connecting participants", "Live egress and ingress
  transitions" and "Live stale room" in `data-generator-live.test.ts`. Verify with `./dashboard.sh test-live`.

## 3. Rolling server operations (implementer)

- [x] 3.1 Extend the server timeline with the schedule of design decision 6: even-hour drains and returns in turn
  among the reporting machines, the 15:00 UTC loss with its return 6 hours later, the servers of the generation instant
  (`-3`, `-4`, `-5`, `-7`), and the single node's 04:00 UTC restart. Make `LiveWriter` write `drainingAt`, `stoppedAt`,
  new `nodes` documents and heartbeats from it, with rooms hosted and ended by the existing rules. Cover "Live rolling
  restart", "Live lost server", "Live single node restart" and "Live servers of the generation instant" in
  `data-generator-live.test.ts`. Verify with `./dashboard.sh test-live`.

## 4. Restart on kept data, demo modes and documentation (implementer)

- [x] 4.1 Add the `live` script (`src/live-cli.ts`, `pnpm live`) for the restart on kept data (design decision 7). It
  closes the open entities as the reconciler does at their last signal with `node-dead`, leaves the alive servers lost,
  starts a new server per machine, draws the world from the restart instant and ticks. Cover "Live restart after a stop"
  (both the `live` and the `frozen` previous run) in `data-generator-live.test.ts`. Verify with
  `./dashboard.sh test-live`.
- [x] 4.2 Add `demo_data_mode` to `dashboard-ce/tools/demo-lib.sh` (decision 8). It reads `DASHBOARD_DEMO_DATA`,
  default `frozen`, and fails on other values before Docker. `prepare_data` runs `generate` and `keep-alive` in
  `frozen`; in `live` it runs `generate --live`, or `live` with kept data, passing `STATS_MODE` and `GENERATOR_ARGS` in
  every mode. Cover "Demo data mode selection" and "Unknown demo data mode" in `test/demo-data-mode.test.mjs`. Cover
  "Frozen keep-alive writes nothing new" and "Frozen restart on kept live data" in `data-generator-live.test.ts`.
  Verify with `./dashboard.sh check` and `./dashboard.sh test-live`.
- [x] 4.3 Document `DASHBOARD_DEMO_DATA` and the live writer:
  - the header of `demo-lib.sh` and the comment of `demo.sh`;
  - the `demo` line of `./dashboard.sh help`;
  - the CE `AGENTS.md` Commands section, next to `DASHBOARD_DEMO_KEEP_DATA`;
  - the CE `README.md` command block;
  - `dashboard-ce/tools/data-generator/README.md`: the options `--live` and `now`, the `live` script, the complete
    lives, the live behaviour and server operations, the restart on kept data, the frozen and live modes, and the
    measured documents and storage of a simulated live day in both stats modes (decision 11).

  Verify by reading that each matches the specs of this change. No CHANGELOG line: this is tooling.
- [x] 4.4 Run `./dashboard.sh check`, `./dashboard.sh test-integration`, `./dashboard.sh test-live` and
  `./dashboard.sh scenarios live-demo-writer`. Every scenario of the change has a passing test. The live scenarios run
  in their own vitest project `integration-live` (`./dashboard.sh test-live`), outside `test-integration` and CI; the
  root `AGENTS.md` Definition of Done, the implementer and verifier agent definitions and the verifier guard name it
  for data generator changes.
- [x] 4.5 Run `./dashboard.sh demo ce` with `DASHBOARD_DEMO_DATA=live` for 15 minutes. Check that rooms end and start,
  charts move and nothing fails in the log. Check that the default `frozen` run behaves as before.
- [x] 4.6 Review for refactors:
  - `cutRoom` is the only source of entity state at an instant;
  - `generate()` and `LiveWriter` share the planner, the server timeline and the derivations;
  - `keepLive()` is untouched apart from its callers.

  Apply small fixes or record the rest in the verification report.

## 5. Review on the CE demo (owner)

- [x] 5.1 Run `DASHBOARD_DEMO_DATA=live ./dashboard.sh demo ce`, ideally for a few hours, and the default `frozen` demo.
  Accept them or send findings.

## 6. CE push (orchestrator)

- [x] 6.1 Push to `master` of `OpenVidu/openvidu` and wait for its CI run (`checks`, `unit`, `integration`, `contract`,
  `e2e`) to be green.

## 7. PRO follow-up (orchestrator)

- [ ] 7.1 In `/home/sergio/Escritorio/openvidu/openvidu-pro/openvidu-dashboard`:
  - set `ce.ref` to the pushed CE commit and run `./dashboard.sh ce-checkout` and `pnpm install`;
  - add the `DASHBOARD_DEMO_DATA=live` line next to `DASHBOARD_DEMO_DEPLOYMENT` in the PRO `README.md` command block;
  - add `DASHBOARD_DEMO_DATA` (`frozen` or `live`) to the demo description of the PRO `AGENTS.md` and of
    `dashboard-pro/AGENTS.md`;
  - run `./dashboard.sh check`, `./dashboard.sh test-integration` (the PRO query-plan suites generate the changed
    data) and `./dashboard.sh e2e`.
- [ ] 7.2 The owner reviews `DASHBOARD_DEMO_DATA=live ./dashboard.sh demo pro|both`, with `DASHBOARD_DEMO_DEPLOYMENT`
  `single`, `elastic` and `ha`. Then push to `master` of `openvidu-pro` and wait for its CI to be green.
