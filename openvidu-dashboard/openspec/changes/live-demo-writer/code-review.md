# Code review: live-demo-writer

- Date: 2026-11-25
- Reviewed commit: `3a5bc0670e3915f6455e847d227fd440973d2108` (`git diff origin/master...HEAD`, 22 commits, clean tree)
- Scope: data generator (`model.ts`, `cut.ts`, `live.ts`, `operations.ts`, `restart.ts`, `cli.ts`, `live-cli.ts`,
  `generate.ts`, `generator.ts`, `derive.ts`, `random.ts`, `contract.ts`, `samples.ts`, `schema.ts`), demo shell
  (`demo-lib.sh`, `demo.sh`, `dashboard.sh`), the test suites and their wiring (`data-generator-live.test.ts`,
  `data-generator-cut.test.ts`, `demo-data-mode.test.mjs`, `vitest.config.ts`) and the agent workflow edits (verifier
  guard, agent definitions, `AGENTS.md`). The suites were not run (left to `spec-verifier`).

Summary: 1 CRITICAL, 3 WARNING, 5 SUGGESTION.

Checked and found sound: the cut (`cutRoom`, `reportedUntil`, the pending-closure view), the tick diff (events
deduplicated by hashed id, `$set`/`$unset` diffs, first-write-only upserts, `$inc` of per-room counter deltas, `$max`
peaks, ordered `nodes` bulk with server documents before `rooms.hosted`), pruning of finished lives (`t > life.end`),
the egress, ingress and session ends never outliving the room (so skipping closed rooms is safe), the planner
determinism across tick cadences (pruned rooms cannot be in progress in the minutes being planned), the 12-hour
schedule lead against the longest room life, `writeLive` catching up on missed ticks, `demo_data_mode` running at
source time, and the guard and agent-definition edits.

## CRITICAL

### C1. After a live restart, a media node lost before the stop never comes back

`dashboard-ce/tools/data-generator/src/restart.ts:51`, `:83` and `dashboard-ce/tools/data-generator/src/operations.ts:62`

- Trigger: a `--media-nodes` live demo (PRO Elastic/HA) stopped between 15:00 and 21:00 UTC. The 15:00 rotation has
  lost a machine, and its new server, due at 21:00, was never written. The demo starts again next morning with
  `DASHBOARD_DEMO_DATA=live DASHBOARD_DEMO_KEEP_DATA=true`. Stopping the demo at the end of the day (16:00 to 21:00
  UTC) hits this case every time.
- What happens: `restartLive()` treats as alive only the servers within 60 s of the heartbeat (`restart.ts:51`), so
  the lost machine gets no new server. `toServer()` gives its old server `end: { at: 15:00, stopped: false }`. Then
  `new ServerSchedule(servers, at, …)` (`restart.ts:83`) applies the generation rule "a machine lost in the last 6
  hours returns 6 hours after its loss, one lost longer ago stays silent" (`operations.ts:62`) against the restart
  instant, not the heartbeat. With `at − 15:00 > 6 h` nothing is spawned, and `free()` is false for that machine
  forever, so neither `rotate()` nor `lose()` will ever pick it again.
- Consequence: the machine joins `-7` as permanently retired, which breaks "at 15:00 UTC one SHALL be lost … and
  return 6 hours later". The next day's 15:00 loss followed by an end-of-day stop retires another one. After about six
  such days no rotating machine is left, `takesRooms()` finds no host, `addRoom()` returns `undefined`, and the live
  writer creates no rooms, which also breaks the room floor.
- No test covers it: "Live restart after a stop" puts the heartbeat at 12:00 UTC (T + 2 h), outside the loss window.
- Fix: measure the 6-hour return from the heartbeat for the restart world, or spawn every machine lost at the
  heartbeat at `max(loss + 6 h, at)`. Add a restart scenario whose heartbeat falls between 15:00 and 21:00 UTC.

## WARNING

### W1. A live writer that fails is silent, and its error is deleted

`dashboard-ce/tools/demo-lib.sh:65`, `dashboard-ce/tools/dev-lib.sh:30`

- Trigger: any failing tick of `generate --live`. Examples: a validator rejection, a MongoDB restart, a duplicate key
  in `insertMany`.
- What happens: all output of the background `generate --live`, including the error printed by `main().catch`, goes
  only to `$WORK_DIR/generate.log`. Nothing reads that log after the "Writing live" line, and `cleanup` removes
  `$WORK_DIR` on exit. The process exits with code 1, and nothing in the demo watches it.
- Consequence: the demo goes on serving data that is now frozen without even a keep-alive. After a minute every
  server shows as lost and every room as stale, and the reason is gone. design.md says the opposite under Risks ("the
  demo stops on a write error"). The kept-data path (`run live &`, line 118) prints to the terminal, so the two
  `live` paths also behave differently.
- Fix: after readiness, follow the log on the terminal (for example, a `tail -f` registered in `PIDS`), or stop the
  demo when the writer exits.

### W2. The restart instant can fall before the last heartbeat

`dashboard-ce/tools/data-generator/src/live-cli.ts:21` (`restart.ts:57-67`)

- Trigger: a kept-data `live` restart in the same wall-clock minute as the last heartbeat. With the MongoDB container
  left running, `pnpm run live` starts within seconds. Example: last heartbeat at 12:00:40 (the frozen keep-alive
  writes `new Date()`, the live writer writes multiples of the server's interval), restart at 12:00:50, so
  `at = Math.floor(Date.now() / MINUTE) * MINUTE` = 12:00:00.
- Consequence: the new servers get `firstSeenAt` 12:00:00, while the old servers of the same machines keep reporting
  until 12:00:40. The new world creates rooms from 12:00:10, before the reconciler closures that `closeOpen()` dates
  up to 12:00:40. The outage is negative, the floor waiver starts inside the old run, and each machine shows two
  overlapping servers. Nothing checks `at > heartbeat`.
- Fix: have `restartLive()` take `at = max(at, ceilToMinute(heartbeat + 1))`, or refuse an `at` that is not after the
  heartbeat.

### W3. The restart counts a buffering ingress session as started

`dashboard-ce/tools/data-generator/src/restart.ts:194-196`, `:274-282`, with `dashboard-ce/tools/data-generator/src/derive.ts:1139`

- Trigger: the demo stops while a live ingress session is buffering (1 to 2 minutes of each session, and 10 % of live
  rooms have an ingress), then restarts in `live` mode.
- What happens: `counters()` builds the "before" bundle from the stored session (`status: 'buffering'`), which
  `Rollups.add()` does not count as started. The "after" bundle has `status: 'error'`, which it counts at
  `startedAt`. `writeIncrements()` therefore adds 1 to `ingress.sessionsStarted` and to
  `ingress.byInputType.<type>`, but no `INGRESS_STARTED` event exists. The model never ends a session while it
  buffers, so this happens only on this path.
- Consequence: the hourly and daily ingress figures disagree with the events and with the rule "one still buffering
  has not started". No test covers it.

## SUGGESTION

### S1. Entity ids of live rooms come from 32-bit streams

`dashboard-ce/tools/data-generator/src/live.ts:356-368`, `dashboard-ce/tools/data-generator/src/random.ts:112`

Each live room draws from six `hashRng()` streams: FNV-1a seeds of a mulberry32 generator, all windows on one cycle of
2^32 states. Over weeks of live writing (about 535 rooms a day, 6 streams each), the chance that two windows overlap
and line up on an id draw (`PA_`, `TR_`, `EG_`, …) is no longer negligible. A duplicated id would be merged silently
by the first-write upsert (`live.ts:583`) into another room's document. This is the concern design §2 raises for
event ids. It is an estimate, not reproduced. Deriving ids with `hashId()` from (seed, start, room number, ordinal)
would remove it.

### S2. Reads that skip the contract indexes

- `restart.ts:85` sorts `rooms` by `name`, which has no index, so every restart scans the whole collection.
  `nameLower_createdAt` exists, and the names are lowercase.
- `live.ts:418-420` (every minute) and `restart.ts:127-129` filter `ingress_sessions` by
  `endedAt: { $exists: false }`, which has no index. The `status` index would serve
  `status: { $in: ['buffering', 'publishing'] }`.

design.md ("Performance budget") says these queries use the contract indexes.

### S3. Every server ever seen is re-diffed on each tick

`dashboard-ce/tools/data-generator/src/live.ts:505-533`

`nodeUpdates()` rebuilds `nodeState()`, runs `toStored()` and EJSON-compares every server ever seen, on every tick. The
list grows by about 12 servers a day, plus the servers of each restart. Servers whose end was already written can be
skipped.

### S4. A single node stopped mid-restart blocks the live restart

`dashboard-ce/tools/data-generator/src/restart.ts:44-49`

A single node stopped between 04:02 and 04:03 UTC has only a stopped server in `nodes`. `heartbeat` is then
`-Infinity`, and `restartLive()` throws "The database has no running server; generate it first" on a valid demo
database. The newest stopped server could serve as the heartbeat.

### S5. A harmless race in the readiness wait

`dashboard-ce/tools/demo-lib.sh:69`

The first `grep -q '^Writing live' "$log"` can run before the background redirection has created the log, and then
prints "No such file or directory" on the terminal. `grep -qs` avoids it.
